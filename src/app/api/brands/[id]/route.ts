import { NextRequest } from "next/server";
import {
	requireAuth,
	requirePermission,
	requireCompanyAccess,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import {
	getBrandById,
	updateBrand,
	deleteBrand,
} from "@/lib/services/brand-service";
import type { UpdateBrandRequest } from "@/types";

/**
 * GET /api/brands/:id
 * Retrieve single brand details
 * Auth: All authenticated users (company-scoped users can only access brands from their companies)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requireAuth();
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const brand = await getBrandById(id);

		if (!brand) {
			return errorResponse("Brand not found", 404);
		}

		// Check company access
		const accessCheck = await requireCompanyAccess(brand.company);
		if (accessCheck instanceof Response) return accessCheck;

		return successResponse(brand, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to get brand", 500);
	}
}

/**
 * PUT /api/brands/:id
 * Update brand details
 * Auth: PMG Admin only (brands:update permission)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("brands:update");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const body = (await request.json()) as UpdateBrandRequest;
		const brand = await updateBrand(id, body);
		return successResponse(brand, 200);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Brand not found", 404);
			}
			if (error.message.includes("duplicate") || error.message.includes("unique")) {
				return errorResponse(
					"Brand name already exists for this company",
					400,
				);
			}
			if (error.message.includes("Company field cannot be changed")) {
				return errorResponse(
					"Company field cannot be changed",
					400,
				);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to update brand", 500);
	}
}

/**
 * DELETE /api/brands/:id
 * Delete brand (soft delete, makes assets unbranded)
 * Auth: PMG Admin only (brands:delete permission)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("brands:delete");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		await deleteBrand(id);
		return successResponse(
			{ message: "Brand deleted successfully" },
			200,
		);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Brand not found", 404);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to delete brand", 500);
	}
}
