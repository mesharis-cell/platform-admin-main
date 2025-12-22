/**
 * Filter Assets by Condition API Route (Phase 12)
 * GET /api/assets/filter-by-condition
 */

import { NextRequest } from "next/server";
import { requirePermission, successResponse, errorResponse } from "@/lib/api/auth-middleware";
import { filterAssetsByCondition } from "@/lib/services/condition-service";
import type { FilterByConditionParams } from "@/types/condition";

export async function GET(request: NextRequest) {
	try {
		// Require conditions:filter_by_condition permission (A2 Staff only)
		const authResult = await requirePermission(
			"conditions:filter_by_condition"
		);
		if (authResult instanceof Response) return authResult;

		const { searchParams } = new URL(request.url);

		const condition = searchParams.get("condition");
		if (!condition) {
			return errorResponse("condition query parameter is required", 400);
		}

		if (!["GREEN", "ORANGE", "RED"].includes(condition)) {
			return errorResponse(
				"condition must be one of: GREEN, ORANGE, RED",
				400
			);
		}

		const params: FilterByConditionParams = {
			condition: condition as "GREEN" | "ORANGE" | "RED",
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

		// Filter assets by condition
		const result = await filterAssetsByCondition(params);

		return successResponse(result, 200);
	} catch (error) {
		console.error(
			"[GET /api/assets/filter-by-condition] Error:",
			error
		);
		const message =
			error instanceof Error
				? error.message
				: "Failed to filter assets by condition";
		return errorResponse(message, 500);
	}
}
