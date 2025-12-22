/**
 * Stateless Inbound Scan Progress API
 * GET /api/scanning/inbound/[orderId]/progress
 *
 * Calculates inbound scanning progress from scan_events table
 * No sessions needed - pure calculation from database
 */

import { NextRequest, NextResponse } from 'next/server'
import {
	requireAuth,
	errorResponse,
	successResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { orders, orderItems, scanEvents } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	const { orderId } = await params

	try {
		// Require authentication
		const authResult = await requireAuth()
		if (authResult instanceof Response) return authResult
		const { user } = authResult

		// Get order with items
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, orderId),
			with: {
				company: true,
				items: {
					with: {
						asset: true,
					},
				},
			},
		})

		if (!order) {
			return errorResponse('Order not found', 404)
		}

		// Check company access
		const hasAccess =
			user.companies.includes('*') ||
			user.companies.includes(order.company.id)

		if (!hasAccess) {
			return errorResponse('You do not have access to this order', 403)
		}

		// Get all inbound scan events for this order
		const inboundScans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.order, orderId),
				eq(scanEvents.scanType, 'INBOUND')
			),
		})

		// Calculate progress for each asset
		const assetsProgress = order.items.map(item => {
			// When using 'with: { asset: true }', item.asset becomes the full asset object
			const assetData: any = item.asset

			const scannedQuantity = inboundScans
				.filter(scan => scan.asset === assetData.id)
				.reduce((sum, scan) => sum + scan.quantity, 0)

			return {
				assetId: assetData.id,
				assetName: item.assetName,
				qrCode: assetData.qrCode,
				trackingMethod: assetData.trackingMethod,
				requiredQuantity: item.quantity,
				scannedQuantity,
				isComplete: scannedQuantity >= item.quantity,
			}
		})

		// Calculate overall progress
		const totalItems = order.items.reduce(
			(sum, item) => sum + item.quantity,
			0
		)
		const scannedItems = assetsProgress.reduce(
			(sum, asset) => sum + asset.scannedQuantity,
			0
		)
		const percentComplete =
			totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0

		return successResponse({
			orderId: order.orderId,
			orderStatus: order.status,
			totalItems,
			itemsScanned: scannedItems,
			percentComplete,
			assets: assetsProgress,
		})
	} catch (error: any) {
		console.error('Error getting inbound scan progress:', error)
		return errorResponse(
			error.message || 'Failed to get scan progress',
			500
		)
	}
}
