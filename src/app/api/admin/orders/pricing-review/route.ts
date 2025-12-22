import { NextRequest } from 'next/server'
import {
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { orders, pricingTiers } from '@/db/schema/schema'
import { eq, desc, asc, and, sql } from 'drizzle-orm'

/**
 * GET /api/admin/orders/pricing-review
 * Fetch all orders in PRICING_REVIEW status for A2 Staff to review
 * Phase 8: Pricing & Quoting System
 */
export async function GET(request: NextRequest) {
	const authResult = await requirePermission('pricing:review')
	if (authResult instanceof Response) return authResult

	try {
		const { searchParams } = new URL(request.url)
		const company = searchParams.get('company')
		const sortBy = searchParams.get('sortBy') || 'createdAt'
		const sortOrder = searchParams.get('sortOrder') || 'desc'

		// Fetch orders in PRICING_REVIEW with company info
		const ordersQuery = db.query.orders.findMany({
			where: eq(orders.status, 'PRICING_REVIEW'),
			with: {
				company: true,
			},
			orderBy:
				sortOrder === 'asc'
					? asc(orders.createdAt)
					: desc(orders.createdAt),
		})

		const result = await ordersQuery

		// Calculate standard pricing for each order
		const ordersData = await Promise.all(
			result.map(async order => {
				let standardPricing = null

				// Try to find matching pricing tier if not already assigned
				let tierToUse = null
				if (order.pricingTier) {
					// Use assigned tier
					const [tier] = await db
						.select()
						.from(pricingTiers)
						.where(eq(pricingTiers.id, order.pricingTier))
						.limit(1)
					tierToUse = tier
				} else {
					// Try to find matching tier based on location and volume
					const volume = parseFloat(order.calculatedVolume)
					const matchingTiers = await db
						.select()
						.from(pricingTiers)
						.where(
							and(
								sql`LOWER(${pricingTiers.country}) = LOWER(${order.venueCountry})`,
								sql`LOWER(${pricingTiers.city}) = LOWER(${order.venueCity})`,
								eq(pricingTiers.isActive, true),
								sql`CAST(${pricingTiers.volumeMin} AS DECIMAL) <= ${volume}`,
								sql`CAST(${pricingTiers.volumeMax} AS DECIMAL) > ${volume}`
							)
						)
						.limit(1)
					tierToUse = matchingTiers[0]
				}

				if (tierToUse) {
					// Use flat rate from tier (NOT per-m³ multiplication)
					const a2BasePrice = parseFloat(tierToUse.basePrice)

					// A2 Staff only sees A2 base price, not PMG margin
					standardPricing = {
						a2BasePrice,
						tierInfo: {
							country: tierToUse.country,
							city: tierToUse.city,
							volumeRange: `${tierToUse.volumeMin}-${tierToUse.volumeMax} m³`,
						},
					}
				}

				return {
					id: order.id,
					orderId: order.orderId,
					company: {
						id: order.company.id,
						name: order.company.name,
					},
					companyName: order.company.name,
					contactName: order.contactName,
					eventStartDate: order.eventStartDate,
					venueCity: order.venueCity,
					venueCountry: order.venueCountry,
					calculatedVolume: order.calculatedVolume,
					calculatedWeight: order.calculatedWeight,
					status: order.status,
					createdAt: order.createdAt,
					standardPricing,
				}
			})
		)

		return successResponse({ orders: ordersData })
	} catch (error) {
		console.error('Error fetching pricing review orders:', error)
		return errorResponse('Failed to fetch pricing review orders', 500)
	}
}
