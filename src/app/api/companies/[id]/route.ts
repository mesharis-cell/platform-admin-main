import { NextRequest } from "next/server";
import {
	requireAuth,
	requirePermission,
	requireCompanyAccess,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import {
	getCompanyById,
	updateCompany,
	archiveCompany,
} from "@/lib/services/company-service";
import type { UpdateCompanyRequest } from "@/types";

/**
 * GET /api/companies/:id
 * Retrieve single company details
 * Auth: All authenticated users (company-scoped users can only access their own company)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requireAuth();
	if (authResult instanceof Response) return authResult;
	const { user } = authResult;

	try {
		const { id } = await params;
		const company = await getCompanyById(id);

		if (!company) {
			return errorResponse("Company not found", 404);
		}

		// Check company access
		const accessCheck = await requireCompanyAccess(company.id);
		if (accessCheck instanceof Response) return accessCheck;

		return successResponse(company, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to get company", 500);
	}
}

/**
 * PUT /api/companies/:id
 * Update company details and PMG margin configuration
 * Auth: PMG Admin only (companies:update, companies:set_margin permissions)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("companies:update");
	if (authResult instanceof Response) return authResult;

	// Also check for set_margin permission if pmgMarginPercent is being updated
	const body = (await request.json()) as UpdateCompanyRequest;
	if (body.pmgMarginPercent !== undefined) {
		const marginPermCheck = await requirePermission("companies:set_margin");
		if (marginPermCheck instanceof Response) return marginPermCheck;
	}

	try {
		const { id } = await params;
		const company = await updateCompany(id, body);
		return successResponse(company, 200);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Company not found", 404);
			}
			if (error.message.includes("duplicate") || error.message.includes("unique")) {
				return errorResponse("Company name already exists", 400);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to update company", 500);
	}
}

/**
 * DELETE /api/companies/:id
 * Archive company (soft delete)
 * Auth: PMG Admin only (companies:archive permission)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("companies:archive");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		await archiveCompany(id);
		return successResponse(
			{ message: "Company archived successfully" },
			200,
		);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Company not found", 404);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to archive company", 500);
	}
}
