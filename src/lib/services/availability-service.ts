/**
 * Availability Service - Date-based asset booking system
 * Feedback #4 & #5: Implements date-range checking with buffer days
 *
 * Buffer Constants:
 * - 5 days before event start (prep/delivery buffer)
 * - 3 days after event end (return/inspection buffer)
 * - Additional refurb days for damaged items (if applicable)
 */

import { db } from '@/db'
import { assets, assetBookings, orders } from '@/db/schema/schema'
import { eq, and, or, sql, gte, lte } from 'drizzle-orm'
import { subDays, addDays, parseISO, format } from 'date-fns'

// Buffer constants (Feedback #5)
export const PREP_BUFFER_DAYS = 5
export const RETURN_BUFFER_DAYS = 3

/**
 * Calculate blocked period for an order including all buffers
 * Feedback #5: Adds 5-day prep + 3-day return buffers
 * Feedback #2: Adds refurb days if item needs refurbishment
 */
export function calculateBlockedPeriod(
	eventStartDate: Date,
	eventEndDate: Date,
	refurbDays: number = 0
): { blockedFrom: Date; blockedUntil: Date } {
	// Total prep time = prep buffer + refurb time
	const totalPrepDays = PREP_BUFFER_DAYS + refurbDays

	const blockedFrom = subDays(eventStartDate, totalPrepDays)
	const blockedUntil = addDays(eventEndDate, RETURN_BUFFER_DAYS)

	return { blockedFrom, blockedUntil }
}

/**
 * Check if two date ranges overlap
 */
export function dateRangesOverlap(
	start1: Date,
	end1: Date,
	start2: Date,
	end2: Date
): boolean {
	return start1 <= end2 && end1 >= start2
}

/**
 * Get available quantity for an asset during a specific date range
 * Feedback #4: Date-based availability checking
 */
export async function getAssetAvailability(
	assetId: string,
	startDate: Date,
	endDate: Date
): Promise<{
	totalQuantity: number
	availableQuantity: number
	bookedQuantity: number
	bookings: Array<{
		orderId: string
		quantity: number
		blockedFrom: Date
		blockedUntil: Date
	}>
}> {
	// Get asset
	const asset = await db.query.assets.findFirst({
		where: eq(assets.id, assetId),
	})

	if (!asset) {
		throw new Error('Asset not found')
	}

	// Get overlapping bookings
	const overlappingBookings = await db.query.assetBookings.findMany({
		where: and(
			eq(assetBookings.asset, assetId),
			// Date overlap: booking.blockedFrom <= endDate AND booking.blockedUntil >= startDate
			sql`${assetBookings.blockedFrom} <= ${endDate}`,
			sql`${assetBookings.blockedUntil} >= ${startDate}`
		),
		with: {
			order: {
				columns: {
					id: true,
					orderId: true,
				},
			},
		},
	})

	// Calculate total booked quantity during this period
	const bookedQuantity = overlappingBookings.reduce(
		(sum, booking) => sum + booking.quantity,
		0
	)

	const availableQuantity = asset.totalQuantity - bookedQuantity

	return {
		totalQuantity: asset.totalQuantity,
		availableQuantity: Math.max(0, availableQuantity),
		bookedQuantity,
		bookings: overlappingBookings.map(b => ({
			orderId: b.order.orderId,
			quantity: b.quantity,
			blockedFrom: b.blockedFrom,
			blockedUntil: b.blockedUntil,
		})),
	}
}

/**
 * Check availability for multiple assets at once
 * Used during order creation to validate all items
 * CRITICAL: Checks availability for BLOCKED period (with buffers), not just event dates
 */
export async function checkMultipleAssetsAvailability(
	items: Array<{
		assetId: string
		quantity: number
	}>,
	eventStartDate: Date,
	eventEndDate: Date
): Promise<{
	allAvailable: boolean
	unavailableItems: Array<{
		assetId: string
		assetName: string
		requested: number
		available: number
		nextAvailableDate?: Date
	}>
}> {
	const unavailableItems: Array<{
		assetId: string
		assetName: string
		requested: number
		available: number
		nextAvailableDate?: Date
	}> = []

	for (const item of items) {
		console.log(
			`🔍 Checking availability for asset: ${item.assetId}, quantity: ${item.quantity}`
		)

		// Get asset to check refurb days
		const asset = await db.query.assets.findFirst({
			where: eq(assets.id, item.assetId),
			columns: { name: true, refurbDaysEstimate: true },
		})

		if (!asset) {
			console.log(`❌ Asset not found: ${item.assetId}`)
			unavailableItems.push({
				assetId: item.assetId,
				assetName: 'Unknown',
				requested: item.quantity,
				available: 0,
			})
			continue
		}

		console.log(
			`📦 Asset found: ${asset.name}, refurb days: ${asset.refurbDaysEstimate || 0}`
		)

		// CRITICAL FIX: Calculate blocked period WITH buffers
		const refurbDays = asset.refurbDaysEstimate || 0
		const { blockedFrom, blockedUntil } = calculateBlockedPeriod(
			eventStartDate,
			eventEndDate,
			refurbDays
		)

		console.log(
			`📅 Blocked period: ${blockedFrom.toISOString()} to ${blockedUntil.toISOString()}`
		)

		// Check availability for the BLOCKED period (not just event dates)
		const availability = await getAssetAvailability(
			item.assetId,
			blockedFrom,
			blockedUntil
		)

		console.log(`📊 Availability result:`, {
			totalQuantity: availability.totalQuantity,
			availableQuantity: availability.availableQuantity,
			bookedQuantity: availability.bookedQuantity,
			bookingsCount: availability.bookings.length,
		})

		if (availability.availableQuantity < item.quantity) {
			console.log(
				`❌ Insufficient availability: requested ${item.quantity}, available ${availability.availableQuantity}`
			)

			// Find next available date (when current bookings end)
			const nextAvailableDate =
				availability.bookings.length > 0
					? addDays(
							new Date(
								Math.max(
									...availability.bookings.map(b =>
										b.blockedUntil.getTime()
									)
								)
							),
							1
						)
					: undefined

			unavailableItems.push({
				assetId: item.assetId,
				assetName: asset.name,
				requested: item.quantity,
				available: availability.availableQuantity,
				nextAvailableDate,
			})
		} else {
			console.log(
				`✅ Sufficient availability: requested ${item.quantity}, available ${availability.availableQuantity}`
			)
		}
	}

	return {
		allAvailable: unavailableItems.length === 0,
		unavailableItems,
	}
}

/**
 * Create booking for an order
 * Called when order transitions to CONFIRMED
 */
export async function createBooking(
	assetId: string,
	orderId: string,
	quantity: number,
	eventStartDate: Date,
	eventEndDate: Date,
	refurbDays: number = 0
): Promise<void> {
	// Calculate blocked period with buffers
	const { blockedFrom, blockedUntil } = calculateBlockedPeriod(
		eventStartDate,
		eventEndDate,
		refurbDays
	)

	// Check availability first
	const availability = await getAssetAvailability(
		assetId,
		blockedFrom,
		blockedUntil
	)

	if (availability.availableQuantity < quantity) {
		throw new Error(
			`Insufficient availability for asset. Available: ${availability.availableQuantity}, Requested: ${quantity}`
		)
	}

	// Create booking
	await db.insert(assetBookings).values({
		asset: assetId,
		order: orderId,
		quantity,
		blockedFrom,
		blockedUntil,
	})
}

/**
 * Create bookings for all items in an order
 * Called when order transitions to CONFIRMED
 */
export async function createBookingsForOrder(orderId: string): Promise<void> {
	// Get order with items
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
		with: {
			items: {
				with: {
					asset: {
						columns: {
							id: true,
							refurbDaysEstimate: true,
						},
					},
				},
			},
		},
	})

	if (!order) {
		throw new Error('Order not found')
	}

	if (!order.eventStartDate || !order.eventEndDate) {
		throw new Error('Order must have event dates')
	}

	// Create booking for each item
	for (const item of order.items) {
		const refurbDays = item.asset.refurbDaysEstimate || 0

		await createBooking(
			item.asset.id,
			orderId,
			item.quantity,
			order.eventStartDate,
			order.eventEndDate,
			refurbDays
		)
	}
}

/**
 * Release bookings for an order
 * Called when order transitions to CLOSED or DECLINED
 */
export async function releaseBookingsForOrder(orderId: string): Promise<void> {
	console.log(`🗑️ Attempting to release bookings for order: ${orderId}`)

	// First, check if bookings exist
	const existingBookings = await db.query.assetBookings.findMany({
		where: eq(assetBookings.order, orderId),
	})

	console.log(`📊 Found ${existingBookings.length} booking(s) to delete`)

	if (existingBookings.length > 0) {
		existingBookings.forEach((booking, index) => {
			console.log(
				`  ${index + 1}. Booking ID: ${booking.id}, Asset: ${booking.asset}, Quantity: ${booking.quantity}`
			)
		})
	}

	// Delete bookings
	const result = await db
		.delete(assetBookings)
		.where(eq(assetBookings.order, orderId))

	console.log(`✅ Bookings deleted successfully for order: ${orderId}`)

	// Verify deletion
	const remainingBookings = await db.query.assetBookings.findMany({
		where: eq(assetBookings.order, orderId),
	})

	if (remainingBookings.length > 0) {
		console.error(
			`❌ ERROR: ${remainingBookings.length} booking(s) still exist after deletion!`
		)
	} else {
		console.log(`✅ Verified: All bookings successfully removed`)
	}
}

/**
 * Get all bookings for an asset
 * Used for displaying asset booking calendar
 */
export async function getAssetBookings(
	assetId: string,
	fromDate?: Date,
	toDate?: Date
): Promise<
	Array<{
		id: string
		orderId: string
		orderIdDisplay: string
		quantity: number
		blockedFrom: Date
		blockedUntil: Date
		eventStartDate: Date
		eventEndDate: Date
		companyName: string
	}>
> {
	const conditions = [eq(assetBookings.asset, assetId)]

	if (fromDate) {
		conditions.push(gte(assetBookings.blockedUntil, fromDate))
	}

	if (toDate) {
		conditions.push(lte(assetBookings.blockedFrom, toDate))
	}

	const bookings = await db.query.assetBookings.findMany({
		where: and(...conditions),
		with: {
			order: {
				columns: {
					id: true,
					orderId: true,
					eventStartDate: true,
					eventEndDate: true,
				},
				with: {
					company: {
						columns: {
							name: true,
						},
					},
				},
			},
		},
		orderBy: (bookings, { asc }) => [asc(bookings.blockedFrom)],
	})

	return bookings.map(b => ({
		id: b.id,
		orderId: b.order.id,
		orderIdDisplay: b.order.orderId,
		quantity: b.quantity,
		blockedFrom: b.blockedFrom,
		blockedUntil: b.blockedUntil,
		eventStartDate: b.order.eventStartDate!,
		eventEndDate: b.order.eventEndDate!,
		companyName: b.order.company.name,
	}))
}

/**
 * Get availability summary for catalog display
 * Shows next available date if currently booked
 */
export async function getAssetAvailabilitySummary(
	assetId: string,
	requestedStartDate?: Date,
	requestedEndDate?: Date
): Promise<{
	isAvailable: boolean
	availableQuantity: number
	totalQuantity: number
	nextAvailableDate?: Date
	message: string
}> {
	const asset = await db.query.assets.findFirst({
		where: eq(assets.id, assetId),
	})

	if (!asset) {
		throw new Error('Asset not found')
	}

	// If no dates provided, check current availability (next 30 days)
	const startDate = requestedStartDate || new Date()
	const endDate =
		requestedEndDate || addDays(requestedStartDate || new Date(), 30)

	const availability = await getAssetAvailability(assetId, startDate, endDate)

	let message = ''
	let nextAvailableDate: Date | undefined

	if (availability.availableQuantity === 0) {
		// Fully booked - find when it becomes available
		const futureBookings = await db.query.assetBookings.findMany({
			where: and(
				eq(assetBookings.asset, assetId),
				gte(assetBookings.blockedFrom, startDate)
			),
			orderBy: (bookings, { asc }) => [asc(bookings.blockedUntil)],
			limit: 1,
		})

		if (futureBookings.length > 0) {
			nextAvailableDate = addDays(futureBookings[0].blockedUntil, 1)
			message = `Fully booked. Available from ${format(nextAvailableDate, 'MMM dd, yyyy')}`
		} else {
			message = 'Currently unavailable'
		}
	} else if (availability.availableQuantity < asset.totalQuantity) {
		message = `${availability.availableQuantity} of ${asset.totalQuantity} available`
	} else {
		message = `All ${asset.totalQuantity} units available`
	}

	return {
		isAvailable: availability.availableQuantity > 0,
		availableQuantity: availability.availableQuantity,
		totalQuantity: asset.totalQuantity,
		nextAvailableDate,
		message,
	}
}
