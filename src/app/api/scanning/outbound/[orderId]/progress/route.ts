/**
 * GET /api/scanning/outbound/:orderId/progress
 * Get scanning progress for an order (stateless - calculated from scan events)
 *
 * Auth: A2 Staff only
 * Phase 11: QR Code Tracking System
 */

import { NextRequest } from 'next/server'
import {
	requirePermission,
	errorResponse,
	successResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import {
	orders,
	orderItems,
	scanEvents,
	assets,
	user,
} from '@/db/schema/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	// Validate authentication and permission
	const authResult = await requirePermission('scanning:scan_out')
	if (authResult instanceof Response) return authResult

	try {
		const { orderId } = await params

		if (!orderId) {
			return errorResponse('orderId is required', 400)
		}

		// Fetch order
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, orderId),
		})

		if (!order) {
			return errorResponse('Order not found', 404)
		}

		// Fetch order items with asset details
		const items = await db.query.orderItems.findMany({
			where: eq(orderItems.order, orderId),
			with: {
				asset: true,
			},
		})

		if (items.length === 0) {
			return errorResponse('Order has no items', 400)
		}

		// Fetch existing scan events for this order (OUTBOUND only)
		const scans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.order, orderId),
				eq(scanEvents.scanType, 'OUTBOUND')
			),
		})

		// Calculate scanned quantities per asset
		const scannedQuantities = new Map<string, number>()
		for (const scan of scans) {
			const current = scannedQuantities.get(scan.asset) || 0
			scannedQuantities.set(scan.asset, current + scan.quantity)
		}

		// Build assets list with progress
		const assetsToScan = items.map(item => {
			const scannedQty = scannedQuantities.get(item.asset.id) || 0
			return {
				assetId: item.asset.id,
				assetName: item.asset.name,
				qrCode: item.asset.qrCode,
				trackingMethod: item.asset.trackingMethod,
				requiredQuantity: item.quantity,
				scannedQuantity: scannedQty,
				remainingQuantity: item.quantity - scannedQty,
			}
		})

		// Calculate totals
		const totalRequired = items.reduce(
			(sum, item) => sum + item.quantity,
			0
		)
		const totalScanned = Array.from(scannedQuantities.values()).reduce(
			(sum, qty) => sum + qty,
			0
		)
		const percentComplete =
			totalRequired > 0
				? Math.round((totalScanned / totalRequired) * 100)
				: 0

		return successResponse(
			{
				orderId: order.id,
				orderIdDisplay: order.orderId,
				status: order.status,
				totalItems: totalRequired,
				itemsScanned: totalScanned,
				percentComplete,
				assets: assetsToScan,
				canComplete: totalScanned >= totalRequired,
			},
			200
		)
	} catch (error) {
		console.error('Error getting scan progress:', error)
		return errorResponse(
			error instanceof Error
				? error.message
				: 'Failed to get scan progress',
			500
		)
	}
}
