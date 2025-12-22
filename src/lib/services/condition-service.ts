/**
 * Condition Management Service (Phase 12)
 * Business logic for asset condition tracking and maintenance workflows
 */

import 'server-only'
import { db } from '@/db'
import {
	assets,
	assetConditionHistory,
	companies,
	warehouses,
	zones,
	user,
} from '@/db/schema'
import { eq, and, or, desc, sql, isNull, inArray } from 'drizzle-orm'
import type {
	UpdateConditionRequest,
	UpdateConditionResponse,
	CompleteMaintenanceRequest,
	CompleteMaintenanceResponse,
	GetConditionHistoryResponse,
	ConditionHistoryEntry,
	ItemsNeedingAttentionParams,
	ItemsNeedingAttentionResponse,
	ItemNeedingAttention,
	AddMaintenanceNotesRequest,
	AddMaintenanceNotesResponse,
	FilterByConditionParams,
	FilterByConditionResponse,
	AssetWithCondition,
} from '@/types/condition'
import type { Condition, AssetStatus } from '@/types/asset'

/**
 * Update asset condition and create condition history record
 */
export async function updateAssetCondition(
	request: UpdateConditionRequest,
	userId: string
): Promise<UpdateConditionResponse> {
	const { assetId, condition, notes, photos = [], quantity } = request

	// Validate notes requirement
	if ((condition === 'ORANGE' || condition === 'RED') && !notes) {
		throw new Error(
			'Notes are required when marking items as Orange or Red'
		)
	}

	// Validate photos requirement
	if (condition === 'RED' && (!photos || photos.length === 0)) {
		throw new Error(
			'At least one damage photo is required when marking items as Red'
		)
	}

	// Fetch asset to check if it exists
	const asset = await db.query.assets.findFirst({
		where: eq(assets.id, assetId),
	})

	if (!asset) {
		throw new Error('Asset not found')
	}

	// Feedback #2: Items stay AVAILABLE regardless of condition
	// Status and condition are independent - clients make informed choices
	// Don't auto-change status based on condition

	// Update asset condition and refurb estimate in transaction
	await db.transaction(async tx => {
		// Prepare update data
		const updateData: any = {
			condition,
			updatedAt: new Date(),
		}

		// Feedback #2: Set refurb estimate for damaged items, clear for GREEN
		if (condition === 'GREEN') {
			updateData.refurbDaysEstimate = null // Clear refurb estimate when fixed
		} else if (request.refurbDaysEstimate) {
			updateData.refurbDaysEstimate = request.refurbDaysEstimate
		}

		// Update asset
		await tx.update(assets).set(updateData).where(eq(assets.id, assetId))

		// Create condition history record
		await tx.insert(assetConditionHistory).values({
			asset: assetId,
			condition,
			notes: notes || null,
			photos,
			updatedBy: userId,
			timestamp: new Date(),
		})
	})

	// Fetch updated asset and latest condition history
	const updatedAsset = await db.query.assets.findFirst({
		where: eq(assets.id, assetId),
	})

	const latestHistory = await db.query.assetConditionHistory.findFirst({
		where: eq(assetConditionHistory.asset, assetId),
		orderBy: [desc(assetConditionHistory.timestamp)],
	})

	if (!updatedAsset || !latestHistory) {
		throw new Error('Failed to fetch updated asset')
	}

	return {
		success: true,
		asset: {
			id: updatedAsset.id,
			condition: updatedAsset.condition,
			status: updatedAsset.status,
			updatedAt: updatedAsset.updatedAt.toISOString(),
		},
		conditionHistory: {
			id: latestHistory.id,
			condition: latestHistory.condition,
			notes: latestHistory.notes,
			photos: latestHistory.photos,
			updatedBy: latestHistory.updatedBy,
			timestamp: latestHistory.timestamp.toISOString(),
		},
	}
}

/**
 * Complete maintenance and mark asset as Green/Available
 */
export async function completeMaintenance(
	request: CompleteMaintenanceRequest,
	userId: string
): Promise<CompleteMaintenanceResponse> {
	const { assetId, maintenanceNotes } = request

	if (!maintenanceNotes || maintenanceNotes.trim().length === 0) {
		throw new Error('Maintenance notes are required')
	}

	// Fetch asset
	const asset = await db.query.assets.findFirst({
		where: eq(assets.id, assetId),
	})

	if (!asset) {
		throw new Error('Asset not found')
	}

	if (asset.condition !== 'RED') {
		throw new Error(
			'Only RED condition assets can have maintenance completed'
		)
	}

	// Update asset and create history in transaction
	await db.transaction(async tx => {
		// Update asset to Green and Available
		await tx
			.update(assets)
			.set({
				condition: 'GREEN',
				status: 'AVAILABLE',
				updatedAt: new Date(),
			})
			.where(eq(assets.id, assetId))

		// Move quantities from maintenance back to available
		if (asset.trackingMethod === 'BATCH') {
			const currentInMaintenance = asset.inMaintenanceQuantity || 0
			const currentAvailable = asset.availableQuantity || 0
			await tx
				.update(assets)
				.set({
					inMaintenanceQuantity: 0,
					availableQuantity: currentAvailable + currentInMaintenance,
				})
				.where(eq(assets.id, assetId))
		} else if (asset.trackingMethod === 'INDIVIDUAL') {
			const currentInMaintenance = asset.inMaintenanceQuantity || 0
			const currentAvailable = asset.availableQuantity || 0
			if (currentInMaintenance > 0) {
				await tx
					.update(assets)
					.set({
						inMaintenanceQuantity: currentInMaintenance - 1,
						availableQuantity: currentAvailable + 1,
					})
					.where(eq(assets.id, assetId))
			}
		}

		// Create condition history record
		await tx.insert(assetConditionHistory).values({
			asset: assetId,
			condition: 'GREEN',
			notes: maintenanceNotes,
			photos: [],
			updatedBy: userId,
			timestamp: new Date(),
		})
	})

	// Fetch updated asset and latest history
	const updatedAsset = await db.query.assets.findFirst({
		where: eq(assets.id, assetId),
	})

	const latestHistory = await db.query.assetConditionHistory.findFirst({
		where: eq(assetConditionHistory.asset, assetId),
		orderBy: [desc(assetConditionHistory.timestamp)],
	})

	if (!updatedAsset || !latestHistory) {
		throw new Error('Failed to fetch updated asset')
	}

	return {
		success: true,
		asset: {
			id: updatedAsset.id,
			condition: 'GREEN',
			status: 'AVAILABLE',
			updatedAt: updatedAsset.updatedAt.toISOString(),
		},
		conditionHistory: {
			id: latestHistory.id,
			condition: 'GREEN',
			notes: latestHistory.notes!,
			timestamp: latestHistory.timestamp.toISOString(),
		},
	}
}

/**
 * Get complete condition history for an asset
 */
export async function getConditionHistory(
	assetId: string
): Promise<GetConditionHistoryResponse> {
	// Fetch asset
	const asset = await db.query.assets.findFirst({
		where: eq(assets.id, assetId),
	})

	if (!asset) {
		throw new Error('Asset not found')
	}

	// Fetch condition history with user details
	const history = await db
		.select({
			id: assetConditionHistory.id,
			condition: assetConditionHistory.condition,
			notes: assetConditionHistory.notes,
			photos: assetConditionHistory.photos,
			timestamp: assetConditionHistory.timestamp,
			userId: user.id,
			userName: user.name,
			userEmail: user.email,
		})
		.from(assetConditionHistory)
		.innerJoin(user, eq(assetConditionHistory.updatedBy, user.id))
		.where(eq(assetConditionHistory.asset, assetId))
		.orderBy(desc(assetConditionHistory.timestamp))

	const historyEntries: ConditionHistoryEntry[] = history.map(entry => ({
		id: entry.id,
		condition: entry.condition as Condition,
		notes: entry.notes,
		photos: entry.photos,
		updatedBy: {
			id: entry.userId,
			name: entry.userName,
			email: entry.userEmail,
		},
		timestamp: entry.timestamp.toISOString(),
	}))

	return {
		success: true,
		assetId: asset.id,
		assetName: asset.name,
		currentCondition: asset.condition,
		history: historyEntries,
	}
}

/**
 * Get items needing attention (Red and Orange items)
 */
export async function getItemsNeedingAttention(
	params: ItemsNeedingAttentionParams
): Promise<ItemsNeedingAttentionResponse> {
	const {
		condition: conditionFilter,
		company: companyFilter,
		warehouse: warehouseFilter,
		zone: zoneFilter,
		page = 1,
		limit = 20,
	} = params

	const offset = (page - 1) * limit

	// Build where conditions
	const conditions = [
		or(eq(assets.condition, 'RED'), eq(assets.condition, 'ORANGE'))!,
	]

	if (conditionFilter) {
		conditions.push(eq(assets.condition, conditionFilter))
	}

	if (companyFilter) {
		conditions.push(eq(assets.company, companyFilter))
	}

	if (warehouseFilter) {
		conditions.push(eq(assets.warehouse, warehouseFilter))
	}

	if (zoneFilter) {
		conditions.push(eq(assets.zone, zoneFilter))
	}

	conditions.push(isNull(assets.deletedAt))

	// Fetch items with latest condition update
	const items = await db
		.select({
			assetId: assets.id,
			assetName: assets.name,
			qrCode: assets.qrCode,
			condition: assets.condition,
			status: assets.status,
			companyId: companies.id,
			companyName: companies.name,
			warehouseId: warehouses.id,
			warehouseName: warehouses.name,
			zoneId: zones.id,
			zoneName: zones.name,
			historyId: assetConditionHistory.id,
			historyNotes: assetConditionHistory.notes,
			historyPhotos: assetConditionHistory.photos,
			historyUpdatedBy: assetConditionHistory.updatedBy,
			historyTimestamp: assetConditionHistory.timestamp,
		})
		.from(assets)
		.innerJoin(companies, eq(assets.company, companies.id))
		.innerJoin(warehouses, eq(assets.warehouse, warehouses.id))
		.innerJoin(zones, eq(assets.zone, zones.id))
		.leftJoin(
			assetConditionHistory,
			eq(assets.id, assetConditionHistory.asset)
		)
		.where(and(...conditions))
		.orderBy(desc(assetConditionHistory.timestamp), desc(assets.updatedAt))
		.limit(limit)
		.offset(offset)

	// Get total count
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(assets)
		.where(and(...conditions))

	// Get summary counts
	const [redCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(assets)
		.where(and(eq(assets.condition, 'RED'), isNull(assets.deletedAt)))

	const [orangeCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(assets)
		.where(and(eq(assets.condition, 'ORANGE'), isNull(assets.deletedAt)))

	// Group items by asset (take most recent condition update)
	const itemsMap = new Map<string, ItemNeedingAttention>()
	items.forEach(item => {
		if (!itemsMap.has(item.assetId)) {
			itemsMap.set(item.assetId, {
				id: item.assetId,
				name: item.assetName,
				qrCode: item.qrCode,
				condition: item.condition as 'RED' | 'ORANGE',
				status: item.status as 'AVAILABLE' | 'IN_MAINTENANCE',
				company: {
					id: item.companyId,
					name: item.companyName,
				},
				warehouse: {
					id: item.warehouseId,
					name: item.warehouseName,
				},
				zone: {
					id: item.zoneId,
					name: item.zoneName,
				},
				lastConditionUpdate: {
					notes: item.historyNotes,
					photos: item.historyPhotos || [],
					updatedBy: item.historyUpdatedBy || '',
					timestamp: item.historyTimestamp
						? item.historyTimestamp.toISOString()
						: '',
				},
			})
		}
	})

	const totalPages = Math.ceil(count / limit)

	return {
		success: true,
		items: Array.from(itemsMap.values()),
		pagination: {
			total: count,
			page,
			limit,
			totalPages,
		},
		summary: {
			redCount: redCount.count,
			orangeCount: orangeCount.count,
		},
	}
}

/**
 * Add detailed maintenance notes without changing condition
 */
export async function addMaintenanceNotes(
	request: AddMaintenanceNotesRequest,
	userId: string
): Promise<AddMaintenanceNotesResponse> {
	const { assetId, notes } = request

	if (!notes || notes.trim().length === 0) {
		throw new Error('Notes are required')
	}

	// Fetch asset to get current condition
	const asset = await db.query.assets.findFirst({
		where: eq(assets.id, assetId),
	})

	if (!asset) {
		throw new Error('Asset not found')
	}

	// Create condition history record with current condition
	const [historyRecord] = await db
		.insert(assetConditionHistory)
		.values({
			asset: assetId,
			condition: asset.condition,
			notes,
			photos: [],
			updatedBy: userId,
			timestamp: new Date(),
		})
		.returning()

	return {
		success: true,
		conditionHistory: {
			id: historyRecord.id,
			condition: historyRecord.condition,
			notes: historyRecord.notes!,
			timestamp: historyRecord.timestamp.toISOString(),
		},
	}
}

/**
 * Filter assets by condition status
 */
export async function filterAssetsByCondition(
	params: FilterByConditionParams
): Promise<FilterByConditionResponse> {
	const {
		condition,
		company: companyFilter,
		warehouse: warehouseFilter,
		zone: zoneFilter,
		page = 1,
		limit = 20,
	} = params

	const offset = (page - 1) * limit

	// Build where conditions
	const conditions = [
		eq(assets.condition, condition),
		isNull(assets.deletedAt),
	]

	if (companyFilter) {
		conditions.push(eq(assets.company, companyFilter))
	}

	if (warehouseFilter) {
		conditions.push(eq(assets.warehouse, warehouseFilter))
	}

	if (zoneFilter) {
		conditions.push(eq(assets.zone, zoneFilter))
	}

	// Fetch assets with relations
	const assetsList = await db
		.select({
			assetId: assets.id,
			assetName: assets.name,
			qrCode: assets.qrCode,
			condition: assets.condition,
			status: assets.status,
			lastScannedAt: assets.lastScannedAt,
			lastScannedBy: assets.lastScannedBy,
			companyId: companies.id,
			companyName: companies.name,
			warehouseId: warehouses.id,
			warehouseName: warehouses.name,
			zoneId: zones.id,
			zoneName: zones.name,
		})
		.from(assets)
		.innerJoin(companies, eq(assets.company, companies.id))
		.innerJoin(warehouses, eq(assets.warehouse, warehouses.id))
		.innerJoin(zones, eq(assets.zone, zones.id))
		.where(and(...conditions))
		.orderBy(desc(assets.updatedAt))
		.limit(limit)
		.offset(offset)

	// Get total count
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(assets)
		.where(and(...conditions))

	const assetsWithCondition: AssetWithCondition[] = assetsList.map(item => ({
		id: item.assetId,
		name: item.assetName,
		qrCode: item.qrCode,
		condition: item.condition as Condition,
		status: item.status as AssetStatus,
		company: {
			id: item.companyId,
			name: item.companyName,
		},
		warehouse: {
			id: item.warehouseId,
			name: item.warehouseName,
		},
		zone: {
			id: item.zoneId,
			name: item.zoneName,
		},
		lastScannedAt: item.lastScannedAt
			? item.lastScannedAt.toISOString()
			: null,
		lastScannedBy: item.lastScannedBy,
	}))

	const totalPages = Math.ceil(count / limit)

	return {
		success: true,
		assets: assetsWithCondition,
		pagination: {
			total: count,
			page,
			limit,
			totalPages,
		},
	}
}
