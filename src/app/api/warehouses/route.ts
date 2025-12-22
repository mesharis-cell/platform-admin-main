import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import {
	createWarehouse,
	listWarehouses,
} from "@/lib/services/warehouse-service";
import type {
	CreateWarehouseRequest,
	WarehouseListParams,
} from "@/types";

/**
 * POST /api/warehouses
 * Create a new warehouse
 * Auth: PMG Admin only (warehouses:create permission)
 */
export async function POST(request: NextRequest) {
	const authResult = await requirePermission("warehouses:create");
	if (authResult instanceof Response) return authResult;

	try {
		const body = (await request.json()) as CreateWarehouseRequest;

		// Validate required fields
		if (
			!body.name ||
			!body.country ||
			!body.city ||
			!body.address
		) {
			return errorResponse(
				"Name, country, city, and address are required",
				400,
			);
		}

		const warehouse = await createWarehouse(body);
		return successResponse(warehouse, 201);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("duplicate") || error.message.includes("unique")) {
				return errorResponse("Warehouse name already exists", 400);
			}
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to create warehouse", 500);
	}
}

/**
 * GET /api/warehouses
 * List all warehouses (not archived by default)
 * Auth: PMG Admin and A2 Staff (warehouses:read permission)
 */
export async function GET(request: NextRequest) {
	const authResult = await requirePermission("warehouses:read");
	if (authResult instanceof Response) return authResult;

	try {
		const { searchParams } = new URL(request.url);

		const params: WarehouseListParams = {
			includeArchived: searchParams.get("includeArchived") === "true",
			country: searchParams.get("country") || undefined,
			city: searchParams.get("city") || undefined,
			search: searchParams.get("search") || undefined,
			limit: searchParams.get("limit")
				? parseInt(searchParams.get("limit")!)
				: 50,
			offset: searchParams.get("offset")
				? parseInt(searchParams.get("offset")!)
				: 0,
		};

		const result = await listWarehouses(params);
		return successResponse(result, 200);
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400);
		}
		return errorResponse("Failed to list warehouses", 500);
	}
}
