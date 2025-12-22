/**
 * Asset Service - Business logic for asset management
 * Phase 3: Asset Management & QR Code Generation
 */

import { db } from '@/db'
import {
	assets,
	assetConditionHistory,
	companies,
	brands,
	warehouses,
	zones,
} from '@/db/schema/schema'
import { eq, and, isNull, sql, ilike, or, inArray } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import type {
	Asset,
	AssetWithDetails,
	CreateAssetRequest,
	UpdateAssetRequest,
	AssetListParams,
	AssetConditionHistoryEntry,
} from '@/types/asset'

/**
 * Generate unique QR code string
 * Format: ASSET-{companyCode}-{timestamp}-{random}
 */
export async function generateUniqueQRCode(companyId: string): Promise<string> {
	// Get company to extract a short code from name
	const company = await db.query.companies.findFirst({
		where: eq(companies.id, companyId),
	})

	const companyCode =
		company?.name
			.replace(/[^a-zA-Z0-9]/g, '')
			.substring(0, 3)
			.toUpperCase() || 'UNK'

	let qrCode: string
	let isUnique = false
	let attempts = 0
	const maxAttempts = 10

	// Ensure uniqueness with retry logic
	while (!isUnique && attempts < maxAttempts) {
		const timestamp = Date.now()
		const random = randomBytes(3).toString('hex').toUpperCase()
		qrCode = `ASSET-${companyCode}-${timestamp}-${random}`

		// Check if QR code already exists
		const existing = await db.query.assets.findFirst({
			where: eq(assets.qrCode, qrCode),
		})

		if (!existing) {
			isUnique = true
			return qrCode
		}

		attempts++
	}

	throw new Error('Failed to generate unique QR code after multiple attempts')
}

/**
 * Create new asset(s)
 * For INDIVIDUAL tracking with quantity > 1, creates N separate asset records
 * For BATCH tracking, creates 1 asset record with quantity field
 */
export async function createAsset(
	data: CreateAssetRequest,
	createdByUserId?: string
): Promise<{
	asset: Asset
	assetsCreated: number
}> {
	// Validate company, warehouse, zone exist
	const [companyExists, warehouseExists, zoneExists] = await Promise.all([
		db.query.companies.findFirst({ where: eq(companies.id, data.company) }),
		db.query.warehouses.findFirst({
			where: eq(warehouses.id, data.warehouse),
		}),
		db.query.zones.findFirst({ where: eq(zones.id, data.zone) }),
	])

	if (!companyExists) {
		throw new Error('Company not found')
	}
	if (!warehouseExists) {
		throw new Error('Warehouse not found')
	}
	if (!zoneExists) {
		throw new Error('Zone not found')
	}

	// Validate zone belongs to company
	if (zoneExists.company !== data.company) {
		throw new Error('Zone does not belong to the specified company')
	}

	// Validate brand if provided
	if (data.brand) {
		const brandExists = await db.query.brands.findFirst({
			where: eq(brands.id, data.brand),
		})
		if (!brandExists) {
			throw new Error('Brand not found')
		}
		if (brandExists.company !== data.company) {
			throw new Error('Brand does not belong to the specified company')
		}
	}

	// INDIVIDUAL tracking with quantity > 1: Create N separate assets
	if (data.trackingMethod === 'INDIVIDUAL' && data.totalQuantity > 1) {
		const createdAssets: Asset[] = []

		for (let i = 0; i < data.totalQuantity; i++) {
			// Generate unique QR code for each unit
			const qrCode = await generateUniqueQRCode(data.company)

			// Create individual asset with quantity=1
			const [asset] = await db
				.insert(assets)
				.values({
					company: data.company,
					brand: data.brand || null,
					warehouse: data.warehouse,
					zone: data.zone,
					name: `${data.name} #${i + 1}`, // Add unit number to name
					description: data.description || null,
					category: data.category,
					images: data.images,
					trackingMethod: 'INDIVIDUAL',
					totalQuantity: 1, // Each individual unit has quantity 1
					qrCode,
					packaging: null, // Individual items don't have packaging
					weight: data.weight.toString(),
					dimensionLength: data.dimensionLength.toString(),
					dimensionWidth: data.dimensionWidth.toString(),
					dimensionHeight: data.dimensionHeight.toString(),
					volume: data.volume.toString(),
					condition: data.condition || 'GREEN',
					status: 'AVAILABLE', // Feedback #2: Always AVAILABLE regardless of condition
					refurbDaysEstimate: data.refurbDaysEstimate || null, // Feedback #2: Refurb estimate
					handlingTags: data.handlingTags || [],
				})
				.returning()

			createdAssets.push(mapDbAssetToAsset(asset))

			// Feedback #2: Create initial condition history entry with notes if damaged
			if (
				data.conditionNotes &&
				(data.condition === 'ORANGE' || data.condition === 'RED') &&
				createdByUserId
			) {
				await db.insert(assetConditionHistory).values({
					asset: asset.id,
					condition: data.condition,
					notes: data.conditionNotes,
					photos: [],
					updatedBy: createdByUserId, // Use actual user ID
					timestamp: new Date(),
				})
			}
		}

		// Return first asset as primary, with count of all created
		return {
			asset: createdAssets[0],
			assetsCreated: createdAssets.length,
		}
	}

	// INDIVIDUAL tracking with quantity=1 OR BATCH tracking: Create single asset
	const qrCode = await generateUniqueQRCode(data.company)

	const [asset] = await db
		.insert(assets)
		.values({
			company: data.company,
			brand: data.brand || null,
			warehouse: data.warehouse,
			zone: data.zone,
			name: data.name,
			description: data.description || null,
			category: data.category,
			images: data.images,
			trackingMethod: data.trackingMethod,
			totalQuantity: data.totalQuantity,
			qrCode,
			packaging: data.packaging || null,
			weight: data.weight.toString(),
			dimensionLength: data.dimensionLength.toString(),
			dimensionWidth: data.dimensionWidth.toString(),
			dimensionHeight: data.dimensionHeight.toString(),
			volume: data.volume.toString(),
			condition: data.condition || 'GREEN',
			status: 'AVAILABLE', // Feedback #2: Always AVAILABLE regardless of condition
			refurbDaysEstimate: data.refurbDaysEstimate || null, // Feedback #2: Refurb estimate
			handlingTags: data.handlingTags || [],
		})
		.returning()

	// Feedback #2: Create initial condition history entry with notes if damaged
	if (
		data.conditionNotes &&
		(data.condition === 'ORANGE' || data.condition === 'RED') &&
		createdByUserId
	) {
		await db.insert(assetConditionHistory).values({
			asset: asset.id,
			condition: data.condition,
			notes: data.conditionNotes,
			photos: [],
			updatedBy: createdByUserId, // Use actual user ID
			timestamp: new Date(),
		})
	}

	return {
		asset: mapDbAssetToAsset(asset),
		assetsCreated: 1,
	}
}

/**
 * Get asset by ID with related details
 */
export async function getAssetById(
	assetId: string
): Promise<AssetWithDetails | null> {
	const asset = await db.query.assets.findFirst({
		where: and(eq(assets.id, assetId), isNull(assets.deletedAt)),
		with: {
			company: true,
			brand: true,
			warehouse: true,
			zone: true,
			conditionHistory: {
				orderBy: (history, { desc }) => [desc(history.timestamp)],
				limit: 1, // Get latest condition history entry
			},
		},
	})

	if (!asset) {
		return null
	}

	// Get latest condition notes from history
	const latestConditionNotes = asset.conditionHistory[0]?.notes || undefined

	return {
		...mapDbAssetToAsset(asset),
		latestConditionNotes, // Feedback #2: Include latest condition notes
		companyDetails: {
			id: asset.company.id,
			name: asset.company.name,
		},
		brandDetails: asset.brand
			? {
					id: asset.brand.id,
					name: asset.brand.name,
				}
			: undefined,
		warehouseDetails: {
			id: asset.warehouse.id,
			name: asset.warehouse.name,
			city: asset.warehouse.city,
		},
		zoneDetails: {
			id: asset.zone.id,
			name: asset.zone.name,
		},
		conditionHistory: asset.conditionHistory.map(
			mapDbConditionHistoryToConditionHistory
		),
	}
}

/**
 * List assets with filtering and pagination
 */
export async function listAssets(
	params: AssetListParams,
	companyScopeFilter?: string[] | null
): Promise<{ assets: Asset[]; total: number }> {
	const limit = params.limit || 50
	const offset = params.offset || 0

	// Build WHERE conditions
	const conditions = [isNull(assets.deletedAt)]

	// Company scope filtering (from user's companies array)
	if (companyScopeFilter !== null) {
		// companyScopeFilter is an array of company UUIDs, or null for wildcard "*"
		if (companyScopeFilter && companyScopeFilter.length > 0) {
			conditions.push(inArray(assets.company, companyScopeFilter))
		}
	}

	// Additional filters
	if (params.company) {
		conditions.push(eq(assets.company, params.company))
	}
	if (params.brand) {
		conditions.push(eq(assets.brand, params.brand))
	}
	if (params.warehouse) {
		conditions.push(eq(assets.warehouse, params.warehouse))
	}
	if (params.zone) {
		conditions.push(eq(assets.zone, params.zone))
	}
	if (params.category) {
		conditions.push(eq(assets.category, params.category))
	}
	if (params.condition) {
		conditions.push(eq(assets.condition, params.condition))
	}
	if (params.status) {
		conditions.push(eq(assets.status, params.status))
	}
	if (params.search) {
		conditions.push(ilike(assets.name, `%${params.search}%`))
	}

	const whereClause = and(...conditions)

	// Execute query with pagination
	const [assetsList, countResult] = await Promise.all([
		db.query.assets.findMany({
			where: whereClause,
			limit,
			offset,
			orderBy: (assets, { desc }) => [desc(assets.createdAt)],
		}),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(assets)
			.where(whereClause),
	])

	return {
		assets: assetsList.map(mapDbAssetToAsset),
		total: countResult[0]?.count || 0,
	}
}

/**
 * Update asset details
 */
export async function updateAsset(
	assetId: string,
	data: UpdateAssetRequest,
	updatedByUserId?: string
): Promise<Asset> {
	// Get existing asset
	const existing = await db.query.assets.findFirst({
		where: and(eq(assets.id, assetId), isNull(assets.deletedAt)),
	})

	if (!existing) {
		throw new Error('Asset not found')
	}

	// Validate zone belongs to asset's company if zone is being changed
	if (data.zone) {
		const zoneExists = await db.query.zones.findFirst({
			where: eq(zones.id, data.zone),
		})
		if (!zoneExists) {
			throw new Error('Zone not found')
		}
		if (zoneExists.company !== existing.company) {
			throw new Error("Zone does not belong to the asset's company")
		}
	}

	// Build update object
	const updateData: Record<string, unknown> = {}
	if (data.brand !== undefined) updateData.brand = data.brand
	if (data.warehouse !== undefined) updateData.warehouse = data.warehouse
	if (data.zone !== undefined) updateData.zone = data.zone
	if (data.name !== undefined) updateData.name = data.name
	if (data.description !== undefined)
		updateData.description = data.description
	if (data.category !== undefined) updateData.category = data.category
	if (data.images !== undefined) updateData.images = data.images
	if (data.totalQuantity !== undefined)
		updateData.totalQuantity = data.totalQuantity
	if (data.packaging !== undefined) updateData.packaging = data.packaging
	if (data.weight !== undefined) updateData.weight = data.weight.toString()
	if (data.dimensionLength !== undefined)
		updateData.dimensionLength = data.dimensionLength.toString()
	if (data.dimensionWidth !== undefined)
		updateData.dimensionWidth = data.dimensionWidth.toString()
	if (data.dimensionHeight !== undefined)
		updateData.dimensionHeight = data.dimensionHeight.toString()
	if (data.volume !== undefined) updateData.volume = data.volume.toString()
	if (data.handlingTags !== undefined)
		updateData.handlingTags = data.handlingTags

	// Feedback #2: Handle condition changes
	if (data.condition !== undefined) {
		updateData.condition = data.condition
		// Clear refurb estimate if changing to GREEN, otherwise update it
		if (data.condition === 'GREEN') {
			updateData.refurbDaysEstimate = null
		} else if (data.refurbDaysEstimate !== undefined) {
			updateData.refurbDaysEstimate = data.refurbDaysEstimate
		}
	}

	// Update asset
	const [updated] = await db
		.update(assets)
		.set(updateData)
		.where(eq(assets.id, assetId))
		.returning()

	// Feedback #2: Create condition history if condition changed
	if (
		data.condition !== undefined &&
		data.condition !== existing.condition &&
		updatedByUserId
	) {
		await db.insert(assetConditionHistory).values({
			asset: assetId,
			condition: data.condition,
			notes: data.conditionNotes || null,
			photos: [],
			updatedBy: updatedByUserId,
			timestamp: new Date(),
		})
	}

	return mapDbAssetToAsset(updated)
}

/**
 * Soft delete asset
 */
export async function deleteAsset(assetId: string): Promise<void> {
	const existing = await db.query.assets.findFirst({
		where: and(eq(assets.id, assetId), isNull(assets.deletedAt)),
	})

	if (!existing) {
		throw new Error('Asset not found')
	}

	// Check asset is not currently booked (Feedback #4: Check bookings table)
	const bookings = await db.query.assetBookings.findFirst({
		where: eq(assets.id, assetId),
	})

	if (bookings) {
		throw new Error('Cannot delete asset that has active bookings')
	}

	await db
		.update(assets)
		.set({ deletedAt: new Date() })
		.where(eq(assets.id, assetId))
}

/**
 * Map database asset record to Asset type
 */
function mapDbAssetToAsset(dbAsset: typeof assets.$inferSelect): Asset {
	return {
		id: dbAsset.id,
		company: dbAsset.company,
		brand: dbAsset.brand || undefined,
		warehouse: dbAsset.warehouse,
		zone: dbAsset.zone,
		name: dbAsset.name,
		description: dbAsset.description || undefined,
		category: dbAsset.category as Asset['category'],
		images: dbAsset.images,
		trackingMethod: dbAsset.trackingMethod as Asset['trackingMethod'],
		totalQuantity: dbAsset.totalQuantity,
		qrCode: dbAsset.qrCode,
		packaging: dbAsset.packaging || undefined,
		weight: parseFloat(dbAsset.weight),
		dimensionLength: parseFloat(dbAsset.dimensionLength),
		dimensionWidth: parseFloat(dbAsset.dimensionWidth),
		dimensionHeight: parseFloat(dbAsset.dimensionHeight),
		volume: parseFloat(dbAsset.volume),
		condition: dbAsset.condition as Asset['condition'],
		status: dbAsset.status as Asset['status'],
		refurbDaysEstimate: dbAsset.refurbDaysEstimate || undefined, // Feedback #2
		handlingTags: dbAsset.handlingTags,
		lastScannedAt: dbAsset.lastScannedAt?.toISOString(),
		lastScannedBy: dbAsset.lastScannedBy || undefined,
		deletedAt: dbAsset.deletedAt?.toISOString(),
		createdAt: dbAsset.createdAt.toISOString(),
		updatedAt: dbAsset.updatedAt.toISOString(),
	}
}

/**
 * Map database condition history record to AssetConditionHistoryEntry type
 */
function mapDbConditionHistoryToConditionHistory(
	dbHistory: typeof assetConditionHistory.$inferSelect
): AssetConditionHistoryEntry {
	return {
		id: dbHistory.id,
		asset: dbHistory.asset,
		condition:
			dbHistory.condition as AssetConditionHistoryEntry['condition'],
		notes: dbHistory.notes || undefined,
		photos: dbHistory.photos,
		updatedBy: dbHistory.updatedBy,
		timestamp: dbHistory.timestamp.toISOString(),
	}
}
