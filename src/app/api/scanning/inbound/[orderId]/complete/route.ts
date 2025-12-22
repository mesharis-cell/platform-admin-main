/**
 * Stateless Inbound Scan Completion API
 * POST /api/scanning/inbound/[orderId]/complete
 *
 * Completes inbound scanning and closes the order
 * Validates all items scanned before allowing completion
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
import {
	createStatusHistoryEntry,
	releaseAssetsForOrder,
} from '@/lib/services/lifecycle-service'
import { sendNotification } from '@/lib/services/notification-service'

export async function POST(
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
				items: true,
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

		// Validate order status
		if (order.status !== 'AWAITING_RETURN') {
			return errorResponse(
				`Cannot complete inbound scan. Order status must be AWAITING_RETURN, current: ${order.status}`,
				400
			)
		}

		// Get all inbound scan events
		const inboundScans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.order, orderId),
				eq(scanEvents.scanType, 'INBOUND')
			),
		})

		// Validate all items scanned
		for (const item of order.items) {
			const scannedQuantity = inboundScans
				.filter(scan => scan.asset === item.asset)
				.reduce((sum, scan) => sum + scan.quantity, 0)

			if (scannedQuantity < item.quantity) {
				return errorResponse(
					`Cannot complete scan. ${item.assetName}: ${scannedQuantity}/${item.quantity} scanned`,
					400
				)
			}
		}

		// Release asset bookings (delete bookings to free up assets)
		console.log('🗑️ Releasing bookings after inbound scan completion...')
		await releaseAssetsForOrder(orderId)
		console.log('✅ Bookings released successfully')

		// Update order status to CLOSED
		await db
			.update(orders)
			.set({
				status: 'CLOSED',
				updatedAt: new Date(),
			})
			.where(eq(orders.id, orderId))

		// Create status history entry
		await createStatusHistoryEntry(
			orderId,
			'CLOSED',
			user.id,
			'Inbound scanning completed - all items returned and inspected'
		)

		// Send notification
		sendNotification('ORDER_CLOSED', orderId).catch(error => {
			console.error('Failed to send ORDER_CLOSED notification:', error)
		})

		return successResponse({
			message: 'Inbound scan completed successfully',
			orderId: order.orderId,
			newStatus: 'CLOSED',
		})
	} catch (error: any) {
		console.error('Error completing inbound scan:', error)
		return errorResponse(error.message || 'Failed to complete scan', 500)
	}
}
