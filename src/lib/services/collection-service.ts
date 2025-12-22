// Phase 4: Collection Management Service Layer

import { db } from '@/db';
import { collections, collectionItems, assets, companies, brands } from '@/db/schema/schema';
import { eq, and, ilike, or, isNull, desc, sql, count } from 'drizzle-orm';
import type {
	Collection,
	CollectionWithDetails,
	CollectionItem,
	CollectionItemWithAsset,
	CreateCollectionRequest,
	UpdateCollectionRequest,
	CollectionListParams,
	AddCollectionItemRequest,
	UpdateCollectionItemRequest,
	CollectionAvailabilityItem,
} from '@/types/collection';

// ========================================
// Collection CRUD Operations
// ========================================

export async function createCollection(data: CreateCollectionRequest): Promise<Collection> {
	// Validate company exists
	const company = await db.query.companies.findFirst({
		where: eq(companies.id, data.company),
	});

	if (!company) {
		throw new Error('Company not found');
	}

	// Validate brand exists and belongs to company (if provided)
	if (data.brand) {
		const brand = await db.query.brands.findFirst({
			where: and(
				eq(brands.id, data.brand),
				eq(brands.company, data.company),
				isNull(brands.deletedAt)
			),
		});

		if (!brand) {
			throw new Error('Brand not found or does not belong to company');
		}
	}

	const [collection] = await db
		.insert(collections)
		.values({
			company: data.company,
			brand: data.brand || null,
			name: data.name,
			description: data.description || null,
			category: data.category || null,
			images: data.images || [],
		})
		.returning();

	return mapDbCollectionToCollection(collection);
}

export async function getCollectionById(
	id: string,
	includeDeleted = false
): Promise<(CollectionWithDetails & { items: CollectionItemWithAsset[] }) | null> {
	// First get the raw collection to extract the company UUID
	const rawCollection = await db.query.collections.findFirst({
		where: includeDeleted
			? eq(collections.id, id)
			: and(eq(collections.id, id), isNull(collections.deletedAt)),
		columns: {
			id: true,
			company: true,
			brand: true,
			name: true,
			description: true,
			images: true,
			category: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		},
	});

	if (!rawCollection) {
		return null;
	}

	// Now get the collection with relations
	const collectionQuery = db.query.collections.findFirst({
		where: includeDeleted
			? eq(collections.id, id)
			: and(eq(collections.id, id), isNull(collections.deletedAt)),
		with: {
			company: {
				columns: {
					name: true,
				},
			},
			brand: {
				columns: {
					name: true,
					logoUrl: true,
				},
			},
			items: {
				with: {
					asset: {
						columns: {
							id: true,
							name: true,
							category: true,
							images: true,
							volume: true,
							weight: true,
							status: true,
							condition: true,
							availableQuantity: true,
							totalQuantity: true,
							handlingTags: true,
						},
					},
				},
			},
		},
	});

	const collection = await collectionQuery;

	if (!collection) {
		return null;
	}

	return {
		id: collection.id,
		company: rawCollection.company, // Use the UUID from raw query
		brand: rawCollection.brand, // Use the UUID from raw query
		name: collection.name,
		description: collection.description,
		images: collection.images,
		category: collection.category,
		companyName: collection.company.name,
		brandName: collection.brand?.name,
		brandLogoUrl: collection.brand?.logoUrl,
		itemCount: collection.items.length,
		createdAt: collection.createdAt,
		updatedAt: collection.updatedAt,
		deletedAt: collection.deletedAt,
		items: collection.items.map((item) => ({
			id: item.id,
			collection: item.collection,
			asset: item.asset,
			defaultQuantity: item.defaultQuantity,
			notes: item.notes,
			createdAt: item.createdAt,
			assetDetails: {
				id: item.asset.id,
				name: item.asset.name,
				category: item.asset.category,
				images: item.asset.images,
				volume: item.asset.volume,
				weight: item.asset.weight,
				status: item.asset.status,
				condition: item.asset.condition,
				availableQuantity: item.asset.availableQuantity,
				totalQuantity: item.asset.totalQuantity,
				handlingTags: item.asset.handlingTags as any, // Type assertion for string[] to HandlingTag[]
			},
		})),
	};
}

export async function listCollections(params: CollectionListParams, companyScope: string[] | null = null) {
	const {
		company,
		brand,
		category,
		search,
		includeDeleted = false,
		limit = 50,
		offset = 0,
	} = params;

	// Build WHERE conditions
	const conditions = [];

	// Company scope filtering (multi-tenancy)
	if (companyScope !== null) {
		// companyScope null means wildcard ["*"] access
		if (company) {
			// If specific company requested, check user has access
			if (!companyScope.includes(company)) {
				throw new Error('Access denied to company');
			}
			conditions.push(eq(collections.company, company));
		} else {
			// Filter by user's company scope
			if (companyScope.length === 1) {
				conditions.push(eq(collections.company, companyScope[0]));
			} else {
				conditions.push(
					or(...companyScope.map((c) => eq(collections.company, c)))!
				);
			}
		}
	} else {
		// Wildcard access - apply company filter if provided
		if (company) {
			conditions.push(eq(collections.company, company));
		}
	}

	// Brand filter
	if (brand) {
		conditions.push(eq(collections.brand, brand));
	}

	// Category filter
	if (category) {
		conditions.push(eq(collections.category, category));
	}

	// Search filter (name)
	if (search) {
		conditions.push(ilike(collections.name, `%${search}%`));
	}

	// Deleted filter
	if (!includeDeleted) {
		conditions.push(isNull(collections.deletedAt));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	// Get total count
	const totalResult = await db
		.select({ count: count() })
		.from(collections)
		.where(whereClause);

	const total = totalResult[0]?.count || 0;

	// Get collections with item count
	const collectionsResult = await db
		.select({
			id: collections.id,
			company: collections.company,
			brand: collections.brand,
			name: collections.name,
			description: collections.description,
			images: collections.images,
			category: collections.category,
			createdAt: collections.createdAt,
			updatedAt: collections.updatedAt,
			deletedAt: collections.deletedAt,
			companyName: companies.name,
			brandName: brands.name,
			brandLogoUrl: brands.logoUrl,
			itemCount: sql<number>`(SELECT COUNT(*) FROM ${collectionItems} WHERE ${collectionItems.collection} = ${collections.id})`,
		})
		.from(collections)
		.leftJoin(companies, eq(collections.company, companies.id))
		.leftJoin(brands, eq(collections.brand, brands.id))
		.where(whereClause)
		.orderBy(desc(collections.createdAt))
		.limit(limit)
		.offset(offset);

	const collectionsList: CollectionWithDetails[] = collectionsResult.map((row) => ({
		id: row.id,
		company: row.company,
		brand: row.brand,
		name: row.name,
		description: row.description,
		images: row.images,
		category: row.category,
		companyName: row.companyName || undefined,
		brandName: row.brandName || undefined,
		brandLogoUrl: row.brandLogoUrl || undefined,
		itemCount: row.itemCount,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt,
	}));

	return {
		collections: collectionsList,
		total: Number(total),
		limit,
		offset,
	};
}

export async function updateCollection(
	id: string,
	data: UpdateCollectionRequest
): Promise<Collection> {
	// Check collection exists
	const existing = await db.query.collections.findFirst({
		where: and(eq(collections.id, id), isNull(collections.deletedAt)),
	});

	if (!existing) {
		throw new Error('Collection not found');
	}

	// Validate brand belongs to same company (if provided)
	if (data.brand !== undefined) {
		if (data.brand) {
			const brand = await db.query.brands.findFirst({
				where: and(
					eq(brands.id, data.brand),
					eq(brands.company, existing.company),
					isNull(brands.deletedAt)
				),
			});

			if (!brand) {
				throw new Error('Brand not found or does not belong to collection company');
			}
		}
	}

	const updateData: Record<string, any> = {};

	if (data.name !== undefined) updateData.name = data.name;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.category !== undefined) updateData.category = data.category;
	if (data.images !== undefined) updateData.images = data.images;
	if (data.brand !== undefined) updateData.brand = data.brand;

	const [updated] = await db
		.update(collections)
		.set(updateData)
		.where(eq(collections.id, id))
		.returning();

	return mapDbCollectionToCollection(updated);
}

export async function deleteCollection(id: string): Promise<void> {
	// Check collection exists
	const existing = await db.query.collections.findFirst({
		where: and(eq(collections.id, id), isNull(collections.deletedAt)),
	});

	if (!existing) {
		throw new Error('Collection not found');
	}

	// Soft delete
	await db
		.update(collections)
		.set({ deletedAt: new Date() })
		.where(eq(collections.id, id));
}

// ========================================
// Collection Item Operations
// ========================================

export async function addCollectionItem(
	collectionId: string,
	data: AddCollectionItemRequest
): Promise<CollectionItem> {
	// Validate collection exists
	const collection = await db.query.collections.findFirst({
		where: and(eq(collections.id, collectionId), isNull(collections.deletedAt)),
	});

	if (!collection) {
		throw new Error('Collection not found');
	}

	// Validate asset exists and belongs to same company
	const asset = await db.query.assets.findFirst({
		where: and(
			eq(assets.id, data.asset),
			eq(assets.company, collection.company),
			isNull(assets.deletedAt)
		),
	});

	if (!asset) {
		throw new Error('Asset not found or does not belong to collection company');
	}

	// Check if asset already in collection
	const existingItem = await db.query.collectionItems.findFirst({
		where: and(
			eq(collectionItems.collection, collectionId),
			eq(collectionItems.asset, data.asset)
		),
	});

	if (existingItem) {
		throw new Error('Asset already in collection');
	}

	const [item] = await db
		.insert(collectionItems)
		.values({
			collection: collectionId,
			asset: data.asset,
			defaultQuantity: data.defaultQuantity,
			notes: data.notes || null,
		})
		.returning();

	return mapDbCollectionItemToCollectionItem(item);
}

export async function updateCollectionItem(
	itemId: string,
	data: UpdateCollectionItemRequest
): Promise<CollectionItem> {
	// Check item exists
	const existing = await db.query.collectionItems.findFirst({
		where: eq(collectionItems.id, itemId),
	});

	if (!existing) {
		throw new Error('Collection item not found');
	}

	const updateData: Record<string, any> = {};

	if (data.defaultQuantity !== undefined) updateData.defaultQuantity = data.defaultQuantity;
	if (data.notes !== undefined) updateData.notes = data.notes;

	const [updated] = await db
		.update(collectionItems)
		.set(updateData)
		.where(eq(collectionItems.id, itemId))
		.returning();

	return mapDbCollectionItemToCollectionItem(updated);
}

export async function removeCollectionItem(itemId: string): Promise<void> {
	// Check item exists
	const existing = await db.query.collectionItems.findFirst({
		where: eq(collectionItems.id, itemId),
	});

	if (!existing) {
		throw new Error('Collection item not found');
	}

	// Delete item
	await db.delete(collectionItems).where(eq(collectionItems.id, itemId));
}

// ========================================
// Collection Availability Check
// ========================================

export async function checkCollectionAvailability(
	collectionId: string,
	eventStartDate: string,
	eventEndDate: string
): Promise<{ isFullyAvailable: boolean; items: CollectionAvailabilityItem[] }> {
	// Get collection with items
	const collection = await getCollectionById(collectionId);

	if (!collection) {
		throw new Error('Collection not found');
	}

	// Check availability for each item
	const availabilityItems: CollectionAvailabilityItem[] = collection.items.map((item) => {
		const isAvailable = item.assetDetails.availableQuantity >= item.defaultQuantity;

		return {
			assetId: item.assetDetails.id,
			assetName: item.assetDetails.name,
			defaultQuantity: item.defaultQuantity,
			availableQuantity: item.assetDetails.availableQuantity,
			isAvailable,
		};
	});

	const isFullyAvailable = availabilityItems.every((item) => item.isAvailable);

	return {
		isFullyAvailable,
		items: availabilityItems,
	};
}

// ========================================
// Helper Functions
// ========================================

function mapDbCollectionToCollection(dbCollection: any): Collection {
	return {
		id: dbCollection.id,
		company: dbCollection.company,
		brand: dbCollection.brand,
		name: dbCollection.name,
		description: dbCollection.description,
		images: dbCollection.images,
		category: dbCollection.category,
		createdAt: dbCollection.createdAt,
		updatedAt: dbCollection.updatedAt,
		deletedAt: dbCollection.deletedAt,
	};
}

function mapDbCollectionItemToCollectionItem(dbItem: any): CollectionItem {
	return {
		id: dbItem.id,
		collection: dbItem.collection,
		asset: dbItem.asset,
		defaultQuantity: dbItem.defaultQuantity,
		notes: dbItem.notes,
		createdAt: dbItem.createdAt,
	};
}
