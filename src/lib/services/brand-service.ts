/**
 * Brand Service
 * Business logic for brand management (CRUD operations)
 */

import { db } from "@/db";
import { brands, companies } from "@/db/schema";
import { eq, and, ilike, isNull, sql, desc } from "drizzle-orm";
import type {
	Brand,
	CreateBrandRequest,
	UpdateBrandRequest,
	BrandListParams,
	BrandListResponse,
} from "@/types";

/**
 * Create a new brand
 */
export async function createBrand(data: CreateBrandRequest): Promise<Brand> {
	// Validate required fields
	if (!data.company || !data.name) {
		throw new Error("Company and name are required");
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

	// Validate logo URL if provided
	if (data.logoUrl && !isValidUrl(data.logoUrl)) {
		throw new Error(
			"Invalid logo URL format. Must start with http:// or https:// and be under 500 characters",
		);
	}

	const [brand] = await db
		.insert(brands)
		.values({
			company: data.company,
			name: data.name.trim(),
			description: data.description?.trim() || null,
			logoUrl: data.logoUrl?.trim() || null,
		})
		.returning();

	return mapDbBrandToBrand(brand, company.name);
}

/**
 * Get brand by ID
 */
export async function getBrandById(id: string): Promise<Brand | null> {
	const [result] = await db
		.select({
			brand: brands,
			companyName: companies.name,
		})
		.from(brands)
		.leftJoin(companies, eq(brands.company, companies.id))
		.where(eq(brands.id, id));

	if (!result) return null;

	return mapDbBrandToBrand(result.brand, result.companyName);
}

/**
 * List brands with filtering and pagination
 */
export async function listBrands(
	params: BrandListParams,
	userCompanies: string[] | null, // null means wildcard access ["*"]
): Promise<BrandListResponse> {
	const {
		company,
		includeDeleted = false,
		search,
		limit = 50,
		offset = 0,
	} = params;

	// Validate limit
	const validLimit = Math.min(Math.max(1, limit), 100);

	// Build where conditions
	const conditions = [];

	// Company filtering (explicit filter parameter)
	if (company) {
		conditions.push(eq(brands.company, company));
	}

	// Company scope filtering (RBAC)
	if (userCompanies !== null && userCompanies.length > 0) {
		conditions.push(
			sql`${brands.company} IN (${sql.join(userCompanies.map((id) => sql`${id}`), sql`, `)})`,
		);
	}

	// Delete filtering
	if (!includeDeleted) {
		conditions.push(isNull(brands.deletedAt));
	}

	// Search filtering
	if (search && search.trim()) {
		conditions.push(ilike(brands.name, `%${search.trim()}%`));
	}

	// Combine conditions
	const whereClause =
		conditions.length > 0 ? and(...conditions) : undefined;

	// Get total count
	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(brands)
		.where(whereClause);

	const total = countResult?.count || 0;

	// Get paginated results with joins
	const results = await db
		.select({
			brand: brands,
			companyName: companies.name,
		})
		.from(brands)
		.leftJoin(companies, eq(brands.company, companies.id))
		.where(whereClause)
		.orderBy(desc(brands.createdAt))
		.limit(validLimit)
		.offset(offset);

	return {
		brands: results.map((r) =>
			mapDbBrandToBrand(r.brand, r.companyName),
		),
		total,
		limit: validLimit,
		offset,
	};
}

/**
 * Update brand
 */
export async function updateBrand(
	id: string,
	data: UpdateBrandRequest,
): Promise<Brand> {
	// Ensure company field cannot be changed (business rule)
	if ("company" in data) {
		throw new Error("Company field cannot be changed");
	}

	const updates: Record<string, unknown> = {
		updatedAt: new Date(),
	};

	if (data.name !== undefined) {
		if (!data.name || data.name.trim().length === 0) {
			throw new Error("Brand name cannot be empty");
		}
		updates.name = data.name.trim();
	}

	if (data.description !== undefined) {
		updates.description = data.description?.trim() || null;
	}

	if (data.logoUrl !== undefined) {
		if (data.logoUrl && !isValidUrl(data.logoUrl)) {
			throw new Error(
				"Invalid logo URL format. Must start with http:// or https:// and be under 500 characters",
			);
		}
		updates.logoUrl = data.logoUrl?.trim() || null;
	}

	const [brand] = await db
		.update(brands)
		.set(updates)
		.where(eq(brands.id, id))
		.returning();

	if (!brand) {
		throw new Error("Brand not found");
	}

	// Fetch company name
	const [company] = await db
		.select({ name: companies.name })
		.from(companies)
		.where(eq(companies.id, brand.company));

	return mapDbBrandToBrand(brand, company?.name || "");
}

/**
 * Delete brand (soft delete, makes assets unbranded)
 */
export async function deleteBrand(id: string): Promise<void> {
	const [brand] = await db
		.update(brands)
		.set({
			deletedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(brands.id, id))
		.returning();

	if (!brand) {
		throw new Error("Brand not found");
	}

	// Note: In Phase 3, we'll need to set brand field to null for all assets with this brand
	// For now, this is just a soft delete of the brand record
}

/**
 * Map database brand record to API Brand type
 */
function mapDbBrandToBrand(
	dbBrand: typeof brands.$inferSelect,
	companyName?: string | null,
): Brand {
	return {
		id: dbBrand.id,
		company: dbBrand.company,
		name: dbBrand.name,
		description: dbBrand.description,
		logoUrl: dbBrand.logoUrl,
		deletedAt: dbBrand.deletedAt,
		createdAt: dbBrand.createdAt,
		updatedAt: dbBrand.updatedAt,
		companyName: companyName || undefined,
	};
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
	if (!url || url.length > 500) return false;
	return url.startsWith("http://") || url.startsWith("https://");
}
