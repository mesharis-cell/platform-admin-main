/**
 * POST /api/scanning/outbound/:orderId/scan
 * Record individual asset scan during outbound workflow (stateless)
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
import { orders, orderItems, scanEvents, assets } from '@/db/schema/schema'
import { eq, and, sql } from 'drizzle-orm'

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	// Validate authentication and permission
	const authResult = await requirePermission('scanning:scan_out')
	if (authResult instanceof Response) return authResult
	const { user } = authResult

	try {
		const { orderId } = await params
		const body = await request.json()
		const { qrCode, quantity } = body

		if (!orderId || !qrCode) {
			return errorResponse('orderId and qrCode are required', 400)
		}

		// Validate order exists and is in correct status
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, orderId),
		})

		if (!order) {
			return errorResponse('Order not found', 404)
		}

		if (order.status !== 'IN_PREPARATION') {
			return errorResponse(
				`Order must be in IN_PREPARATION status. Current status: ${order.status}`,
				400
			)
		}

		// Find asset by QR code
		const asset = await db.query.assets.findFirst({
			where: eq(assets.qrCode, qrCode),
		})

		if (!asset) {
			return errorResponse(`Asset not found with QR code: ${qrCode}`, 404)
		}

		// Verify asset is in this order
		const orderItem = await db.query.orderItems.findFirst({
			where: and(
				eq(orderItems.order, orderId),
				eq(orderItems.asset, asset.id)
			),
		})

		if (!orderItem) {
			return errorResponse('Asset is not in this order', 400)
		}

		// Determine quantity to scan
		let scanQuantity = quantity
		if (asset.trackingMethod === 'BATCH') {
			if (!quantity || quantity <= 0) {
				return errorResponse(
					'Quantity required for batch-tracked assets',
					400
				)
			}
		} else {
			// INDIVIDUAL tracking defaults to 1
			scanQuantity = 1
		}

		// Check how much has already been scanned
		const existingScans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.order, orderId),
				eq(scanEvents.asset, asset.id),
				eq(scanEvents.scanType, 'OUTBOUND')
			),
		})

		const scannedSoFar = existingScans.reduce(
			(sum, scan) => sum + scan.quantity,
			0
		)

		if (scannedSoFar >= orderItem.quantity) {
			return errorResponse(
				'All units of this asset have already been scanned',
				400
			)
		}

		// Validate not scanning more than required
		if (scannedSoFar + scanQuantity > orderItem.quantity) {
			return errorResponse(
				`Cannot scan more than required quantity. Required: ${orderItem.quantity}, Already scanned: ${scannedSoFar}`,
				400
			)
		}

		// Create scan event record
		await db.insert(scanEvents).values({
			order: orderId,
			asset: asset.id,
			scanType: 'OUTBOUND',
			quantity: scanQuantity,
			condition: 'GREEN', // Default condition for outbound
			notes: null,
			photos: [],
			discrepancyReason: null,
			scannedBy: user.id,
		})

		// Update asset quantities
		await db
			.update(assets)
			.set({
				outQuantity: sql`${assets.outQuantity} + ${scanQuantity}`,
				bookedQuantity: sql`${assets.bookedQuantity} - ${scanQuantity}`,
				availableQuantity: sql`${assets.totalQuantity} - (${assets.bookedQuantity} - ${scanQuantity}) - (${assets.outQuantity} + ${scanQuantity}) - ${assets.inMaintenanceQuantity}`,
				lastScannedAt: new Date(),
				lastScannedBy: user.id,
			})
			.where(eq(assets.id, asset.id))

		// Calculate new progress
		const newScannedTotal = scannedSoFar + scanQuantity
		const allScans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.order, orderId),
				eq(scanEvents.scanType, 'OUTBOUND')
			),
		})

		const totalScanned = allScans.reduce(
			(sum, scan) => sum + scan.quantity,
			0
		)
		const allItems = await db.query.orderItems.findMany({
			where: eq(orderItems.order, orderId),
		})
		const totalRequired = allItems.reduce(
			(sum, item) => sum + item.quantity,
			0
		)

		return successResponse(
			{
				success: true,
				asset: {
					assetId: asset.id,
					assetName: asset.name,
					trackingMethod: asset.trackingMethod,
					scannedQuantity: newScannedTotal,
					requiredQuantity: orderItem.quantity,
					remainingQuantity: orderItem.quantity - newScannedTotal,
				},
				progress: {
					totalItems: totalRequired,
					itemsScanned: totalScanned,
					percentComplete: Math.round(
						(totalScanned / totalRequired) * 100
					),
				},
			},
			200
		)
	} catch (error) {
		console.error('Error scanning outbound item:', error)
		return errorResponse(
			error instanceof Error
				? error.message
				: 'Failed to scan outbound item',
			500
		)
	}
}
