/**
 * Phase 10: Order Status Progression API Route
 * POST /api/orders/[id]/status
 *
 * Progress order to next state with validation and status history logging
 */

import { NextRequest, NextResponse } from 'next/server'
import {
	requireAuth,
	requirePermission,
	errorResponse,
	successResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { orders, orderStatusHistory, orderItems, scanEvents } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import {
	isValidTransition,
	createStatusHistoryEntry,
	reserveAssetsForOrder,
	releaseAssetsForOrder,
	getNotificationTypeForTransition,
} from '@/lib/services/lifecycle-service'
import { sendNotification } from '@/lib/services/notification-service'

interface ProgressStatusRequest {
	newStatus: string
	notes?: string
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params

	try {
		// Require authentication
		const authResult = await requireAuth()
		if (authResult instanceof Response) return authResult
		const { user } = authResult

		// Get request body
		const body: ProgressStatusRequest = await request.json()
		const { newStatus, notes } = body

		if (!newStatus) {
			return errorResponse('newStatus is required', 400)
		}

		// Get order
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, id),
			with: {
				company: true,
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

		// Validate state transition
		const currentStatus = order.status
		if (!isValidTransition(currentStatus, newStatus)) {
			return errorResponse(
				`Invalid state transition from ${currentStatus} to ${newStatus}`,
				400
			)
		}

		// Check role-based transition permissions
		const hasPermission = await validateRoleBasedTransition(
			user,
			currentStatus,
			newStatus
		)
		if (!hasPermission) {
			return errorResponse(
				`You do not have permission to transition from ${currentStatus} to ${newStatus}`,
				403
			)
		}

		// Handle special side effects based on transitions
		if (newStatus === 'CONFIRMED') {
			// Reserve assets
			try {
				await reserveAssetsForOrder(id)
			} catch (error: any) {
				return errorResponse(
					`Cannot confirm order: ${error.message}`,
					400
				)
			}
		}

		if (newStatus === 'CLOSED') {
			// Validate that all items have been scanned in (inbound)
			const allItemsScanned = await validateInboundScanningComplete(id)

			if (!allItemsScanned) {
				return errorResponse(
					'Cannot close order: Inbound scanning is not complete. All items must be scanned in before closing the order.',
					400
				)
			}

			// Release assets
			await releaseAssetsForOrder(id)
		}

		// Update order status
		await db
			.update(orders)
			.set({
				status: newStatus as any,
				updatedAt: new Date(),
			})
			.where(eq(orders.id, id))

		// Create status history entry
		await createStatusHistoryEntry(id, newStatus, user.id, notes)

		// Get updated order
		const updatedOrder = await db.query.orders.findFirst({
			where: eq(orders.id, id),
		})

		// Trigger notification if applicable
		const notificationType = getNotificationTypeForTransition(
			currentStatus,
			newStatus
		)
		if (notificationType) {
			// Send notification asynchronously (don't block response)
			sendNotification(notificationType as any, id).catch(error => {
				console.error('Failed to send notification:', error)
			})
		}

		return successResponse(
			{
				order: updatedOrder,
				message: `Order status updated to ${newStatus}`,
			},
			200
		)
	} catch (error: any) {
		console.error('Error progressing order status:', error)
		return errorResponse(
			error.message || 'Failed to progress order status',
			500
		)
	}
}

/**
 * Validate if user has permission for specific transition based on role
 */
async function validateRoleBasedTransition(
	user: any,
	fromStatus: string,
	toStatus: string
): Promise<boolean> {
	// PMG Admin can force any valid transition
	if (user.permissionTemplate === 'PMG_ADMIN') {
		return true
	}

	// Client User can only approve/decline quotes (Feedback #1: APPROVED removed, goes directly to CONFIRMED)
	if (user.permissionTemplate === 'CLIENT_USER') {
		if (
			fromStatus === 'QUOTED' &&
			(toStatus === 'CONFIRMED' || toStatus === 'DECLINED')
		) {
			return true
		}
		return false
	}

	// A2 Staff can progress fulfillment stages
	if (user.permissionTemplate === 'A2_STAFF') {
		const allowedA2Transitions = [
			'CONFIRMED->IN_PREPARATION',
			'IN_PREPARATION->READY_FOR_DELIVERY',
			'READY_FOR_DELIVERY->IN_TRANSIT',
			'IN_TRANSIT->DELIVERED',
			'AWAITING_RETURN->CLOSED',
		]

		const transitionKey = `${fromStatus}->${toStatus}`
		return allowedA2Transitions.includes(transitionKey)
	}

	return false
}

/**
 * Validate that all order items have been scanned in (inbound)
 * Returns true if all items scanned, false otherwise
 */
async function validateInboundScanningComplete(
	orderId: string
): Promise<boolean> {
	// Get all order items
	const items = await db.query.orderItems.findMany({
		where: eq(orderItems.order, orderId),
	})

	if (items.length === 0) {
		return true // No items to scan
	}

	// Get all inbound scan events for this order
	const inboundScans = await db.query.scanEvents.findMany({
		where: and(
			eq(scanEvents.order, orderId),
			eq(scanEvents.scanType, 'INBOUND')
		),
	})

	// Check if each item has been fully scanned in
	for (const item of items) {
		const scannedQuantity = inboundScans
			.filter(scan => scan.asset === item.asset)
			.reduce((sum, scan) => sum + scan.quantity, 0)

		if (scannedQuantity < item.quantity) {
			console.log(
				`❌ Item ${item.assetName} not fully scanned: ${scannedQuantity}/${item.quantity}`
			)
			return false
		}
	}

	console.log(`✅ All items scanned in for order ${orderId}`)
	return true
}
