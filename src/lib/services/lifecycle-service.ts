/**
 * Order Lifecycle Management Service (Phase 10)
 * Handles order status transitions, state machine validation, and automated transitions
 * Updated for Feedback #4 & #5: Date-based booking system
 */

import { db } from '@/db'
import { user, orders, orderStatusHistory } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
	createBookingsForOrder,
	releaseBookingsForOrder,
} from './availability-service'
import 'server-only'

/**
 * Get system user ID for automated transitions
 * Returns the fixed system user ID or creates one if not found
 */
export async function getSystemUserId(): Promise<string> {
	const systemEmail = 'system@system.internal'

	const systemUser = await db.query.user.findFirst({
		where: eq(user.email, systemEmail),
	})

	if (!systemUser) {
		throw new Error('System user not found. Please run database seeding.')
	}

	return systemUser.id
}

/**
 * Order Status State Machine - Fulfillment lifecycle only (Feedback #1)
 * Financial status progresses independently via financialStatus field
 */
export const VALID_STATE_TRANSITIONS: Record<string, string[]> = {
	DRAFT: ['SUBMITTED'],
	SUBMITTED: ['PRICING_REVIEW'],
	PRICING_REVIEW: ['QUOTED', 'PENDING_APPROVAL'],
	PENDING_APPROVAL: ['QUOTED'],
	QUOTED: ['CONFIRMED', 'DECLINED'], // Feedback #1: Skip APPROVED, go direct to CONFIRMED
	DECLINED: [], // Terminal state
	CONFIRMED: ['IN_PREPARATION'],
	IN_PREPARATION: ['READY_FOR_DELIVERY'],
	READY_FOR_DELIVERY: ['IN_TRANSIT'],
	IN_TRANSIT: ['DELIVERED'],
	DELIVERED: ['IN_USE'],
	IN_USE: ['AWAITING_RETURN'],
	AWAITING_RETURN: ['CLOSED'],
	CLOSED: [], // Terminal state
}

/**
 * Financial Status State Machine - Independent financial tracking (Feedback #1)
 */
export const VALID_FINANCIAL_TRANSITIONS: Record<string, string[]> = {
	PENDING_QUOTE: ['QUOTE_SENT'],
	QUOTE_SENT: ['QUOTE_ACCEPTED', 'PENDING_QUOTE'], // Can go back if declined and resubmitted
	QUOTE_ACCEPTED: ['PENDING_INVOICE'],
	PENDING_INVOICE: ['INVOICED'],
	INVOICED: ['PAID'],
	PAID: [], // Terminal state
}

/**
 * Validate if a status transition is allowed
 */
export function isValidTransition(
	fromStatus: string,
	toStatus: string
): boolean {
	const allowedTransitions = VALID_STATE_TRANSITIONS[fromStatus]
	return allowedTransitions ? allowedTransitions.includes(toStatus) : false
}

/**
 * Reserve assets when order transitions to CONFIRMED
 * Feedback #4 & #5: Creates date-based bookings with buffer days
 */
export async function reserveAssetsForOrder(orderId: string): Promise<void> {
	await createBookingsForOrder(orderId)
}

/**
 * Release assets when order transitions to CLOSED or DECLINED
 * Feedback #4 & #5: Deletes date-based bookings
 */
export async function releaseAssetsForOrder(orderId: string): Promise<void> {
	await releaseBookingsForOrder(orderId)
}

/**
 * Get notification type for status transition
 * Returns the notification type that should be sent for this transition
 */
export function getNotificationTypeForTransition(
	fromStatus: string,
	toStatus: string
): string | null {
	// Map status transitions to notification types (Updated for Feedback #1)
	const transitionMap: Record<string, string> = {
		'DRAFT->SUBMITTED': 'ORDER_SUBMITTED',
		'SUBMITTED->PRICING_REVIEW': '', // No notification needed
		'PRICING_REVIEW->QUOTED': 'QUOTE_SENT', // A2 approved standard pricing, goes direct to client
		'PRICING_REVIEW->PENDING_APPROVAL': 'A2_ADJUSTED_PRICING', // A2 adjusted price, needs PMG review
		'PENDING_APPROVAL->QUOTED': 'QUOTE_SENT', // PMG approved, send to client
		'QUOTED->CONFIRMED': 'QUOTE_APPROVED', // Feedback #1: Direct to CONFIRMED
		'QUOTED->DECLINED': 'QUOTE_DECLINED',
		'CONFIRMED->IN_PREPARATION': 'ORDER_CONFIRMED', // Feedback #1: Replaces old PAID->CONFIRMED
		'IN_PREPARATION->READY_FOR_DELIVERY': 'READY_FOR_DELIVERY',
		'READY_FOR_DELIVERY->IN_TRANSIT': 'IN_TRANSIT',
		'IN_TRANSIT->DELIVERED': 'DELIVERED',
		'DELIVERED->IN_USE': '', // No notification needed
		'IN_USE->AWAITING_RETURN': '', // No notification needed (PICKUP_REMINDER sent via cron 48h before)
		'AWAITING_RETURN->CLOSED': 'ORDER_CLOSED',
	}

	const key = `${fromStatus}->${toStatus}`
	const notificationType = transitionMap[key]

	// Return null if empty string (no notification) or undefined (not in map)
	return notificationType && notificationType !== '' ? notificationType : null
}

/**
 * Validate if a financial status transition is allowed (Feedback #1)
 */
export function isValidFinancialTransition(
	fromStatus: string,
	toStatus: string
): boolean {
	const allowedTransitions = VALID_FINANCIAL_TRANSITIONS[fromStatus]
	return allowedTransitions ? allowedTransitions.includes(toStatus) : false
}

/**
 * Create status history entry
 */
export async function createStatusHistoryEntry(
	orderId: string,
	status: string,
	updatedBy: string,
	notes?: string
): Promise<void> {
	await db.insert(orderStatusHistory).values({
		order: orderId,
		status: status as any, // Type cast to enum
		notes: notes || null,
		updatedBy,
	})
}
