import { NextRequest } from 'next/server'
import {
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import {
	orders,
	orderItems,
	orderStatusHistory,
	companies,
	brands,
	user,
	assets,
	collections,
} from '@/db/schema/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	// Require authentication and orders:read permission
	const authResult = await requirePermission('orders:read')
	if (authResult instanceof Response) return authResult
	const { user: currentUser } = authResult

	const { orderId } = await params

	try {
		// Get user's company (Client Users have single company in array)
		const userCompanyId = currentUser.companies?.[0]
		if (!userCompanyId || userCompanyId === '*') {
			return errorResponse('Invalid company access', 403)
		}

		// Query order with company validation using orderId (readable ID) not UUID
		const [orderData] = await db
			.select()
			.from(orders)
			.where(
				and(
					eq(orders.orderId, orderId),
					eq(orders.company, userCompanyId),
					isNull(orders.deletedAt)
				)
			)

		if (!orderData) {
			return errorResponse('Order not found', 404)
		}

		// Get company details
		const [companyData] = await db
			.select()
			.from(companies)
			.where(eq(companies.id, orderData.company))

		// Get brand details if exists
		let brandData = null
		if (orderData.brand) {
			;[brandData] = await db
				.select()
				.from(brands)
				.where(eq(brands.id, orderData.brand))
		}

		// Get creator user details
		let createdByData = null
		if (orderData.userId) {
			;[createdByData] = await db
				.select()
				.from(user)
				.where(eq(user.id, orderData.userId))
		}

		// Query order items using the UUID id, not the readable orderId
		const itemsData = await db
			.select()
			.from(orderItems)
			.where(eq(orderItems.order, orderData.id))

		// Get asset and collection details for each item
		const itemsWithDetails = await Promise.all(
			itemsData.map(async item => {
				let assetData = null
				if (item.asset) {
					;[assetData] = await db
						.select()
						.from(assets)
						.where(eq(assets.id, item.asset))
				}

				let collectionData = null
				if (item.fromCollection) {
					;[collectionData] = await db
						.select()
						.from(collections)
						.where(eq(collections.id, item.fromCollection))
				}

				return {
					id: item.id,
					assetName: item.assetName,
					asset: assetData
						? {
								id: assetData.id,
								name: assetData.name,
								images: assetData.images,
								dimensionLength: assetData.dimensionLength,
								dimensionWidth: assetData.dimensionWidth,
								dimensionHeight: assetData.dimensionHeight,
							}
						: null,
					quantity: item.quantity,
					volume: item.volume,
					weight: item.weight,
					totalVolume: item.totalVolume,
					totalWeight: item.totalWeight,
					condition: item.condition,
					handlingTags: item.handlingTags,
					fromCollection: collectionData
						? {
								id: collectionData.id,
								name: collectionData.name,
							}
						: null,
				}
			})
		)

		// Query status history
		const historyData = await db
			.select()
			.from(orderStatusHistory)
			.where(eq(orderStatusHistory.order, orderData.id))
			.orderBy(orderStatusHistory.timestamp)

		// Get user details for each history entry
		const historyWithUsers = await Promise.all(
			historyData.map(async entry => {
				let updatedByData = null
				if (entry.updatedBy) {
					;[updatedByData] = await db
						.select()
						.from(user)
						.where(eq(user.id, entry.updatedBy))
				}

				return {
					status: entry.status,
					notes: entry.notes,
					updatedBy: updatedByData
						? { name: updatedByData.name }
						: null,
					timestamp: entry.timestamp,
				}
			})
		)

		return successResponse({
			id: orderData.id,
			orderId: orderData.orderId,
			company: companyData
				? { id: companyData.id, name: companyData.name }
				: null,
			brand: brandData
				? { id: brandData.id, name: brandData.name }
				: null,
			createdBy: createdByData
				? {
						id: createdByData.id,
						name: createdByData.name,
						email: createdByData.email,
					}
				: null,
			contactName: orderData.contactName,
			contactEmail: orderData.contactEmail,
			contactPhone: orderData.contactPhone,
			eventStartDate: orderData.eventStartDate,
			eventEndDate: orderData.eventEndDate,
			venueName: orderData.venueName,
			venueCountry: orderData.venueCountry,
			venueCity: orderData.venueCity,
			venueAddress: orderData.venueAddress,
			venueAccessNotes: orderData.venueAccessNotes,
			deliveryWindowStart: orderData.deliveryWindowStart,
			deliveryWindowEnd: orderData.deliveryWindowEnd,
			pickupWindowStart: orderData.pickupWindowStart,
			pickupWindowEnd: orderData.pickupWindowEnd,
			truckPhotos: orderData.truckPhotos || [],
			specialInstructions: orderData.specialInstructions,
			calculatedVolume: orderData.calculatedVolume,
			calculatedWeight: orderData.calculatedWeight,
			finalTotalPrice: orderData.finalTotalPrice,
			quoteSentAt: orderData.quoteSentAt,
			// Feedback #3: Include pricing adjustment details for client banner
			a2AdjustedPrice: orderData.a2AdjustedPrice,
			a2AdjustmentReason: orderData.a2AdjustmentReason,
			pmgReviewNotes: orderData.pmgReviewNotes,
			invoiceNumber: orderData.invoiceNumber,
			invoiceGeneratedAt: orderData.invoiceGeneratedAt,
			invoicePdfUrl: orderData.invoicePdfUrl,
			status: orderData.status,
			financialStatus: orderData.financialStatus, // Feedback #1: Include separate financial status
			items: itemsWithDetails,
			statusHistory: historyWithUsers,
			createdAt: orderData.createdAt,
			updatedAt: orderData.updatedAt,
		})
	} catch (error) {
		console.error('Error fetching order details:', error)
		return errorResponse('Failed to fetch order details', 500)
	}
}
