/**
 * Zone Service
 * Business logic for zone management (CRUD operations)
 */

import { db } from "@/db";
import { zones, warehouses, companies } from "@/db/schema";
import { eq, and, isNull, isNotNull, sql, desc } from "drizzle-orm";
import type {
	Zone,
	CreateZoneRequest,
	UpdateZoneRequest,
	ZoneListParams,
	ZoneListResponse,
} from "@/types";

/**
 * Create a new zone
 */
export async function createZone(data: CreateZoneRequest): Promise<Zone> {
	// Validate required fields
	if (!data.warehouse || !data.company || !data.name) {
		throw new Error("Warehouse, company, and name are required");
	}

	// Verify warehouse exists and is not archived
	const [warehouse] = await db
		.select()
		.from(warehouses)
		.where(
			and(
				eq(warehouses.id, data.warehouse),
				isNull(warehouses.archivedAt),
			),
		);

	if (!warehouse) {
		throw new Error("Warehouse not found or is archived");
	}

	// Verify company exists and is not archived
	const [company] = await db
		.select()
		.from(companies)
		.where(
			and(
				eq(companies.id, data.company),
				isNull(companies.archivedAt),
			),
		);

	if (!company) {
		throw new Error("Company not found or is archived");
	}

	const [zone] = await db
		.insert(zones)
		.values({
			warehouse: data.warehouse,
			company: data.company,
			name: data.name.trim(),
			description: data.description?.trim() || null,
		})
		.returning();

	return mapDbZoneToZone(zone, warehouse.name, company.name);
}

/**
 * Get zone by ID
 */
export async function getZoneById(id: string): Promise<Zone | null> {
	const [result] = await db
		.select({
			zone: zones,
			warehouseName: warehouses.name,
			companyName: companies.name,
		})
		.from(zones)
		.leftJoin(warehouses, eq(zones.warehouse, warehouses.id))
		.leftJoin(companies, eq(zones.company, companies.id))
		.where(eq(zones.id, id));

	if (!result) return null;

	return mapDbZoneToZone(
		result.zone,
		result.warehouseName,
		result.companyName,
	);
}

/**
 * List zones with filtering and pagination
 */
export async function listZones(
	params: ZoneListParams,
): Promise<ZoneListResponse> {
	const {
		warehouse,
		company,
		includeDeleted = false,
		limit = 50,
		offset = 0,
	} = params;

	// Validate limit
	const validLimit = Math.min(Math.max(1, limit), 100);

	// Build where conditions
	const conditions = [];

	// Warehouse filtering
	if (warehouse) {
		conditions.push(eq(zones.warehouse, warehouse));
	}

	// Company filtering
	if (company) {
		conditions.push(eq(zones.company, company));
	}

	// Delete filtering
	if (!includeDeleted) {
		conditions.push(isNull(zones.deletedAt));
	}

	// Combine conditions
	const whereClause =
		conditions.length > 0 ? and(...conditions) : undefined;

	// Get total count
	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(zones)
		.where(whereClause);

	const total = countResult?.count || 0;

	// Get paginated results with joins
	const results = await db
		.select({
			zone: zones,
			warehouseName: warehouses.name,
			companyName: companies.name,
		})
		.from(zones)
		.leftJoin(warehouses, eq(zones.warehouse, warehouses.id))
		.leftJoin(companies, eq(zones.company, companies.id))
		.where(whereClause)
		.orderBy(desc(zones.createdAt))
		.limit(validLimit)
		.offset(offset);

	return {
		zones: results.map((r) =>
			mapDbZoneToZone(r.zone, r.warehouseName, r.companyName),
		),
		total,
		limit: validLimit,
		offset,
	};
}

/**
 * Update zone
 */
export async function updateZone(
	id: string,
	data: UpdateZoneRequest,
): Promise<Zone> {
	const updates: Record<string, unknown> = {
		updatedAt: new Date(),
	};

	if (data.warehouse !== undefined) {
		// Verify warehouse exists and is not archived
		const [warehouse] = await db
			.select()
			.from(warehouses)
			.where(
				and(
					eq(warehouses.id, data.warehouse),
					isNull(warehouses.archivedAt),
				),
			);

		if (!warehouse) {
			throw new Error("Warehouse not found or is archived");
		}
		updates.warehouse = data.warehouse;
	}

	if (data.company !== undefined) {
		// Verify company exists and is not archived
		const [company] = await db
			.select()
			.from(companies)
			.where(
				and(
					eq(companies.id, data.company),
					isNull(companies.archivedAt),
				),
			);

		if (!company) {
			throw new Error("Company not found or is archived");
		}
		updates.company = data.company;
	}

	if (data.name !== undefined) {
		if (!data.name || data.name.trim().length === 0) {
			throw new Error("Zone name cannot be empty");
		}
		updates.name = data.name.trim();
	}

	if (data.description !== undefined) {
		updates.description = data.description?.trim() || null;
	}

	const [zone] = await db
		.update(zones)
		.set(updates)
		.where(eq(zones.id, id))
		.returning();

	if (!zone) {
		throw new Error("Zone not found");
	}

	// Fetch warehouse and company names
	const [warehouse] = await db
		.select({ name: warehouses.name })
		.from(warehouses)
		.where(eq(warehouses.id, zone.warehouse));

	const [company] = await db
		.select({ name: companies.name })
		.from(companies)
		.where(eq(companies.id, zone.company));

	return mapDbZoneToZone(
		zone,
		warehouse?.name || "",
		company?.name || "",
	);
}

/**
 * Delete zone (soft delete)
 */
export async function deleteZone(id: string): Promise<void> {
	const [zone] = await db
		.update(zones)
		.set({
			deletedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(zones.id, id))
		.returning();

	if (!zone) {
		throw new Error("Zone not found");
	}
}

/**
 * Map database zone record to API Zone type
 */
function mapDbZoneToZone(
	dbZone: typeof zones.$inferSelect,
	warehouseName?: string | null,
	companyName?: string | null,
): Zone {
	return {
		id: dbZone.id,
		warehouse: dbZone.warehouse,
		company: dbZone.company,
		name: dbZone.name,
		description: dbZone.description,
		deletedAt: dbZone.deletedAt,
		createdAt: dbZone.createdAt,
		updatedAt: dbZone.updatedAt,
		warehouseName: warehouseName || undefined,
		companyName: companyName || undefined,
	};
}
