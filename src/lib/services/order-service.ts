/**
 * Phase 6: Order Service Layer
 * Updated for Feedback #4 & #5: Date-based availability validation
 *
 * Business logic for order creation, cart management, and order submission workflows.
 */

import { db } from '@/db'
import {
	orders,
	orderItems,
	assets,
	companies,
	pricingTiers,
	collections,
	collectionItems,
	brands,
	user as userTable,
	orderStatusHistory,
} from '@/db/schema/schema'
import { eq, and, isNull, desc, sql, gte, lte, inArray } from 'drizzle-orm'
import { checkMultipleAssetsAvailability } from './availability-service'
import type {
	Order,
	OrderWithDetails,
	OrderItem,
	OrderItemWithAsset,
	SubmitOrderRequest,
	SubmitOrderResponse,
	MyOrdersListParams,
	MyOrdersListResponse,
} from '@/types/order'

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generate unique human-readable order ID
 * Format: ORD-YYYYMMDD-###
 */
export async function generateOrderId(): Promise<string> {
	const today = new Date()
	const dateStr = today.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD

	// Find highest sequence number for today
	const prefix = `ORD-${dateStr}-`
	const todayOrders = await db
		.select({ orderId: orders.orderId })
		.from(orders)
		.where(sql`${orders.orderId} LIKE ${prefix + '%'}`)
		.orderBy(desc(orders.orderId))
		.limit(1)

	let sequence = 1
	if (todayOrders.length > 0) {
		const lastOrderId = todayOrders[0].orderId
		const lastSequence = parseInt(lastOrderId.split('-')[2], 10)
		sequence = lastSequence + 1
	}

	const sequenceStr = sequence.toString().padStart(3, '0')
	return `${prefix}${sequenceStr}`
}

/**
 * Calculate total volume and weight from order items
 */
function calculateOrderTotals(items: OrderItem[]): {
	volume: string
	weight: string
} {
	let totalVolume = 0
	let totalWeight = 0

	for (const item of items) {
		totalVolume += parseFloat(item.totalVolume)
		totalWeight += parseFloat(item.totalWeight)
	}

	return {
		volume: totalVolume.toFixed(3),
		weight: totalWeight.toFixed(2),
	}
}

/**
 * Map database order to Order type
 */
function mapDbOrderToOrder(dbOrder: any): Order {
	return {
		id: dbOrder.id,
		orderId: dbOrder.orderId,
		company: dbOrder.company,
		companyName: dbOrder.companyName,
		brand: dbOrder.brand,
		brandName: dbOrder.brandName,
		userId: dbOrder.userId,
		userName: dbOrder.userName,
		userEmail: dbOrder.userEmail,
		contactName: dbOrder.contactName,
		contactEmail: dbOrder.contactEmail,
		contactPhone: dbOrder.contactPhone,
		eventStartDate: dbOrder.eventStartDate,
		eventEndDate: dbOrder.eventEndDate,
		venueName: dbOrder.venueName,
		venueCountry: dbOrder.venueCountry,
		venueCity: dbOrder.venueCity,
		venueAddress: dbOrder.venueAddress,
		venueAccessNotes: dbOrder.venueAccessNotes,
		specialInstructions: dbOrder.specialInstructions,
		calculatedVolume: dbOrder.calculatedVolume,
		calculatedWeight: dbOrder.calculatedWeight,
		pricingTier: dbOrder.pricingTier,
		a2BasePrice: dbOrder.a2BasePrice,
		a2AdjustedPrice: dbOrder.a2AdjustedPrice,
		a2AdjustmentReason: dbOrder.a2AdjustmentReason,
		a2AdjustedAt: dbOrder.a2AdjustedAt,
		a2AdjustedBy: dbOrder.a2AdjustedBy,
		pmgMarginPercent: dbOrder.pmgMarginPercent,
		pmgMarginAmount: dbOrder.pmgMarginAmount,
		pmgReviewedAt: dbOrder.pmgReviewedAt,
		pmgReviewedBy: dbOrder.pmgReviewedBy,
		pmgReviewNotes: dbOrder.pmgReviewNotes,
		finalTotalPrice: dbOrder.finalTotalPrice,
		quoteSentAt: dbOrder.quoteSentAt,
		invoiceNumber: dbOrder.invoiceNumber,
		invoiceGeneratedAt: dbOrder.invoiceGeneratedAt,
		invoicePdfUrl: dbOrder.invoicePdfUrl,
		invoicePaidAt: dbOrder.invoicePaidAt,
		paymentMethod: dbOrder.paymentMethod,
		paymentReference: dbOrder.paymentReference,
		deliveryWindowStart: dbOrder.deliveryWindowStart,
		deliveryWindowEnd: dbOrder.deliveryWindowEnd,
		pickupWindowStart: dbOrder.pickupWindowStart,
		pickupWindowEnd: dbOrder.pickupWindowEnd,
		truckPhotos: dbOrder.truckPhotos || [],
		jobNumber: dbOrder.jobNumber,
		status: dbOrder.status,
		financialStatus: dbOrder.financialStatus, // Feedback #1: Include separate financial status
		createdAt: dbOrder.createdAt,
		updatedAt: dbOrder.updatedAt,
		deletedAt: dbOrder.deletedAt,
	}
}

/**
 * Map database order item to OrderItem type
 */
function mapDbOrderItemToOrderItem(dbItem: any): OrderItem {
	return {
		id: dbItem.id,
		order: dbItem.order,
		asset: dbItem.asset,
		assetName: dbItem.assetName,
		quantity: dbItem.quantity,
		volume: dbItem.volume,
		weight: dbItem.weight,
		totalVolume: dbItem.totalVolume,
		totalWeight: dbItem.totalWeight,
		condition: dbItem.condition,
		handlingTags: dbItem.handlingTags || [],
		fromCollection: dbItem.fromCollection,
		fromCollectionName: dbItem.fromCollectionName,
		createdAt: dbItem.createdAt,
	}
}

/**
 * Submit order directly from cart (no draft)
 * Creates SUBMITTED order from cart items array
 */
export async function submitOrderFromCart(
	userId: string,
	companyId: string,
	request: {
		items: {
			assetId: string
			quantity: number
			fromCollectionId?: string
		}[]
		brand?: string
		eventStartDate: string
		eventEndDate: string
		venueName: string
		venueCountry: string
		venueCity: string
		venueAddress: string
		venueAccessNotes?: string
		contactName: string
		contactEmail: string
		contactPhone: string
		specialInstructions?: string
	}
): Promise<{
	orderId: string
	status: string
	companyName: string
	calculatedVolume: string
	itemCount: number
}> {
	// Validate items array
	if (!request.items || request.items.length === 0) {
		throw new Error('At least one item is required')
	}

	// Validate dates first (needed for availability check)
	const eventStart = new Date(request.eventStartDate)
	const eventEnd = new Date(request.eventEndDate)
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	if (eventStart < today) {
		throw new Error('Event start date cannot be in the past')
	}

	if (eventEnd < eventStart) {
		throw new Error('Event end date must be on or after start date')
	}

	// Validate all assets belong to company and are available
	const assetIds = request.items.map(item => item.assetId)
	const foundAssets = await db
		.select()
		.from(assets)
		.where(
			and(
				inArray(assets.id, assetIds),
				eq(assets.company, companyId),
				isNull(assets.deletedAt)
			)
		)

	if (foundAssets.length !== assetIds.length) {
		throw new Error(
			'One or more assets not found or do not belong to your company'
		)
	}

	// Validate all assets are AVAILABLE (status check)
	const unavailableAssets = foundAssets.filter(a => a.status !== 'AVAILABLE')
	if (unavailableAssets.length > 0) {
		throw new Error(
			`Cannot order unavailable assets: ${unavailableAssets.map(a => a.name).join(', ')}`
		)
	}

	// Feedback #4 & #5: Validate date-based availability with buffer days
	console.log('🔍 Checking availability for event dates:', {
		eventStart: eventStart.toISOString(),
		eventEnd: eventEnd.toISOString(),
		items: request.items,
	})

	const availabilityCheck = await checkMultipleAssetsAvailability(
		request.items.map(item => ({
			assetId: item.assetId,
			quantity: item.quantity,
		})),
		eventStart,
		eventEnd
	)

	console.log('✅ Availability check result:', availabilityCheck)

	if (!availabilityCheck.allAvailable) {
		const unavailableList = availabilityCheck.unavailableItems
			.map(
				item =>
					`${item.assetName}: requested ${item.requested}, available ${item.available}${
						item.nextAvailableDate
							? ` (available from ${item.nextAvailableDate.toLocaleDateString()})`
							: ''
					}`
			)
			.join('; ')
		console.log('❌ Availability check FAILED:', unavailableList)
		throw new Error(
			`Insufficient availability for requested dates: ${unavailableList}`
		)
	}

	console.log('✅ Availability check PASSED - proceeding with order creation')

	// Validate required fields
	if (
		!request.venueName ||
		!request.venueCountry ||
		!request.venueCity ||
		!request.venueAddress
	) {
		throw new Error('All venue information fields are required')
	}

	if (
		!request.contactName ||
		!request.contactEmail ||
		!request.contactPhone
	) {
		throw new Error('All contact information fields are required')
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	if (!emailRegex.test(request.contactEmail)) {
		throw new Error('Invalid email format')
	}

	// Create order items data with totals
	const orderItemsData = []
	let totalVolume = 0
	let totalWeight = 0

	for (const item of request.items) {
		const asset = foundAssets.find(a => a.id === item.assetId)!
		const itemVolume = parseFloat(asset.volume) * item.quantity
		const itemWeight = parseFloat(asset.weight) * item.quantity

		totalVolume += itemVolume
		totalWeight += itemWeight

		// Get collection name if from collection
		let collectionName: string | null = null
		if (item.fromCollectionId) {
			const [collection] = await db
				.select()
				.from(collections)
				.where(eq(collections.id, item.fromCollectionId))
			collectionName = collection?.name || null
		}

		orderItemsData.push({
			asset: asset.id,
			assetName: asset.name,
			quantity: item.quantity,
			volume: asset.volume,
			weight: asset.weight,
			totalVolume: itemVolume.toFixed(3),
			totalWeight: itemWeight.toFixed(2),
			condition: asset.condition,
			handlingTags: asset.handlingTags || [],
			fromCollection: item.fromCollectionId || null,
			fromCollectionName: collectionName,
		})
	}

	const calculatedVolume = totalVolume.toFixed(3)
	const calculatedWeight = totalWeight.toFixed(2)

	// Find matching pricing tier
	const volume = parseFloat(calculatedVolume)
	const matchingTiers = await db
		.select()
		.from(pricingTiers)
		.where(
			and(
				sql`LOWER(${pricingTiers.country}) = LOWER(${request.venueCountry})`,
				sql`LOWER(${pricingTiers.city}) = LOWER(${request.venueCity})`,
				eq(pricingTiers.isActive, true),
				lte(sql`CAST(${pricingTiers.volumeMin} AS DECIMAL)`, volume),
				sql`CAST(${pricingTiers.volumeMax} AS DECIMAL) > ${volume}`
			)
		)
		.orderBy(
			sql`CAST(${pricingTiers.volumeMax} AS DECIMAL) - CAST(${pricingTiers.volumeMin} AS DECIMAL)`
		)
		.limit(1)

	const pricingTier = matchingTiers[0] || null

	// Create order directly as PRICING_REVIEW (A2 staff reviews immediately)
	const [order] = await db
		.insert(orders)
		.values({
			orderId: await generateOrderId(),
			company: companyId,
			brand: request.brand || null,
			userId,
			status: 'PRICING_REVIEW', // Changed from SUBMITTED to PRICING_REVIEW
			financialStatus: 'PENDING_QUOTE', // Feedback #1: Initialize financial status
			contactName: request.contactName,
			contactEmail: request.contactEmail,
			contactPhone: request.contactPhone,
			eventStartDate: eventStart,
			eventEndDate: eventEnd,
			venueName: request.venueName,
			venueCountry: request.venueCountry,
			venueCity: request.venueCity,
			venueAddress: request.venueAddress,
			venueAccessNotes: request.venueAccessNotes || null,
			specialInstructions: request.specialInstructions || null,
			calculatedVolume,
			calculatedWeight,
			pricingTier: pricingTier?.id || null,
		})
		.returning()

	// Add order items
	const itemsToInsert = orderItemsData.map(item => ({
		...item,
		order: order.id,
	}))

	await db.insert(orderItems).values(itemsToInsert)

	// Get company name for response
	const [company] = await db
		.select()
		.from(companies)
		.where(eq(companies.id, companyId))

	return {
		orderId: order.orderId,
		status: 'PRICING_REVIEW', // Changed to match actual status
		companyName: company?.name || '',
		calculatedVolume,
		itemCount: request.items.length,
	}
}

// ============================================================
// Order Retrieval
// ============================================================

/**
 * Get order by ID
 */
export async function getOrderById(
	orderId: string,
	userId: string,
	companyId: string
): Promise<OrderWithDetails | null> {
	// Fetch order with company and brand details
	const result = await db
		.select({
			order: orders,
			company: {
				id: companies.id,
				name: companies.name,
			},
			brand: {
				id: brands.id,
				name: brands.name,
			},
			user: {
				id: userTable.id,
				name: userTable.name,
				email: userTable.email,
			},
			pricingTier: pricingTiers,
		})
		.from(orders)
		.leftJoin(companies, eq(orders.company, companies.id))
		.leftJoin(brands, eq(orders.brand, brands.id))
		.leftJoin(userTable, eq(orders.userId, userTable.id))
		.leftJoin(pricingTiers, eq(orders.pricingTier, pricingTiers.id))
		.where(
			and(
				eq(orders.id, orderId),
				eq(orders.company, companyId),
				eq(orders.userId, userId)
			)
		)
		.limit(1)

	if (result.length === 0) {
		return null
	}

	const {
		order,
		company: companyData,
		brand: brandData,
		user: userData,
		pricingTier,
	} = result[0]

	// Get order items with asset details
	const items = await getOrderItemsWithAssets(orderId)

	return {
		...mapDbOrderToOrder({
			...order,
			companyName: companyData?.name,
			brandName: brandData?.name,
			userName: userData?.name,
			userEmail: userData?.email,
		}),
		items,
		itemCount: items.length,
		pricingTierDetails: pricingTier
			? {
					country: pricingTier.country,
					city: pricingTier.city,
					volumeMin: pricingTier.volumeMin,
					volumeMax: pricingTier.volumeMax,
					basePrice: pricingTier.basePrice,
				}
			: null,
	}
}

/**
 * Get order by human-readable order ID
 */
export async function getOrderByOrderId(
	orderId: string,
	userId: string,
	companyId: string
): Promise<OrderWithDetails | null> {
	const [order] = await db
		.select()
		.from(orders)
		.where(
			and(
				eq(orders.orderId, orderId),
				eq(orders.company, companyId),
				eq(orders.userId, userId)
			)
		)

	if (!order) {
		return null
	}

	return getOrderById(order.id, userId, companyId)
}

/**
 * List user's orders
 */
export async function listMyOrders(
	userId: string,
	companyId: string,
	params: MyOrdersListParams
): Promise<MyOrdersListResponse> {
	const {
		status,
		limit = 20,
		offset = 0,
		sortBy = 'createdAt',
		sortOrder = 'desc',
	} = params

	// Build conditions
	const conditions = [
		eq(orders.userId, userId),
		eq(orders.company, companyId),
	]
	if (status) {
		conditions.push(eq(orders.status, status))
	}

	// Build sort column
	const sortColumn =
		sortBy === 'createdAt'
			? orders.createdAt
			: sortBy === 'eventStartDate'
				? orders.eventStartDate
				: orders.orderId
	const orderDirection = sortOrder === 'asc' ? sortColumn : desc(sortColumn)

	// Fetch orders with company and brand details
	const results = await db
		.select({
			order: orders,
			company: {
				id: companies.id,
				name: companies.name,
			},
			brand: {
				id: brands.id,
				name: brands.name,
			},
		})
		.from(orders)
		.leftJoin(companies, eq(orders.company, companies.id))
		.leftJoin(brands, eq(orders.brand, brands.id))
		.where(and(...conditions))
		.orderBy(orderDirection)
		.limit(limit)
		.offset(offset)

	// Count total
	const [countResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(orders)
		.where(and(...conditions))

	const ordersData = results.map(r =>
		mapDbOrderToOrder({
			...r.order,
			companyName: r.company?.name,
			brandName: r.brand?.name,
		})
	)

	return {
		orders: ordersData,
		total: countResult.count,
		limit,
		offset,
	}
}

// ============================================================
// Helper: Get order items with asset details
// ============================================================

async function getOrderItemsWithAssets(
	orderId: string
): Promise<OrderItemWithAsset[]> {
	const results = await db
		.select({
			orderItem: orderItems,
			asset: assets,
		})
		.from(orderItems)
		.leftJoin(assets, eq(orderItems.asset, assets.id))
		.where(eq(orderItems.order, orderId))

	return results.map(r => ({
		...mapDbOrderItemToOrderItem(r.orderItem),
		assetDetails: r.asset
			? {
					id: r.asset.id,
					name: r.asset.name,
					images: r.asset.images || [],
					category: r.asset.category,
					qrCode: r.asset.qrCode,
					trackingMethod: r.asset.trackingMethod,
					status: r.asset.status,
				}
			: undefined,
	}))
}

// ============================================================
// Phase 7: Admin Order Management Functions
// ============================================================

/**
 * List orders for admin with filtering and search
 */
export async function listOrdersForAdmin(params: {
	user: any
	page: number
	limit: number
	company?: string
	brand?: string
	status?: string
	dateFrom?: string
	dateTo?: string
	search?: string
	sortBy: string
	sortOrder: 'asc' | 'desc'
	includeJobNumbers: boolean
}) {
	const {
		user,
		page,
		limit,
		company,
		brand,
		status,
		dateFrom,
		dateTo,
		search,
		sortBy,
		sortOrder,
		includeJobNumbers,
	} = params

	// Build WHERE conditions
	const conditions: any[] = []

	// Company scope filtering (Section 5: Row-level security)
	if (user.companies.includes('*')) {
		// User has access to all companies (PMG Admin, A2 Staff)
		// No company filter needed
	} else {
		// Filter by user's company scope
		conditions.push(inArray(orders.company, user.companies))
	}

	// Optional filters
	if (company) {
		conditions.push(eq(orders.company, company))
	}
	if (brand) {
		conditions.push(eq(orders.brand, brand))
	}
	if (status) {
		conditions.push(sql`${orders.status} = ${status}`)
	}
	if (dateFrom) {
		conditions.push(gte(orders.createdAt, new Date(dateFrom)))
	}
	if (dateTo) {
		conditions.push(lte(orders.createdAt, new Date(dateTo)))
	}

	// Search functionality
	if (search) {
		// Search across orderId (exact match), contactName (ILIKE), venueName (ILIKE)
		// For asset names, we'll need a subquery
		const searchConditions = [
			sql`${orders.orderId} ILIKE ${`%${search}%`}`,
			sql`${orders.contactName} ILIKE ${`%${search}%`}`,
			sql`${orders.venueName} ILIKE ${`%${search}%`}`,
			// Subquery for asset names in orderItems
			sql`EXISTS (
				SELECT 1 FROM ${orderItems}
				WHERE ${orderItems.order} = ${orders.id}
				AND ${orderItems.assetName} ILIKE ${`%${search}%`}
			)`,
		]
		conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`)
	}

	// Sorting
	const sortField = {
		createdAt: orders.createdAt,
		eventStartDate: orders.eventStartDate,
		orderId: orders.orderId,
		status: orders.status,
	}[sortBy]

	const orderDirection =
		sortOrder === 'asc' ? sql`${sortField} ASC` : sql`${sortField} DESC`

	// Pagination
	const offset = (page - 1) * limit

	// Fetch orders with joins
	const results = await db
		.select({
			order: orders,
			company: {
				id: companies.id,
				name: companies.name,
			},
			brand: {
				id: brands.id,
				name: brands.name,
			},
		})
		.from(orders)
		.leftJoin(companies, eq(orders.company, companies.id))
		.leftJoin(brands, eq(orders.brand, brands.id))
		.where(and(...conditions))
		.orderBy(orderDirection)
		.limit(limit)
		.offset(offset)

	// Count total
	const [countResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(orders)
		.where(and(...conditions))

	// Get item counts and previews for each order
	const orderIds = results.map(r => r.order.id)
	let itemCounts: Record<string, number> = {}
	let itemPreviews: Record<string, string[]> = {}

	if (orderIds.length > 0) {
		const itemResults = await db
			.select({
				orderId: orderItems.order,
				assetName: orderItems.assetName,
			})
			.from(orderItems)
			.where(inArray(orderItems.order, orderIds))

		// Group by orderId
		itemResults.forEach(item => {
			if (!itemCounts[item.orderId]) {
				itemCounts[item.orderId] = 0
				itemPreviews[item.orderId] = []
			}
			itemCounts[item.orderId]++
			if (itemPreviews[item.orderId].length < 3) {
				itemPreviews[item.orderId].push(item.assetName)
			}
		})
	}

	// Map results
	const ordersData = results.map(r => {
		const baseOrder = {
			id: r.order.id,
			orderId: r.order.orderId,
			company: r.company,
			brand: r.brand,
			userId: r.order.userId,
			contactName: r.order.contactName,
			contactEmail: r.order.contactEmail,
			contactPhone: r.order.contactPhone,
			eventStartDate: r.order.eventStartDate?.toISOString(),
			eventEndDate: r.order.eventEndDate?.toISOString(),
			venueName: r.order.venueName,
			venueCity: r.order.venueCity,
			venueCountry: r.order.venueCountry,
			calculatedVolume: r.order.calculatedVolume,
			calculatedWeight: r.order.calculatedWeight,
			status: r.order.status,
			financialStatus: r.order.financialStatus, // Feedback #1: Include separate financial status
			createdAt: r.order.createdAt?.toISOString(),
			itemCount: itemCounts[r.order.id] || 0,
			itemPreview: itemPreviews[r.order.id] || [],
		}

		// Include job number only if user has permission
		if (includeJobNumbers) {
			return {
				...baseOrder,
				jobNumber: r.order.jobNumber,
			}
		}

		return baseOrder
	})

	return {
		orders: ordersData,
		pagination: {
			page,
			limit,
			totalPages: Math.ceil(countResult.count / limit),
			totalCount: countResult.count,
		},
	}
}

/**
 * Get order details by ID for admin view (includes status history)
 */
export async function getOrderDetailsForAdmin(
	orderId: string,
	user: any,
	includeJobNumbers: boolean
) {
	// Fetch order with relations
	const result = await db
		.select({
			order: orders,
			company: {
				id: companies.id,
				name: companies.name,
			},
			brand: {
				id: brands.id,
				name: brands.name,
			},
			user: {
				id: userTable.id,
				name: userTable.name,
				email: userTable.email,
			},
		})
		.from(orders)
		.leftJoin(companies, eq(orders.company, companies.id))
		.leftJoin(brands, eq(orders.brand, brands.id))
		.leftJoin(userTable, eq(orders.userId, userTable.id))
		.where(eq(orders.id, orderId))
		.limit(1)

	if (result.length === 0) {
		return null
	}

	const orderData = result[0]

	// Check company scope access (Section 5: Data isolation)
	if (
		!user.companies.includes('*') &&
		!user.companies.includes(orderData.order.company)
	) {
		return null
	}

	// Fetch order items with asset details (Feedback #3: Include refurb info)
	const itemResults = await db
		.select({
			orderItem: orderItems,
			asset: {
				id: assets.id,
				name: assets.name,
				refurbDaysEstimate: assets.refurbDaysEstimate,
				condition: assets.condition,
			},
			collection: {
				id: collections.id,
				name: collections.name,
			},
		})
		.from(orderItems)
		.leftJoin(assets, eq(orderItems.asset, assets.id))
		.leftJoin(collections, eq(orderItems.fromCollection, collections.id))
		.where(eq(orderItems.order, orderId))

	const items = itemResults.map(r => ({
		id: r.orderItem.id,
		asset: r.asset,
		assetDetails: r.asset
			? {
					id: r.asset.id,
					name: r.asset.name,
					refurbDaysEstimate: r.asset.refurbDaysEstimate,
					condition: r.asset.condition,
				}
			: undefined,
		assetName: r.orderItem.assetName,
		quantity: r.orderItem.quantity,
		volume: r.orderItem.volume,
		weight: r.orderItem.weight,
		totalVolume: r.orderItem.totalVolume,
		totalWeight: r.orderItem.totalWeight,
		condition: r.orderItem.condition,
		handlingTags: r.orderItem.handlingTags || [],
		fromCollection: r.collection,
		fromCollectionName: r.orderItem.fromCollectionName,
	}))

	// Fetch status history
	const statusHistoryResults = await db
		.select({
			history: orderStatusHistory,
			user: {
				id: userTable.id,
				name: userTable.name,
			},
		})
		.from(orderStatusHistory)
		.leftJoin(userTable, eq(orderStatusHistory.updatedBy, userTable.id))
		.where(eq(orderStatusHistory.order, orderId))
		.orderBy(desc(orderStatusHistory.timestamp))

	const statusHistory = statusHistoryResults.map(r => ({
		id: r.history.id,
		status: r.history.status,
		notes: r.history.notes,
		updatedBy: r.user,
		timestamp: r.history.timestamp.toISOString(),
	}))

	// Build response
	const baseResponse = {
		id: orderData.order.id,
		orderId: orderData.order.orderId,
		company: orderData.company,
		brand: orderData.brand,
		user: orderData.user,
		contactName: orderData.order.contactName,
		contactEmail: orderData.order.contactEmail,
		contactPhone: orderData.order.contactPhone,
		eventStartDate: orderData.order.eventStartDate.toISOString(),
		eventEndDate: orderData.order.eventEndDate.toISOString(),
		venueName: orderData.order.venueName,
		venueCountry: orderData.order.venueCountry,
		venueCity: orderData.order.venueCity,
		venueAddress: orderData.order.venueAddress,
		venueAccessNotes: orderData.order.venueAccessNotes,
		specialInstructions: orderData.order.specialInstructions,
		calculatedVolume: orderData.order.calculatedVolume,
		calculatedWeight: orderData.order.calculatedWeight,
		// Pricing fields
		a2BasePrice: orderData.order.a2BasePrice,
		a2AdjustedPrice: orderData.order.a2AdjustedPrice,
		a2AdjustmentReason: orderData.order.a2AdjustmentReason,
		pmgMarginPercent: orderData.order.pmgMarginPercent,
		pmgMarginAmount: orderData.order.pmgMarginAmount,
		pmgReviewNotes: orderData.order.pmgReviewNotes,
		finalTotalPrice: orderData.order.finalTotalPrice,
		quoteSentAt: orderData.order.quoteSentAt?.toISOString() || null,
		// Invoice fields
		invoiceNumber: orderData.order.invoiceNumber,
		invoiceGeneratedAt:
			orderData.order.invoiceGeneratedAt?.toISOString() || null,
		invoicePdfUrl: orderData.order.invoicePdfUrl,
		invoicePaidAt: orderData.order.invoicePaidAt?.toISOString() || null,
		paymentMethod: orderData.order.paymentMethod,
		paymentReference: orderData.order.paymentReference,
		// Delivery windows
		deliveryWindowStart:
			orderData.order.deliveryWindowStart?.toISOString() || null,
		deliveryWindowEnd:
			orderData.order.deliveryWindowEnd?.toISOString() || null,
		pickupWindowStart:
			orderData.order.pickupWindowStart?.toISOString() || null,
		pickupWindowEnd: orderData.order.pickupWindowEnd?.toISOString() || null,
		// Status fields
		status: orderData.order.status,
		financialStatus: orderData.order.financialStatus, // Feedback #1: Include separate financial status
		createdAt: orderData.order.createdAt.toISOString(),
		updatedAt: orderData.order.updatedAt.toISOString(),
		items,
		statusHistory,
	}

	// Include job number only if user has permission
	if (includeJobNumbers) {
		return {
			...baseResponse,
			jobNumber: orderData.order.jobNumber,
		}
	}

	return baseResponse
}

/**
 * Update job number for order (PMG Admin only)
 */
export async function updateJobNumber(
	orderId: string,
	jobNumber: string | null,
	user: any
): Promise<boolean> {
	// Verify order exists and user has access
	const [order] = await db.select().from(orders).where(eq(orders.id, orderId))

	if (!order) {
		throw new Error('Order not found')
	}

	// Check company scope access
	if (
		!user.companies.includes('*') &&
		!user.companies.includes(order.company)
	) {
		throw new Error('Access denied')
	}

	// Validate job number format if provided
	if (jobNumber !== null) {
		if (typeof jobNumber !== 'string' || jobNumber.length > 100) {
			throw new Error('Invalid job number format (max 100 characters)')
		}
		// Alphanumeric validation
		if (!/^[a-zA-Z0-9\-_]+$/.test(jobNumber)) {
			throw new Error(
				'Job number must be alphanumeric (letters, numbers, hyphens, underscores only)'
			)
		}
	}

	// Update job number
	await db
		.update(orders)
		.set({ jobNumber, updatedAt: new Date() })
		.where(eq(orders.id, orderId))

	return true
}
