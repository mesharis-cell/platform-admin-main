import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import {
	getWarehouseById,
	updateWarehouse,
	archiveWarehouse,
} from "@/lib/services/warehouse-service";
import type { UpdateWarehouseRequest } from "@/types";

/**
 * GET /api/warehouses/:id
 * Retrieve single warehouse details
 * Auth: PMG Admin and A2 Staff (warehouses:read permission)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("warehouses:read");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const warehouse = await getWarehouseById(id);

		if (!warehouse) {
			return errorResponse("Warehouse not found", 404);
		}

		return successResponse(warehouse, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to get warehouse", 500);
	}
}

/**
 * PUT /api/warehouses/:id
 * Update warehouse information
 * Auth: PMG Admin only (warehouses:update permission)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("warehouses:update");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const body = (await request.json()) as UpdateWarehouseRequest;
		const warehouse = await updateWarehouse(id, body);
		return successResponse(warehouse, 200);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Warehouse not found", 404);
			}
			if (error.message.includes("duplicate") || error.message.includes("unique")) {
				return errorResponse("Warehouse name already exists", 400);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to update warehouse", 500);
	}
}

/**
 * DELETE /api/warehouses/:id
 * Archive warehouse (soft delete)
 * Auth: PMG Admin only (warehouses:archive permission)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const authResult = await requirePermission("warehouses:archive");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		await archiveWarehouse(id);
		return successResponse(
			{ message: "Warehouse archived successfully" },
			200,
		);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return errorResponse("Warehouse not found", 404);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to archive warehouse", 500);
	}
}
