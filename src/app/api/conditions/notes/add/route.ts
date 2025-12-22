/**
 * Add Maintenance Notes API Route (Phase 12)
 * POST /api/conditions/notes/add
 */

import { NextRequest } from "next/server";
import { requirePermission, successResponse, errorResponse } from "@/lib/api/auth-middleware";
import { addMaintenanceNotes } from "@/lib/services/condition-service";
import type { AddMaintenanceNotesRequest } from "@/types/condition";

export async function POST(request: NextRequest) {
	try {
		// Require conditions:add_maintenance_notes permission (A2 Staff only)
		const authResult = await requirePermission(
			"conditions:add_maintenance_notes"
		);
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		const body = (await request.json()) as AddMaintenanceNotesRequest;

		// Validate request body
		if (!body.assetId || !body.notes) {
			return errorResponse("assetId and notes are required", 400);
		}

		if (body.notes.trim().length === 0) {
			return errorResponse("notes cannot be empty", 400);
		}

		// Add maintenance notes
		const result = await addMaintenanceNotes(body, user.id);

		return successResponse(result, 200);
	} catch (error) {
		console.error("[POST /api/conditions/notes/add] Error:", error);
		const message =
			error instanceof Error
				? error.message
				: "Failed to add maintenance notes";
		return errorResponse(message, 500);
	}
}
