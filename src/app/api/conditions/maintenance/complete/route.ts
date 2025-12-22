/**
 * Maintenance Completion API Route (Phase 12)
 * POST /api/conditions/maintenance/complete
 */

import { NextRequest } from "next/server";
import { requirePermission, successResponse, errorResponse } from "@/lib/api/auth-middleware";
import { completeMaintenance } from "@/lib/services/condition-service";
import type { CompleteMaintenanceRequest } from "@/types/condition";

export async function POST(request: NextRequest) {
	try {
		// Require conditions:complete_maintenance permission (A2 Staff only)
		const authResult = await requirePermission("conditions:complete_maintenance");
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		const body = (await request.json()) as CompleteMaintenanceRequest;

		// Validate request body
		if (!body.assetId || !body.maintenanceNotes) {
			return errorResponse(
				"assetId and maintenanceNotes are required",
				400
			);
		}

		if (body.maintenanceNotes.trim().length === 0) {
			return errorResponse("maintenanceNotes cannot be empty", 400);
		}

		// Complete maintenance
		const result = await completeMaintenance(body, user.id);

		return successResponse(result, 200);
	} catch (error) {
		console.error(
			"[POST /api/conditions/maintenance/complete] Error:",
			error
		);
		const message =
			error instanceof Error
				? error.message
				: "Failed to complete maintenance";
		return errorResponse(message, 500);
	}
}
