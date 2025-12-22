/**
 * Items Needing Attention API Route (Phase 12)
 * GET /api/conditions/needing-attention
 */

import { NextRequest } from "next/server";
import { requirePermission, successResponse, errorResponse } from "@/lib/api/auth-middleware";
import { getItemsNeedingAttention } from "@/lib/services/condition-service";
import type { ItemsNeedingAttentionParams } from "@/types/condition";

export async function GET(request: NextRequest) {
	try {
		// Require conditions:view_items_needing_attention permission (A2 Staff, PMG Admin)
		const authResult = await requirePermission(
			"conditions:view_items_needing_attention"
		);
		if (authResult instanceof Response) return authResult;

		const { searchParams } = new URL(request.url);

		const params: ItemsNeedingAttentionParams = {
			condition: searchParams.get("condition") as "RED" | "ORANGE" | undefined,
			company: searchParams.get("company") || undefined,
			warehouse: searchParams.get("warehouse") || undefined,
			zone: searchParams.get("zone") || undefined,
			page: searchParams.get("page")
				? parseInt(searchParams.get("page")!)
				: 1,
			limit: searchParams.get("limit")
				? parseInt(searchParams.get("limit")!)
				: 20,
		};

		// Validate condition if provided
		if (params.condition && !["RED", "ORANGE"].includes(params.condition)) {
			return errorResponse("condition must be RED or ORANGE", 400);
		}

		// Get items needing attention
		const result = await getItemsNeedingAttention(params);

		return successResponse(result, 200);
	} catch (error) {
		console.error(
			"[GET /api/conditions/needing-attention] Error:",
			error
		);
		const message =
			error instanceof Error
				? error.message
				: "Failed to fetch items needing attention";
		return errorResponse(message, 500);
	}
}
