/**
 * Phase 5: Pricing Tiers API Routes
 * POST /api/pricing-tiers - Create pricing tier
 * GET /api/pricing-tiers - List pricing tiers with filters
 */

import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import {
	createPricingTier,
	listPricingTiers,
} from "@/lib/services/pricing-tier-service";
import type {
	CreatePricingTierRequest,
	PricingTierListParams,
} from "@/types/pricing";

/**
 * POST /api/pricing-tiers
 * Create new pricing tier
 * Auth: PMG Admin only (pricing_tiers:create permission)
 */
export async function POST(request: NextRequest) {
	const authResult = await requirePermission("pricing_tiers:create");
	if (authResult instanceof Response) return authResult;

	try {
		const body = (await request.json()) as CreatePricingTierRequest;

		const tier = await createPricingTier(body);

		return successResponse(tier, 201);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("overlaps")) {
				return errorResponse(error.message, 400);
			}
			if (
				error.message.includes("required") ||
				error.message.includes("must be")
			) {
				return errorResponse(error.message, 400);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to create pricing tier", 500);
	}
}

/**
 * GET /api/pricing-tiers
 * List all pricing tiers with filtering
 * Auth: PMG Admin, A2 Staff (pricing_tiers:read permission)
 */
export async function GET(request: NextRequest) {
	const authResult = await requirePermission("pricing_tiers:read");
	if (authResult instanceof Response) return authResult;

	try {
		const { searchParams } = new URL(request.url);

		const params: PricingTierListParams = {
			country: searchParams.get("country") || undefined,
			city: searchParams.get("city") || undefined,
			isActive:
				searchParams.get("isActive") !== null
					? searchParams.get("isActive") === "true"
					: undefined,
			sortBy: (searchParams.get("sortBy") as any) || "createdAt",
			sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
			page: parseInt(searchParams.get("page") || "1"),
			pageSize: parseInt(searchParams.get("pageSize") || "50"),
		};

		const { data, total } = await listPricingTiers(params);

		return successResponse(
			{
				data,
				meta: {
					total,
					page: params.page!,
					pageSize: params.pageSize!,
				},
			},
			200
		);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to list pricing tiers", 500);
	}
}
