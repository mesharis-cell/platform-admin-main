/**
 * Phase 5: Pricing Tier Detail API Routes
 * GET /api/pricing-tiers/:id - Get pricing tier details
 * PUT /api/pricing-tiers/:id - Update pricing tier
 * DELETE /api/pricing-tiers/:id - Delete pricing tier
 */

import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import {
	getPricingTierById,
	updatePricingTier,
	deletePricingTier,
} from "@/lib/services/pricing-tier-service";
import type { UpdatePricingTierRequest } from "@/types/pricing";

/**
 * GET /api/pricing-tiers/:id
 * Retrieve single pricing tier details
 * Auth: PMG Admin, A2 Staff (pricing_tiers:read permission)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission("pricing_tiers:read");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const tier = await getPricingTierById(id);

		if (!tier) {
			return errorResponse("Pricing tier not found", 404);
		}

		return successResponse(tier, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to get pricing tier", 500);
	}
}

/**
 * PUT /api/pricing-tiers/:id
 * Update pricing tier details
 * Auth: PMG Admin only (pricing_tiers:update permission)
 * Note: Cannot change country or city (create new tier instead)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission("pricing_tiers:update");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const body = (await request.json()) as UpdatePricingTierRequest;

		const tier = await updatePricingTier(id, body);

		return successResponse(tier, 200);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse(error.message, 404);
			}
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
		return errorResponse("Failed to update pricing tier", 500);
	}
}

/**
 * DELETE /api/pricing-tiers/:id
 * Delete pricing tier (only if not referenced by orders)
 * Auth: PMG Admin only (pricing_tiers:update permission)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission("pricing_tiers:update");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		await deletePricingTier(id);

		return successResponse(
			{ message: "Pricing tier deleted successfully" },
			200
		);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Pricing tier not found", 404);
			}
			if (error.message.includes("referenced by")) {
				return errorResponse(error.message, 400);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to delete pricing tier", 500);
	}
}
