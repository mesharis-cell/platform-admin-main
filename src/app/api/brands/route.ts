import { NextRequest } from "next/server";
import {
	requireAuth,
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import { getUserCompanyScope } from "@/lib/auth/permissions";
import { createBrand, listBrands } from "@/lib/services/brand-service";
import type { CreateBrandRequest, BrandListParams } from "@/types";

/**
 * POST /api/brands
 * Create a new brand under company
 * Auth: PMG Admin only (brands:create permission)
 */
export async function POST(request: NextRequest) {
	const authResult = await requirePermission("brands:create");
	if (authResult instanceof Response) return authResult;

	try {
		const body = (await request.json()) as CreateBrandRequest;

		// Validate required fields
		if (!body.company || !body.name) {
			return errorResponse("Company and name are required", 400);
		}

		const brand = await createBrand(body);
		return successResponse(brand, 201);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("duplicate") || error.message.includes("unique")) {
				return errorResponse(
					"Brand name already exists for this company",
					400,
				);
			}
			if (error.message.includes("not found") || error.message.includes("archived")) {
				return errorResponse(error.message, 404);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to create brand", 500);
	}
}

/**
 * GET /api/brands
 * List brands filtered by company
 * Auth: All authenticated users (filtered by company scope)
 */
export async function GET(request: NextRequest) {
	const authResult = await requireAuth();
	if (authResult instanceof Response) return authResult;
	const { user } = authResult;

	try {
		const { searchParams } = new URL(request.url);

		const params: BrandListParams = {
			company: searchParams.get("company") || undefined,
			includeDeleted: searchParams.get("includeDeleted") === "true",
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

		const result = await listBrands(params, userCompanies);
		return successResponse(result, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to list brands", 500);
	}
}
