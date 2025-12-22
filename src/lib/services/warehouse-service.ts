/**
 * Warehouse Service
 * Business logic for warehouse management (CRUD operations)
 */

import { db } from "@/db";
import { warehouses } from "@/db/schema";
import { eq, and, ilike, isNull, sql, desc, or } from "drizzle-orm";
import type {
	Warehouse,
	CreateWarehouseRequest,
	UpdateWarehouseRequest,
	WarehouseListParams,
	WarehouseListResponse,
} from "@/types";

/**
 * Create a new warehouse
 */
export async function createWarehouse(
	data: CreateWarehouseRequest,
): Promise<Warehouse> {
	// Validate required fields
	if (!data.name || data.name.trim().length === 0) {
		throw new Error("Warehouse name is required");
	}
	if (!data.country || data.country.trim().length === 0) {
		throw new Error("Country is required");
	}
	if (!data.city || data.city.trim().length === 0) {
		throw new Error("City is required");
	}
	if (!data.address || data.address.trim().length === 0) {
		throw new Error("Address is required");
	}

	const [warehouse] = await db
		.insert(warehouses)
		.values({
			name: data.name.trim(),
			country: data.country.trim(),
			city: data.city.trim(),
			address: data.address.trim(),
		})
		.returning();

	return mapDbWarehouseToWarehouse(warehouse);
}

/**
 * Get warehouse by ID
 */
export async function getWarehouseById(id: string): Promise<Warehouse | null> {
	const [warehouse] = await db
		.select()
		.from(warehouses)
		.where(eq(warehouses.id, id));

	return warehouse ? mapDbWarehouseToWarehouse(warehouse) : null;
}

/**
 * List warehouses with filtering and pagination
 */
export async function listWarehouses(
	params: WarehouseListParams,
): Promise<WarehouseListResponse> {
	const {
		includeArchived = false,
		country,
		city,
		search,
		limit = 50,
		offset = 0,
	} = params;

	// Validate limit
	const validLimit = Math.min(Math.max(1, limit), 100);

	// Build where conditions
	const conditions = [];

	// Archive filtering
	if (!includeArchived) {
		conditions.push(isNull(warehouses.archivedAt));
	}

	// Country filtering
	if (country && country.trim()) {
		conditions.push(eq(warehouses.country, country.trim()));
	}

	// City filtering
	if (city && city.trim()) {
		conditions.push(eq(warehouses.city, city.trim()));
	}

	// Search filtering (name)
	if (search && search.trim()) {
		conditions.push(ilike(warehouses.name, `%${search.trim()}%`));
	}

	// Combine conditions
	const whereClause =
		conditions.length > 0 ? and(...conditions) : undefined;

	// Get total count
	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(warehouses)
		.where(whereClause);

	const total = countResult?.count || 0;

	// Get paginated results
	const results = await db
		.select()
		.from(warehouses)
		.where(whereClause)
		.orderBy(desc(warehouses.createdAt))
		.limit(validLimit)
		.offset(offset);

	return {
		warehouses: results.map(mapDbWarehouseToWarehouse),
		total,
		limit: validLimit,
		offset,
	};
}

/**
 * Update warehouse
 */
export async function updateWarehouse(
	id: string,
	data: UpdateWarehouseRequest,
): Promise<Warehouse> {
	const updates: Record<string, unknown> = {
		updatedAt: new Date(),
	};

	if (data.name !== undefined) {
		if (!data.name || data.name.trim().length === 0) {
			throw new Error("Warehouse name cannot be empty");
		}
		updates.name = data.name.trim();
	}

	if (data.country !== undefined) {
		if (!data.country || data.country.trim().length === 0) {
			throw new Error("Country cannot be empty");
		}
		updates.country = data.country.trim();
	}

	if (data.city !== undefined) {
		if (!data.city || data.city.trim().length === 0) {
			throw new Error("City cannot be empty");
		}
		updates.city = data.city.trim();
	}

	if (data.address !== undefined) {
		if (!data.address || data.address.trim().length === 0) {
			throw new Error("Address cannot be empty");
		}
		updates.address = data.address.trim();
	}

	const [warehouse] = await db
		.update(warehouses)
		.set(updates)
		.where(eq(warehouses.id, id))
		.returning();

	if (!warehouse) {
		throw new Error("Warehouse not found");
	}

	return mapDbWarehouseToWarehouse(warehouse);
}

/**
 * Archive warehouse (soft delete)
 */
export async function archiveWarehouse(id: string): Promise<void> {
	const [warehouse] = await db
		.update(warehouses)
		.set({
			archivedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(warehouses.id, id))
		.returning();

	if (!warehouse) {
		throw new Error("Warehouse not found");
	}
}

/**
 * Map database warehouse record to API Warehouse type
 */
function mapDbWarehouseToWarehouse(
	dbWarehouse: typeof warehouses.$inferSelect,
): Warehouse {
	return {
		id: dbWarehouse.id,
		name: dbWarehouse.name,
		country: dbWarehouse.country,
		city: dbWarehouse.city,
		address: dbWarehouse.address,
		archivedAt: dbWarehouse.archivedAt,
		createdAt: dbWarehouse.createdAt,
		updatedAt: dbWarehouse.updatedAt,
	};
}
