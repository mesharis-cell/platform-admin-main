import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import {
	getZoneById,
	updateZone,
	deleteZone,
} from "@/lib/services/zone-service";
import type { UpdateZoneRequest } from "@/types";

/**
 * GET /api/zones/:id
 * Retrieve single zone details
 * Auth: PMG Admin and A2 Staff (zones:read permission)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("zones:read");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const zone = await getZoneById(id);

		if (!zone) {
			return errorResponse("Zone not found", 404);
		}

		return successResponse(zone, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to get zone", 500);
	}
}

/**
 * PUT /api/zones/:id
 * Update zone details or reassign company
 * Auth: PMG Admin only (zones:update, zones:assign_company permissions)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("zones:update");
	if (authResult instanceof Response) return authResult;

	const body = (await request.json()) as UpdateZoneRequest;

	// Check for assign_company permission if company is being updated
	if (body.company !== undefined) {
		const assignPermCheck = await requirePermission("zones:assign_company");
		if (assignPermCheck instanceof Response) return assignPermCheck;
	}

	try {
		const { id } = await params;
		const zone = await updateZone(id, body);
		return successResponse(zone, 200);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse(error.message, 404);
			}
			if (error.message.includes("duplicate") || error.message.includes("unique")) {
				return errorResponse(
					"Zone name already exists for this warehouse-company combination",
					400,
				);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to update zone", 500);
	}
}

/**
 * DELETE /api/zones/:id
 * Delete zone (soft delete)
 * Auth: PMG Admin only (zones:delete permission)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("zones:delete");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		await deleteZone(id);
		return successResponse(
			{ message: "Zone deleted successfully" },
			200,
		);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Zone not found", 404);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to delete zone", 500);
	}
}
