/**
 * GET /api/assets/:id/availability-stats
 * Get real-time availability statistics for an asset
 *
 * Calculates:
 * - Available quantity (not booked, not out, not in maintenance)
 * - Booked quantity (currently reserved for confirmed orders)
 * - Out quantity (currently out for delivery/in use)
 * - In maintenance quantity (items marked as RED condition)
 */

import { NextRequest } from 'next/server'
import {
	requireAuth,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { assets, assetBookings, orders, scanEvents } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { hasCompanyAccess } from '@/lib/auth/permissions'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requireAuth()
	if (authResult instanceof Response) return authResult
	const { user } = authResult

	try {
		const { id: assetId } = await params

		// Get asset
		const asset = await db.query.assets.findFirst({
			where: eq(assets.id, assetId),
		})

		if (!asset) {
			return errorResponse('Asset not found', 404)
		}

		// Check company access
		if (!hasCompanyAccess(user, asset.company)) {
			return errorResponse('You do not have access to this asset', 403)
		}

		const totalQuantity = asset.totalQuantity

		// 1. Calculate BOOKED quantity (from active bookings)
		// Get all bookings for this asset where order is CONFIRMED or later (but not CLOSED/DECLINED)
		const activeBookings = await db
			.select({
				quantity: assetBookings.quantity,
			})
			.from(assetBookings)
			.innerJoin(orders, eq(assetBookings.order, orders.id))
			.where(
				and(
					eq(assetBookings.asset, assetId),
					inArray(orders.status, [
						'CONFIRMED',
						'IN_PREPARATION',
						'READY_FOR_DELIVERY',
						'IN_TRANSIT',
						'DELIVERED',
						'IN_USE',
						'AWAITING_RETURN',
					])
				)
			)

		const bookedQuantity = activeBookings.reduce(
			(sum, booking) => sum + booking.quantity,
			0
		)

		// 2. Calculate OUT quantity (items currently out for delivery/in use)
		// Get all outbound scans that haven't been scanned back in yet
		const outboundScans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.asset, assetId),
				eq(scanEvents.scanType, 'OUTBOUND')
			),
		})

		const inboundScans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.asset, assetId),
				eq(scanEvents.scanType, 'INBOUND')
			),
		})

		const totalOutbound = outboundScans.reduce(
			(sum, scan) => sum + scan.quantity,
			0
		)
		const totalInbound = inboundScans.reduce(
			(sum, scan) => sum + scan.quantity,
			0
		)

		const outQuantity = Math.max(0, totalOutbound - totalInbound)

		// 3. Calculate IN_MAINTENANCE quantity (items with RED condition)
		// For INDIVIDUAL tracking: count assets with RED condition
		// For BATCH tracking: if condition is RED, entire batch is in maintenance
		let inMaintenanceQuantity = 0

		if (asset.condition === 'RED') {
			// For batch tracking or if the main asset is RED
			inMaintenanceQuantity = totalQuantity
		}
		// Note: For individual tracking, we'd need to query individual asset records
		// Since we removed the old quantity fields, we'll use a simplified approach:
		// If condition is RED, assume all units need maintenance

		// 4. Calculate AVAILABLE quantity
		// Available = Total - Booked - Out - InMaintenance
		const availableQuantity = Math.max(
			0,
			totalQuantity - bookedQuantity - outQuantity - inMaintenanceQuantity
		)

		return successResponse(
			{
				assetId,
				totalQuantity,
				availableQuantity,
				bookedQuantity,
				outQuantity,
				inMaintenanceQuantity,
				breakdown: {
					activeBookingsCount: activeBookings.length,
					outboundScansTotal: totalOutbound,
					inboundScansTotal: totalInbound,
				},
			},
			200
		)
	} catch (error) {
		console.error('Error getting asset availability stats:', error)
		return errorResponse(
			error instanceof Error
				? error.message
				: 'Failed to get availability stats',
			500
		)
	}
}
