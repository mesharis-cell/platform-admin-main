import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import { createZone, listZones } from "@/lib/services/zone-service";
import type { CreateZoneRequest, ZoneListParams } from "@/types";

/**
 * POST /api/zones
 * Create a new company-exclusive zone within warehouse
 * Auth: PMG Admin only (zones:create, zones:assign_company permissions)
 */
export async function POST(request: NextRequest) {
	const authResult = await requirePermission("zones:create");
	if (authResult instanceof Response) return authResult;

	// Also check for assign_company permission
	const assignPermCheck = await requirePermission("zones:assign_company");
	if (assignPermCheck instanceof Response) return assignPermCheck;

	try {
		const body = (await request.json()) as CreateZoneRequest;

		// Validate required fields
		if (!body.warehouse || !body.company || !body.name) {
			return errorResponse(
				"Warehouse, company, and name are required",
				400,
			);
		}

		const zone = await createZone(body);
		return successResponse(zone, 201);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("duplicate") || error.message.includes("unique")) {
				return errorResponse(
					"Zone name already exists for this warehouse-company combination",
					400,
				);
			}
			if (error.message.includes("not found") || error.message.includes("archived")) {
				return errorResponse(error.message, 404);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to create zone", 500);
	}
}

/**
 * GET /api/zones
 * List zones filtered by warehouse or company
 * Auth: PMG Admin and A2 Staff (zones:read permission)
 */
export async function GET(request: NextRequest) {
	const authResult = await requirePermission("zones:read");
	if (authResult instanceof Response) return authResult;

	try {
		const { searchParams } = new URL(request.url);

		const params: ZoneListParams = {
			warehouse: searchParams.get("warehouse") || undefined,
			company: searchParams.get("company") || undefined,
			includeDeleted: searchParams.get("includeDeleted") === "true",
			limit: searchParams.get("limit")
				? parseInt(searchParams.get("limit")!)
				: 50,
			offset: searchParams.get("offset")
				? parseInt(searchParams.get("offset")!)
				: 0,
		};

		const result = await listZones(params);
		return successResponse(result, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to list zones", 500);
	}
}
