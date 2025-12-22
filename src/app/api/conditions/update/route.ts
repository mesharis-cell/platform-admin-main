/**
 * Condition Update API Route (Phase 12)
 * POST /api/conditions/update
 */

import { NextRequest } from "next/server";
import { requirePermission, successResponse, errorResponse } from "@/lib/api/auth-middleware";
import { updateAssetCondition } from "@/lib/services/condition-service";
import type { UpdateConditionRequest } from "@/types/condition";

export async function POST(request: NextRequest) {
	try {
		// Require conditions:update permission (A2 Staff only)
		const authResult = await requirePermission("conditions:update");
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		const body = (await request.json()) as UpdateConditionRequest;

		// Validate request body
		if (!body.assetId || !body.condition) {
			return errorResponse("assetId and condition are required", 400);
		}

		// Validate condition enum
		if (!["GREEN", "ORANGE", "RED"].includes(body.condition)) {
			return errorResponse(
				"condition must be one of: GREEN, ORANGE, RED",
				400
			);
		}

		// Validate notes requirement
		if ((body.condition === "ORANGE" || body.condition === "RED") && !body.notes) {
			return errorResponse(
				"Notes are required when marking items as Orange or Red",
				400
			);
		}

		// Validate photos requirement
		if (
			body.condition === "RED" &&
			(!body.photos || body.photos.length === 0)
		) {
			return errorResponse(
				"At least one damage photo is required when marking items as Red",
				400
			);
		}

		// Update condition
		const result = await updateAssetCondition(body, user.id);

		return successResponse(result, 200);
	} catch (error) {
		console.error("[POST /api/conditions/update] Error:", error);
		const message =
			error instanceof Error ? error.message : "Failed to update condition";
		return errorResponse(message, 500);
	}
}
