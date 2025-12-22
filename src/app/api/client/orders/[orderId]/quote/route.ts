import { NextRequest } from 'next/server'
import {
	requireAuth,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { hasCompanyAccess } from '@/lib/auth/permissions'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/client/orders/:orderId/quote
 * Client views quote details for their order
 * Phase 8: Pricing & Quoting System
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	const authResult = await requireAuth()
	if (authResult instanceof Response) return authResult
	const { user } = authResult

	try {
		const { orderId } = await params

		// Fetch order with items
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, orderId),
			with: {
				items: {
					columns: {
						id: true,
						assetName: true,
						quantity: true,
						volume: true,
						weight: true,
					},
				},
			},
		})

		if (!order) {
			return errorResponse('Order not found', 404)
		}

		// Check company access
		if (!hasCompanyAccess(user, order.company)) {
			return errorResponse('You do not have access to this order', 403)
		}

		// Check if order has quote (Updated for Feedback #1)
		if (
			order.status !== 'QUOTED' &&
			order.status !== 'CONFIRMED' &&
			order.status !== 'DECLINED'
		) {
			return errorResponse('Order does not have a quote yet', 400)
		}

		const responseData = {
			order: {
				id: order.id,
				orderId: order.orderId,
				status: order.status,
				eventStartDate: order.eventStartDate,
				eventEndDate: order.eventEndDate,
				venueName: order.venueName,
				venueCity: order.venueCity,
				venueCountry: order.venueCountry,
				venueAddress: order.venueAddress,
				contactName: order.contactName,
				contactEmail: order.contactEmail,
				contactPhone: order.contactPhone,
				calculatedVolume: order.calculatedVolume,
				calculatedWeight: order.calculatedWeight,
				finalTotalPrice: order.finalTotalPrice,
				quoteSentAt: order.quoteSentAt,
				items: order.items.map(item => ({
					assetName: item.assetName,
					quantity: item.quantity,
					volume: item.volume,
					weight: item.weight,
				})),
			},
			pricingBreakdown: {
				showBreakdown: false, // Default: show total only (configurable per company in future enhancement)
				finalTotal: order.finalTotalPrice,
				currency: 'AED', // Default currency (configurable per deployment in future enhancement)
			},
		}

		return successResponse(responseData)
	} catch (error) {
		console.error('Error fetching quote:', error)
		return errorResponse('Failed to fetch quote', 500)
	}
}
