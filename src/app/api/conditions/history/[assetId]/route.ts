/**
 * Condition History API Route (Phase 12)
 * GET /api/conditions/history/:assetId
 */

import { NextRequest } from "next/server";
import { requirePermission, successResponse, errorResponse } from "@/lib/api/auth-middleware";
import { getConditionHistory } from "@/lib/services/condition-service";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ assetId: string }> }
) {
	try {
		// Require conditions:view_history permission (A2 Staff, PMG Admin)
		const authResult = await requirePermission("conditions:view_history");
		if (authResult instanceof Response) return authResult;

		const { assetId } = await params;

		if (!assetId) {
			return errorResponse("assetId is required", 400);
		}

		// Get condition history
		const result = await getConditionHistory(assetId);

		return successResponse(result, 200);
	} catch (error) {
		console.error(
			"[GET /api/conditions/history/:assetId] Error:",
			error
		);
		const message =
			error instanceof Error
				? error.message
				: "Failed to fetch condition history";
		return errorResponse(message, 500);
	}
}
