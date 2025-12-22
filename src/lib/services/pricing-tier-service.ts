/**
 * Phase 5: Pricing Tier Service
 * Business logic for pricing tier management
 */

import { db } from "@/db";
import { pricingTiers } from "@/db/schema/schema";
import { eq, and, or, lt, gt, lte, gte, desc, asc, isNull, sql } from "drizzle-orm";
import type {
	PricingTier,
	CreatePricingTierRequest,
	UpdatePricingTierRequest,
	PricingTierListParams,
} from "@/types/pricing";

/**
 * Map database record to PricingTier type
 */
function mapDbPricingTierToPricingTier(dbTier: typeof pricingTiers.$inferSelect): PricingTier {
	return {
		id: dbTier.id,
		country: dbTier.country,
		city: dbTier.city,
		volumeMin: parseFloat(dbTier.volumeMin),
		volumeMax: parseFloat(dbTier.volumeMax),
		basePrice: parseFloat(dbTier.basePrice),
		isActive: dbTier.isActive,
		createdAt: dbTier.createdAt.toISOString(),
		updatedAt: dbTier.updatedAt.toISOString(),
	};
}

/**
 * Check for overlapping volume ranges in the same city
 * Returns the conflicting tier if overlap exists, null otherwise
 */
async function checkVolumeOverlap(
	country: string,
	city: string,
	volumeMin: number,
	volumeMax: number,
	excludeId?: string
): Promise<PricingTier | null> {
	const conditions = [
		eq(pricingTiers.country, country),
		eq(pricingTiers.city, city),
	];

	if (excludeId) {
		conditions.push(sql`${pricingTiers.id} != ${excludeId}`);
	}

	const existingTiers = await db
		.select()
		.from(pricingTiers)
		.where(and(...conditions));

	for (const tier of existingTiers) {
		const tierMin = parseFloat(tier.volumeMin);
		const tierMax = parseFloat(tier.volumeMax);

		// Check if ranges overlap: (start1 < end2) AND (start2 < end1)
		if (volumeMin < tierMax && tierMin < volumeMax) {
			return mapDbPricingTierToPricingTier(tier);
		}
	}

	return null;
}

/**
 * Create new pricing tier
 */
export async function createPricingTier(
	data: CreatePricingTierRequest
): Promise<PricingTier> {
	// Validation: volumeMin must be >= 0
	if (data.volumeMin < 0) {
		throw new Error("volumeMin must be greater than or equal to 0");
	}

	// Validation: volumeMax must be > volumeMin
	if (data.volumeMax <= data.volumeMin) {
		throw new Error("volumeMax must be greater than volumeMin");
	}

	// Validation: basePrice must be > 0
	if (data.basePrice <= 0) {
		throw new Error("basePrice must be greater than 0");
	}

	// Validation: country and city required (non-empty strings)
	if (!data.country || data.country.trim().length === 0) {
		throw new Error("country is required");
	}

	if (!data.city || data.city.trim().length === 0) {
		throw new Error("city is required");
	}

	// Check for overlapping volume ranges
	const overlap = await checkVolumeOverlap(
		data.country,
		data.city,
		data.volumeMin,
		data.volumeMax
	);

	if (overlap) {
		throw new Error(
			`Volume range ${data.volumeMin}-${data.volumeMax} m³ overlaps with existing tier (${overlap.volumeMin}-${overlap.volumeMax} m³) for ${data.city}`
		);
	}

	const [newTier] = await db
		.insert(pricingTiers)
		.values({
			country: data.country.trim(),
			city: data.city.trim(),
			volumeMin: data.volumeMin.toString(),
			volumeMax: data.volumeMax.toString(),
			basePrice: data.basePrice.toString(),
			isActive: data.isActive ?? true,
		})
		.returning();

	return mapDbPricingTierToPricingTier(newTier);
}

/**
 * Get pricing tier by ID
 */
export async function getPricingTierById(id: string): Promise<PricingTier | null> {
	const [tier] = await db
		.select()
		.from(pricingTiers)
		.where(eq(pricingTiers.id, id))
		.limit(1);

	return tier ? mapDbPricingTierToPricingTier(tier) : null;
}

/**
 * List pricing tiers with filtering and sorting
 */
export async function listPricingTiers(
	params: PricingTierListParams = {}
): Promise<{ data: PricingTier[]; total: number }> {
	const {
		country,
		city,
		isActive,
		sortBy = "createdAt",
		sortOrder = "desc",
		page = 1,
		pageSize = 50,
	} = params;

	const conditions = [];

	if (country) {
		conditions.push(eq(pricingTiers.country, country));
	}

	if (city) {
		conditions.push(eq(pricingTiers.city, city));
	}

	if (isActive !== undefined) {
		conditions.push(eq(pricingTiers.isActive, isActive));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	// Get total count
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(pricingTiers)
		.where(whereClause);

	// Get paginated results with sorting
	const sortColumn = pricingTiers[sortBy] || pricingTiers.createdAt;
	const orderFn = sortOrder === "asc" ? asc : desc;

	const results = await db
		.select()
		.from(pricingTiers)
		.where(whereClause)
		.orderBy(orderFn(sortColumn))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	return {
		data: results.map(mapDbPricingTierToPricingTier),
		total: Number(count),
	};
}

/**
 * Update pricing tier
 */
export async function updatePricingTier(
	id: string,
	data: UpdatePricingTierRequest
): Promise<PricingTier> {
	// Check if tier exists
	const existingTier = await getPricingTierById(id);
	if (!existingTier) {
		throw new Error("Pricing tier not found");
	}

	// Validate volumeMin and volumeMax if provided
	const volumeMin = data.volumeMin ?? existingTier.volumeMin;
	const volumeMax = data.volumeMax ?? existingTier.volumeMax;

	if (volumeMin < 0) {
		throw new Error("volumeMin must be greater than or equal to 0");
	}

	if (volumeMax <= volumeMin) {
		throw new Error("volumeMax must be greater than volumeMin");
	}

	// Validate basePrice if provided
	if (data.basePrice !== undefined && data.basePrice <= 0) {
		throw new Error("basePrice must be greater than 0");
	}

	// Check for overlapping volume ranges if volumes changed
	if (data.volumeMin !== undefined || data.volumeMax !== undefined) {
		const overlap = await checkVolumeOverlap(
			existingTier.country,
			existingTier.city,
			volumeMin,
			volumeMax,
			id
		);

		if (overlap) {
			throw new Error(
				`Volume range ${volumeMin}-${volumeMax} m³ overlaps with existing tier (${overlap.volumeMin}-${overlap.volumeMax} m³) for ${existingTier.city}`
			);
		}
	}

	const updateData: Partial<typeof pricingTiers.$inferInsert> = {};

	if (data.volumeMin !== undefined) {
		updateData.volumeMin = data.volumeMin.toString();
	}

	if (data.volumeMax !== undefined) {
		updateData.volumeMax = data.volumeMax.toString();
	}

	if (data.basePrice !== undefined) {
		updateData.basePrice = data.basePrice.toString();
	}

	if (data.isActive !== undefined) {
		updateData.isActive = data.isActive;
	}

	const [updatedTier] = await db
		.update(pricingTiers)
		.set(updateData)
		.where(eq(pricingTiers.id, id))
		.returning();

	return mapDbPricingTierToPricingTier(updatedTier);
}

/**
 * Toggle pricing tier active status
 */
export async function togglePricingTier(
	id: string,
	isActive: boolean
): Promise<PricingTier> {
	// Check if tier exists
	const existingTier = await getPricingTierById(id);
	if (!existingTier) {
		throw new Error("Pricing tier not found");
	}

	const [updatedTier] = await db
		.update(pricingTiers)
		.set({ isActive })
		.where(eq(pricingTiers.id, id))
		.returning();

	return mapDbPricingTierToPricingTier(updatedTier);
}

/**
 * Delete pricing tier
 * Only allowed if not referenced by any orders
 */
export async function deletePricingTier(id: string): Promise<void> {
	// Check if tier exists
	const existingTier = await getPricingTierById(id);
	if (!existingTier) {
		throw new Error("Pricing tier not found");
	}

	// Note: Foreign key constraint will prevent deletion if referenced by orders
	// This will throw an error if tier is in use
	try {
		await db.delete(pricingTiers).where(eq(pricingTiers.id, id));
	} catch (error) {
		if (error instanceof Error && error.message.includes("foreign key")) {
			throw new Error(
				"Cannot delete tier - it is referenced by existing orders. Deactivate instead."
			);
		}
		throw error;
	}
}

/**
 * Find matching pricing tier for given volume and location
 * Used for order pricing calculation
 */
export async function findMatchingTier(
	country: string,
	city: string,
	volume: number
): Promise<PricingTier | null> {
	// Find active tiers where volumeMin <= volume < volumeMax
	// Order by smallest range first to get most specific tier
	const matchingTiers = await db
		.select()
		.from(pricingTiers)
		.where(
			and(
				eq(pricingTiers.country, country),
				eq(pricingTiers.city, city),
				eq(pricingTiers.isActive, true),
				lte(sql`CAST(${pricingTiers.volumeMin} AS DECIMAL)`, volume),
				gt(sql`CAST(${pricingTiers.volumeMax} AS DECIMAL)`, volume)
			)
		)
		.orderBy(
			asc(
				sql`CAST(${pricingTiers.volumeMax} AS DECIMAL) - CAST(${pricingTiers.volumeMin} AS DECIMAL)`
			)
		)
		.limit(1);

	return matchingTiers.length > 0
		? mapDbPricingTierToPricingTier(matchingTiers[0])
		: null;
}
