// Phase 4: Client Catalog Service Layer

import { db } from '@/db'
import {
	assets,
	collections,
	collectionItems,
	companies,
	brands,
} from '@/db/schema/schema'
import { eq, and, ilike, or, isNull, desc, sql, count } from 'drizzle-orm'
import type {
	CatalogItem,
	CatalogListParams,
	CatalogAssetDetails,
	CatalogCollectionDetails,
	CatalogCollectionItemDetail,
} from '@/types/collection'

// ========================================
// Catalog Browse (Assets + Collections)
// ========================================

export async function browseCatalog(
	params: CatalogListParams,
	companyScope: string[] | null = null
) {
	const {
		company,
		brand,
		category,
		search,
		type = 'all',
		limit = 50,
		offset = 0,
	} = params

	const items: CatalogItem[] = []
	let totalCount = 0

	// Build company filter
	const getCompanyConditions = (
		table: typeof assets | typeof collections
	) => {
		const conditions = []

		if (companyScope !== null) {
			if (company) {
				if (!companyScope.includes(company)) {
					throw new Error('Access denied to company')
				}
				conditions.push(eq(table.company, company))
			} else {
				if (companyScope.length === 1) {
					conditions.push(eq(table.company, companyScope[0]))
				} else {
					conditions.push(
						or(...companyScope.map(c => eq(table.company, c)))!
					)
				}
			}
		} else {
			if (company) {
				conditions.push(eq(table.company, company))
			}
		}

		return conditions
	}

	// Fetch assets if needed
	if (type === 'all' || type === 'asset') {
		const assetConditions = [
			...getCompanyConditions(assets),
			isNull(assets.deletedAt),
		]

		if (brand) assetConditions.push(eq(assets.brand, brand))
		if (category) assetConditions.push(eq(assets.category, category))
		if (search) assetConditions.push(ilike(assets.name, `%${search}%`))

		const assetsResult = await db
			.select({
				id: assets.id,
				name: assets.name,
				description: assets.description,
				category: assets.category,
				images: assets.images,
				totalQuantity: assets.totalQuantity,
				condition: assets.condition,
				refurbDaysEstimate: assets.refurbDaysEstimate, // Feedback #2: Include refurb estimate for damaged items
				volume: assets.volume,
				weight: assets.weight,
				dimensionLength: assets.dimensionLength,
				dimensionWidth: assets.dimensionWidth,
				dimensionHeight: assets.dimensionHeight,
				brandId: brands.id,
				brandName: brands.name,
				brandLogoUrl: brands.logoUrl,
			})
			.from(assets)
			.leftJoin(
				brands,
				and(eq(assets.brand, brands.id), isNull(brands.deletedAt))
			)
			.where(and(...assetConditions))
			.orderBy(desc(assets.createdAt))
			.limit(type === 'all' ? Math.floor(limit / 2) : limit)
			.offset(type === 'all' ? Math.floor(offset / 2) : offset)

		items.push(
			...assetsResult.map(row => ({
				type: 'asset' as const,
				id: row.id,
				name: row.name,
				description: row.description,
				category: row.category,
				images: row.images,
				brand: row.brandId
					? {
							id: row.brandId,
							name: row.brandName!,
							logoUrl: row.brandLogoUrl,
						}
					: null,
				// Feedback #4: Availability now calculated dynamically
				// For catalog display without dates, show totalQuantity as placeholder
				availableQuantity: row.totalQuantity,
				totalQuantity: row.totalQuantity,
				condition: row.condition,
				refurbDaysEstimate: row.refurbDaysEstimate, // Feedback #2: Include refurb estimate for damaged items
				volume: row.volume,
				weight: row.weight,
				dimensionLength: row.dimensionLength,
				dimensionWidth: row.dimensionWidth,
				dimensionHeight: row.dimensionHeight,
			}))
		)
	}

	// Fetch collections if needed
	if (type === 'all' || type === 'collection') {
		const collectionConditions = [
			...getCompanyConditions(collections),
			isNull(collections.deletedAt),
		]

		if (brand) collectionConditions.push(eq(collections.brand, brand))
		if (category)
			collectionConditions.push(eq(collections.category, category))
		if (search)
			collectionConditions.push(ilike(collections.name, `%${search}%`))

		const collectionsResult = await db
			.select({
				id: collections.id,
				name: collections.name,
				description: collections.description,
				category: collections.category,
				images: collections.images,
				brandId: brands.id,
				brandName: brands.name,
				brandLogoUrl: brands.logoUrl,
				itemCount: sql<number>`(SELECT COUNT(*) FROM ${collectionItems} WHERE ${collectionItems.collection} = ${collections.id})`,
			})
			.from(collections)
			.leftJoin(
				brands,
				and(eq(collections.brand, brands.id), isNull(brands.deletedAt))
			)
			.where(and(...collectionConditions))
			.orderBy(desc(collections.createdAt))
			.limit(type === 'all' ? Math.floor(limit / 2) : limit)
			.offset(type === 'all' ? Math.floor(offset / 2) : offset)

		items.push(
			...collectionsResult.map(row => ({
				type: 'collection' as const,
				id: row.id,
				name: row.name,
				description: row.description,
				category: row.category,
				images: row.images,
				brand: row.brandId
					? {
							id: row.brandId,
							name: row.brandName!,
							logoUrl: row.brandLogoUrl,
						}
					: null,
				itemCount: row.itemCount,
			}))
		)
	}

	// Get total count (simplified - just return items.length for now)
	totalCount = items.length

	return {
		items,
		total: totalCount,
		limit,
		offset,
	}
}

// ========================================
// Catalog Asset Details
// ========================================

export async function getCatalogAssetDetails(
	assetId: string
): Promise<CatalogAssetDetails | null> {
	const asset = await db.query.assets.findFirst({
		where: and(eq(assets.id, assetId), isNull(assets.deletedAt)),
		with: {
			brand: {
				columns: {
					id: true,
					name: true,
					logoUrl: true,
				},
			},
		},
	})

	if (!asset) {
		return null
	}

	return {
		id: asset.id,
		name: asset.name,
		description: asset.description,
		category: asset.category,
		images: asset.images,
		brand: asset.brand
			? {
					id: asset.brand.id,
					name: asset.brand.name,
					logoUrl: asset.brand.logoUrl,
				}
			: null,
		// Feedback #4: Availability now calculated dynamically
		// For catalog display without dates, show totalQuantity as placeholder
		availableQuantity: asset.totalQuantity,
		totalQuantity: asset.totalQuantity,
		condition: asset.condition,
		refurbDaysEstimate: asset.refurbDaysEstimate, // Feedback #2: Include refurb estimate for damaged items
		volume: asset.volume,
		weight: asset.weight,
		dimensionLength: asset.dimensionLength,
		dimensionWidth: asset.dimensionWidth,
		dimensionHeight: asset.dimensionHeight,
		handlingTags: asset.handlingTags as any, // Type assertion for string[] to HandlingTag[]
	}
}

// ========================================
// Catalog Collection Preview
// ========================================

export async function getCatalogCollectionPreview(
	collectionId: string
): Promise<CatalogCollectionDetails | null> {
	const collection = await db.query.collections.findFirst({
		where: and(
			eq(collections.id, collectionId),
			isNull(collections.deletedAt)
		),
		with: {
			brand: {
				columns: {
					id: true,
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
							totalQuantity: true,
							condition: true,
							refurbDaysEstimate: true, // Feedback #2: Include refurb estimate for damaged items
							volume: true,
							weight: true,
							dimensionLength: true,
							dimensionWidth: true,
							dimensionHeight: true,
						},
					},
				},
			},
		},
	})

	if (!collection) {
		return null
	}

	// Calculate totals and check availability
	let totalVolume = 0
	let totalWeight = 0

	const items: CatalogCollectionItemDetail[] = collection.items.map(item => {
		const itemVolume = parseFloat(item.asset.volume) * item.defaultQuantity
		const itemWeight = parseFloat(item.asset.weight) * item.defaultQuantity

		totalVolume += itemVolume
		totalWeight += itemWeight

		// Feedback #4: Availability now calculated dynamically
		// For collection preview without dates, assume available if totalQuantity sufficient
		const isAvailable = item.asset.totalQuantity >= item.defaultQuantity

		return {
			id: item.asset.id,
			name: item.asset.name,
			category: item.asset.category,
			images: item.asset.images,
			defaultQuantity: item.defaultQuantity,
			// Feedback #4: Show totalQuantity as placeholder
			availableQuantity: item.asset.totalQuantity,
			totalQuantity: item.asset.totalQuantity,
			condition: item.asset.condition,
			refurbDaysEstimate: item.asset.refurbDaysEstimate, // Feedback #2: Include refurb estimate for damaged items
			volume: item.asset.volume,
			weight: item.asset.weight,
			dimensionLength: item.asset.dimensionLength,
			dimensionWidth: item.asset.dimensionWidth,
			dimensionHeight: item.asset.dimensionHeight,
			isAvailable,
		}
	})

	const isFullyAvailable = items.every(item => item.isAvailable)

	return {
		id: collection.id,
		name: collection.name,
		description: collection.description,
		category: collection.category,
		images: collection.images,
		brand: collection.brand
			? {
					id: collection.brand.id,
					name: collection.brand.name,
					logoUrl: collection.brand.logoUrl,
				}
			: null,
		items,
		totalVolume: totalVolume.toFixed(3),
		totalWeight: totalWeight.toFixed(2),
		isFullyAvailable,
	}
}
