import { NextRequest } from "next/server";
import {
	requireAuth,
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import { getUserCompanyScope } from "@/lib/auth/permissions";
import {
	createCompany,
	listCompanies,
} from "@/lib/services/company-service";
import type { CreateCompanyRequest, CompanyListParams } from "@/types";

/**
 * POST /api/companies
 * Create a new company
 * Auth: PMG Admin only (companies:create permission)
 */
export async function POST(request: NextRequest) {
	const authResult = await requirePermission("companies:create");
	if (authResult instanceof Response) return authResult;

	try {
		const body = (await request.json()) as CreateCompanyRequest;

		// Validate required fields
		if (!body.name || body.name.trim().length === 0) {
			return errorResponse("Company name is required", 400);
		}

		const company = await createCompany(body);
		return successResponse(company, 201);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("duplicate") || error.message.includes("unique")) {
				return errorResponse("Company name already exists", 400);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to create company", 500);
	}
}

/**
 * GET /api/companies
 * List all companies (not archived by default)
 * Auth: All authenticated users (filtered by company scope)
 */
export async function GET(request: NextRequest) {
	const authResult = await requireAuth();
	if (authResult instanceof Response) return authResult;
	const { user } = authResult;

	try {
		const { searchParams } = new URL(request.url);

		const params: CompanyListParams = {
			includeArchived: searchParams.get("includeArchived") === "true",
			search: searchParams.get("search") || undefined,
			limit: searchParams.get("limit")
				? parseInt(searchParams.get("limit")!)
				: 50,
			offset: searchParams.get("offset")
				? parseInt(searchParams.get("offset")!)
				: 0,
		};

		// Get user's company scope for filtering
		const userCompanies = getUserCompanyScope(user);

		const result = await listCompanies(params, userCompanies);
		return successResponse(result, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to list companies", 500);
	}
}
