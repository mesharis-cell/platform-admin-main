import { db } from '@/db'
import {
	orders,
	orderStatusHistory,
	pricingTiers,
	companies,
	orderItems,
} from '@/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { createBookingsForOrder } from './availability-service'

/**
 * Pricing Service
 * Business logic for pricing calculations and quote workflows
 * Phase 8: Pricing & Quoting System
 */

interface StandardPricingResult {
	pricingTierId: string | null
	a2BasePrice: number | null
	pmgMarginPercent: number
	pmgMarginAmount: number | null
	finalTotalPrice: number | null
	tierFound: boolean
}

interface OrderPricingDetails {
	order: {
		id: string
		orderId: string
		calculatedVolume: string
		venueCity: string | null
		venueCountry: string | null
		company: {
			id: string
			name: string
			pmgMarginPercent: string
		}
	}
	pricingTier: {
		id: string
		country: string
		city: string
		volumeMin: string
		volumeMax: string
		basePrice: string
	} | null
	standardPricing: StandardPricingResult
	currentPricing: {
		a2BasePrice: string | null
		a2AdjustedPrice: string | null
		a2AdjustmentReason: string | null
		a2AdjustedAt: Date | null
		a2AdjustedBy: { id: string; name: string } | null
		pmgMarginPercent: string | null
		pmgMarginAmount: string | null
		pmgReviewedAt: Date | null
		pmgReviewedBy: { id: string; name: string } | null
		pmgReviewNotes: string | null
		finalTotalPrice: string | null
		quoteSentAt: Date | null
	}
}

/**
 * Calculate standard pricing for an order based on pricing tier
 */
export async function calculateStandardPricing(
	orderId: string
): Promise<StandardPricingResult> {
	// Get order details
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
		with: {
			company: true,
		},
	})

	if (!order) {
		throw new Error('Order not found')
	}

	const volume = parseFloat(order.calculatedVolume)
	const venueCity = order.venueCity
	const venueCountry = order.venueCountry

	if (!venueCity || !venueCountry) {
		return {
			pricingTierId: null,
			a2BasePrice: null,
			pmgMarginPercent: parseFloat(order.company.pmgMarginPercent),
			pmgMarginAmount: null,
			finalTotalPrice: null,
			tierFound: false,
		}
	}

	// Find matching pricing tier (case-insensitive city match)
	const tier = await db.query.pricingTiers.findFirst({
		where: and(
			eq(sql`LOWER(${pricingTiers.country})`, venueCountry.toLowerCase()),
			eq(sql`LOWER(${pricingTiers.city})`, venueCity.toLowerCase()),
			lte(pricingTiers.volumeMin, volume.toString()),
			gte(pricingTiers.volumeMax, volume.toString()),
			eq(pricingTiers.isActive, true)
		),
	})

	if (!tier) {
		// Try wildcard city match
		const wildcardTier = await db.query.pricingTiers.findFirst({
			where: and(
				eq(
					sql`LOWER(${pricingTiers.country})`,
					venueCountry.toLowerCase()
				),
				eq(pricingTiers.city, '*'),
				lte(pricingTiers.volumeMin, volume.toString()),
				gte(pricingTiers.volumeMax, volume.toString()),
				eq(pricingTiers.isActive, true)
			),
		})

		if (!wildcardTier) {
			return {
				pricingTierId: null,
				a2BasePrice: null,
				pmgMarginPercent: parseFloat(order.company.pmgMarginPercent),
				pmgMarginAmount: null,
				finalTotalPrice: null,
				tierFound: false,
			}
		}

		// Use wildcard tier
		const a2BasePrice = parseFloat(wildcardTier.basePrice)
		const pmgMarginPercent = parseFloat(order.company.pmgMarginPercent)
		const pmgMarginAmount = a2BasePrice * (pmgMarginPercent / 100)
		const finalTotalPrice = a2BasePrice + pmgMarginAmount

		return {
			pricingTierId: wildcardTier.id,
			a2BasePrice: parseFloat(a2BasePrice.toFixed(2)),
			pmgMarginPercent: parseFloat(pmgMarginPercent.toFixed(2)),
			pmgMarginAmount: parseFloat(pmgMarginAmount.toFixed(2)),
			finalTotalPrice: parseFloat(finalTotalPrice.toFixed(2)),
			tierFound: true,
		}
	}

	// Calculate standard pricing
	const a2BasePrice = parseFloat(tier.basePrice)
	const pmgMarginPercent = parseFloat(order.company.pmgMarginPercent)
	const pmgMarginAmount = a2BasePrice * (pmgMarginPercent / 100)
	const finalTotalPrice = a2BasePrice + pmgMarginAmount

	return {
		pricingTierId: tier.id,
		a2BasePrice: parseFloat(a2BasePrice.toFixed(2)),
		pmgMarginPercent: parseFloat(pmgMarginPercent.toFixed(2)),
		pmgMarginAmount: parseFloat(pmgMarginAmount.toFixed(2)),
		finalTotalPrice: parseFloat(finalTotalPrice.toFixed(2)),
		tierFound: true,
	}
}

/**
 * Get detailed pricing information for order review
 */
export async function getOrderPricingDetails(
	orderId: string
): Promise<OrderPricingDetails> {
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
		with: {
			company: true,
			pricingTier: true,
			a2AdjustedByUser: true,
			pmgReviewedByUser: true,
		},
	})

	if (!order) {
		throw new Error('Order not found')
	}

	// Calculate standard pricing
	const standardPricing = await calculateStandardPricing(orderId)

	return {
		order: {
			id: order.id,
			orderId: order.orderId,
			calculatedVolume: order.calculatedVolume,
			venueCity: order.venueCity,
			venueCountry: order.venueCountry,
			company: {
				id: order.company.id,
				name: order.company.name,
				pmgMarginPercent: order.company.pmgMarginPercent,
			},
		},
		pricingTier: order.pricingTier
			? {
					id: order.pricingTier.id,
					country: order.pricingTier.country,
					city: order.pricingTier.city,
					volumeMin: order.pricingTier.volumeMin,
					volumeMax: order.pricingTier.volumeMax,
					basePrice: order.pricingTier.basePrice,
				}
			: null,
		standardPricing,
		currentPricing: {
			a2BasePrice: order.a2BasePrice,
			a2AdjustedPrice: order.a2AdjustedPrice,
			a2AdjustmentReason: order.a2AdjustmentReason,
			a2AdjustedAt: order.a2AdjustedAt,
			a2AdjustedBy: order.a2AdjustedByUser
				? {
						id: order.a2AdjustedByUser.id,
						name: order.a2AdjustedByUser.name,
					}
				: null,
			pmgMarginPercent: order.pmgMarginPercent,
			pmgMarginAmount: order.pmgMarginAmount,
			pmgReviewedAt: order.pmgReviewedAt,
			pmgReviewedBy: order.pmgReviewedByUser
				? {
						id: order.pmgReviewedByUser.id,
						name: order.pmgReviewedByUser.name,
					}
				: null,
			pmgReviewNotes: order.pmgReviewNotes,
			finalTotalPrice: order.finalTotalPrice,
			quoteSentAt: order.quoteSentAt,
		},
	}
}

/**
 * A2 approves standard pricing (skips PMG review)
 */
export async function a2ApproveStandardPricing(
	orderId: string,
	userId: string,
	notes?: string
): Promise<{
	a2BasePrice: number | null
	pmgMarginPercent: number
	pmgMarginAmount: number | null
	finalTotalPrice: number | null
}> {
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
	})

	if (!order) {
		throw new Error('Order not found')
	}

	if (order.status !== 'PRICING_REVIEW') {
		throw new Error('Order is not in PRICING_REVIEW status')
	}

	// Calculate standard pricing
	const standardPricing = await calculateStandardPricing(orderId)

	if (!standardPricing.tierFound) {
		throw new Error(
			'No pricing tier found for this order. Please adjust pricing manually.'
		)
	}

	// Update order with standard pricing
	await db
		.update(orders)
		.set({
			pricingTier: standardPricing.pricingTierId,
			a2BasePrice: standardPricing.a2BasePrice?.toString(),
			pmgMarginPercent: standardPricing.pmgMarginPercent.toString(),
			pmgMarginAmount: standardPricing.pmgMarginAmount?.toString(),
			finalTotalPrice: standardPricing.finalTotalPrice?.toString(),
			status: 'QUOTED',
			financialStatus: 'QUOTE_SENT', // Feedback #1: Update financial status
			quoteSentAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(orders.id, orderId))

	// Log status change
	await db.insert(orderStatusHistory).values({
		order: orderId,
		status: 'QUOTED',
		notes: notes || 'Standard pricing approved by A2',
		updatedBy: userId,
	})

	return {
		a2BasePrice: standardPricing.a2BasePrice,
		pmgMarginPercent: standardPricing.pmgMarginPercent,
		pmgMarginAmount: standardPricing.pmgMarginAmount,
		finalTotalPrice: standardPricing.finalTotalPrice,
	}
}

/**
 * A2 adjusts pricing (triggers PMG review)
 */
export async function a2AdjustPricing(
	orderId: string,
	userId: string,
	adjustedPrice: number,
	adjustmentReason: string
): Promise<void> {
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
	})

	if (!order) {
		throw new Error('Order not found')
	}

	if (order.status !== 'PRICING_REVIEW') {
		throw new Error('Order is not in PRICING_REVIEW status')
	}

	if (adjustedPrice <= 0) {
		throw new Error('Adjusted price must be greater than 0')
	}

	if (!adjustmentReason || adjustmentReason.length < 10) {
		throw new Error(
			'Adjustment reason is required and must be at least 10 characters'
		)
	}

	// Update order with adjusted pricing
	await db
		.update(orders)
		.set({
			a2AdjustedPrice: adjustedPrice.toString(),
			a2AdjustmentReason: adjustmentReason,
			a2AdjustedAt: new Date(),
			a2AdjustedBy: userId,
			status: 'PENDING_APPROVAL',
			updatedAt: new Date(),
		})
		.where(eq(orders.id, orderId))

	// Log status change
	await db.insert(orderStatusHistory).values({
		order: orderId,
		status: 'PENDING_APPROVAL',
		notes: `A2 adjusted pricing: ${adjustmentReason}`,
		updatedBy: userId,
	})
}

/**
 * PMG approves final pricing (after A2 adjustment)
 */
export async function pmgApprovePricing(
	orderId: string,
	userId: string,
	a2BasePrice: number,
	pmgMarginPercent: number,
	pmgReviewNotes?: string
): Promise<void> {
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
	})

	if (!order) {
		throw new Error('Order not found')
	}

	if (order.status !== 'PENDING_APPROVAL') {
		throw new Error('Order is not in PENDING_APPROVAL status')
	}

	if (a2BasePrice <= 0) {
		throw new Error('A2 base price must be greater than 0')
	}

	if (pmgMarginPercent < 0 || pmgMarginPercent > 100) {
		throw new Error('PMG margin percent must be between 0 and 100')
	}

	// Calculate PMG margin and final price
	const pmgMarginAmount = a2BasePrice * (pmgMarginPercent / 100)
	const finalTotalPrice = a2BasePrice + pmgMarginAmount

	// Update order with final pricing
	await db
		.update(orders)
		.set({
			a2BasePrice: a2BasePrice.toString(),
			pmgMarginPercent: pmgMarginPercent.toString(),
			pmgMarginAmount: parseFloat(pmgMarginAmount.toFixed(2)).toString(),
			finalTotalPrice: parseFloat(finalTotalPrice.toFixed(2)).toString(),
			pmgReviewedAt: new Date(),
			pmgReviewedBy: userId,
			pmgReviewNotes,
			status: 'QUOTED',
			financialStatus: 'QUOTE_SENT', // Feedback #1: Update financial status
			quoteSentAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(orders.id, orderId))

	// Log status change
	await db.insert(orderStatusHistory).values({
		order: orderId,
		status: 'QUOTED',
		notes: pmgReviewNotes || 'PMG approved adjusted pricing',
		updatedBy: userId,
	})
}

/**
 * Client approves quote
 */
export async function clientApproveQuote(
	orderId: string,
	userId: string,
	notes?: string
): Promise<void> {
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
	})

	if (!order) {
		throw new Error('Order not found')
	}

	if (order.status !== 'QUOTED') {
		throw new Error('Order is not in QUOTED status')
	}

	// CRITICAL: Create bookings BEFORE updating status (Feedback #4 & #5)
	// This reserves assets for the confirmed order with buffer days
	console.log(`🔒 Creating bookings for order ${orderId}...`)
	try {
		await createBookingsForOrder(orderId)
		console.log(`✅ Bookings created successfully for order ${orderId}`)
	} catch (error: any) {
		console.error(`❌ Failed to create bookings: ${error.message}`)
		throw new Error(`Cannot confirm order: ${error.message}`)
	}

	// Update order status to CONFIRMED (Feedback #1: Skip APPROVED)
	await db
		.update(orders)
		.set({
			status: 'CONFIRMED',
			financialStatus: 'QUOTE_ACCEPTED', // Feedback #1: Update financial status
			updatedAt: new Date(),
		})
		.where(eq(orders.id, orderId))

	// Log status change
	await db.insert(orderStatusHistory).values({
		order: orderId,
		status: 'CONFIRMED',
		notes: notes || 'Client approved quote',
		updatedBy: userId,
	})
}

/**
 * Client declines quote
 */
export async function clientDeclineQuote(
	orderId: string,
	userId: string,
	declineReason: string
): Promise<void> {
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
	})

	if (!order) {
		throw new Error('Order not found')
	}

	if (order.status !== 'QUOTED') {
		throw new Error('Order is not in QUOTED status')
	}

	if (!declineReason || declineReason.length < 10) {
		throw new Error(
			'Decline reason is required and must be at least 10 characters'
		)
	}

	// Update order status to DECLINED
	await db
		.update(orders)
		.set({
			status: 'DECLINED',
			updatedAt: new Date(),
		})
		.where(eq(orders.id, orderId))

	// Log status change
	await db.insert(orderStatusHistory).values({
		order: orderId,
		status: 'DECLINED',
		notes: `Client declined quote: ${declineReason}`,
		updatedBy: userId,
	})

	// Note: No bookings to release at QUOTED status
	// Bookings are only created when order reaches CONFIRMED
	// If order was already CONFIRMED and then declined, bookings would be released via lifecycle-service
}
