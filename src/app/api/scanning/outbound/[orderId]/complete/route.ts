/**
 * POST /api/scanning/outbound/:orderId/complete
 * Complete outbound scanning and update order status (stateless)
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
	orderStatusHistory,
} from '@/db/schema/schema'
import { eq, and } from 'drizzle-orm'
import { sendNotification } from '@/lib/services/notification-service'

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

		if (!orderId) {
			return errorResponse('orderId is required', 400)
		}

		// Validate order exists
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

		// Verify all items have been scanned
		const items = await db.query.orderItems.findMany({
			where: eq(orderItems.order, orderId),
		})

		const totalRequired = items.reduce(
			(sum, item) => sum + item.quantity,
			0
		)

		const scans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.order, orderId),
				eq(scanEvents.scanType, 'OUTBOUND')
			),
		})

		const totalScanned = scans.reduce((sum, scan) => sum + scan.quantity, 0)

		if (totalScanned < totalRequired) {
			return errorResponse(
				`Not all items scanned. Scanned: ${totalScanned}, Required: ${totalRequired}`,
				400
			)
		}

		// Update order status: IN_PREPARATION → READY_FOR_DELIVERY
		await db
			.update(orders)
			.set({ status: 'READY_FOR_DELIVERY' })
			.where(eq(orders.id, orderId))

		// Log status change
		await db.insert(orderStatusHistory).values({
			order: orderId,
			status: 'READY_FOR_DELIVERY',
			notes: 'All items scanned out and ready for delivery',
			updatedBy: user.id,
		})

		// Trigger notification to PMG
		await sendNotification('READY_FOR_DELIVERY', orderId)

		return successResponse(
			{
				success: true,
				orderId,
				newStatus: 'READY_FOR_DELIVERY',
				totalItemsScanned: totalScanned,
				truckPhotosUploaded: order.truckPhotos.length,
			},
			200
		)
	} catch (error) {
		console.error('Error completing outbound scan:', error)
		return errorResponse(
			error instanceof Error
				? error.message
				: 'Failed to complete outbound scan',
			500
		)
	}
}
