/**
 * Phase 11: Inventory Tracking Service Layer
 * Updated for Feedback #4 & #5: Date-based availability system
 *
 * Business logic for inventory management:
 * - Monitor real-time inventory availability
 * - Track asset status and location
 * - Asset reservation/release now handled by availability-service.ts
 */

import { db } from '@/db'
import { assets, companies, warehouses, zones, user } from '@/db/schema/schema'
import { eq, and, inArray } from 'drizzle-orm'
import type {
	InventoryAvailabilityParams,
	AssetAvailability,
	GetInventoryAvailabilityResponse,
} from '@/types/scanning'

// ============================================================
// Monitor Real-Time Inventory Availability
// Note: This shows current status, not date-based availability
// For date-based availability, use availability-service.ts
// ============================================================

export async function getInventoryAvailability(
	params: InventoryAvailabilityParams,
	userCompanies: string[]
): Promise<GetInventoryAvailabilityResponse> {
	// Build where conditions
	const conditions = []

	// Company scope filter
	if (!userCompanies.includes('*')) {
		conditions.push(inArray(assets.company, userCompanies))
	}

	// Additional filters
	if (params.company) {
		conditions.push(eq(assets.company, params.company))
	}

	if (params.warehouse) {
		conditions.push(eq(assets.warehouse, params.warehouse))
	}

	if (params.zone) {
		conditions.push(eq(assets.zone, params.zone))
	}

	if (params.status) {
		conditions.push(eq(assets.status, params.status))
	}

	// Fetch assets with joined details
	const assetsList = await db.query.assets.findMany({
		where: conditions.length > 0 ? and(...conditions) : undefined,
		with: {
			company: true,
			warehouse: true,
			zone: true,
			lastScannedByUser: true,
		},
	})

	// Map to response format
	// Note: Feedback #4 & #5 - quantity fields removed, use availability-service for date-based checks
	const assetsWithAvailability: AssetAvailability[] = assetsList.map(
		asset => ({
			assetId: asset.id,
			assetName: asset.name,
			company: {
				companyId: asset.company.id,
				companyName: asset.company.name,
			},
			warehouse: {
				warehouseId: asset.warehouse.id,
				warehouseName: asset.warehouse.name,
			},
			zone: {
				zoneId: asset.zone.id,
				zoneName: asset.zone.name,
			},
			trackingMethod: asset.trackingMethod,
			totalQuantity: asset.totalQuantity,
			availableQuantity: 0, // Deprecated - use availability-service for date-based availability
			bookedQuantity: 0, // Deprecated - use availability-service for date-based availability
			outQuantity: 0, // Deprecated - use availability-service for date-based availability
			inMaintenanceQuantity: 0, // Deprecated - use availability-service for date-based availability
			status: asset.status,
			lastScannedAt: asset.lastScannedAt,
			lastScannedBy: asset.lastScannedByUser
				? {
						userId: asset.lastScannedByUser.id,
						name: asset.lastScannedByUser.name,
					}
				: null,
		})
	)

	return {
		assets: assetsWithAvailability,
	}
}
