/**
 * Phase 5: Pricing Tier Toggle API Route
 * PATCH /api/pricing-tiers/:id/toggle - Activate/deactivate pricing tier
 */

import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import { togglePricingTier } from "@/lib/services/pricing-tier-service";
import type { TogglePricingTierRequest } from "@/types/pricing";

/**
 * PATCH /api/pricing-tiers/:id/toggle
 * Activate or deactivate pricing tier
 * Auth: PMG Admin only (pricing_tiers:activate or pricing_tiers:deactivate permission)
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const body = (await request.json()) as TogglePricingTierRequest;

		// Check appropriate permission based on action
		const permission = body.isActive
			? "pricing_tiers:activate"
			: "pricing_tiers:deactivate";

		const authResult = await requirePermission(permission);
		if (authResult instanceof Response) return authResult;

		const tier = await togglePricingTier(id, body.isActive);

		return successResponse(
			{
				id: tier.id,
				isActive: tier.isActive,
				updatedAt: tier.updatedAt,
			},
			200
		);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Pricing tier not found", 404);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to toggle pricing tier", 500);
	}
}
