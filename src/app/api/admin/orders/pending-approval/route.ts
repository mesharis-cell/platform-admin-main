import { NextRequest } from 'next/server'
import {
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'

/**
 * GET /api/admin/orders/pending-approval
 * Fetch all orders in PENDING_APPROVAL status for PMG to review
 * Phase 8: Pricing & Quoting System
 */
export async function GET(request: NextRequest) {
	const authResult = await requirePermission('pricing:pmg_review_adjustment')
	if (authResult instanceof Response) return authResult

	try {
		const { searchParams } = new URL(request.url)
		const company = searchParams.get('company')
		const sortBy = searchParams.get('sortBy') || 'a2AdjustedAt'
		const sortOrder = searchParams.get('sortOrder') || 'desc'

		// Build query
		const whereConditions = [eq(orders.status, 'PENDING_APPROVAL')]
		if (company) {
			whereConditions.push(eq(orders.company, company))
		}

		const result = await db.query.orders.findMany({
			where:
				whereConditions.length > 1
					? and(...whereConditions)
					: whereConditions[0],
			with: {
				company: {
					columns: {
						id: true,
						name: true,
						pmgMarginPercent: true,
					},
				},
				a2AdjustedByUser: {
					columns: {
						id: true,
						name: true,
					},
				},
			},
			orderBy:
				sortOrder === 'asc'
					? asc(orders[sortBy as keyof typeof orders] as any)
					: desc(orders[sortBy as keyof typeof orders] as any),
		})

		const ordersData = result.map(order => ({
			id: order.id,
			orderId: order.orderId,
			company: {
				id: order.company.id,
				name: order.company.name,
				pmgMarginPercent: order.company.pmgMarginPercent,
			},
			contactName: order.contactName,
			eventStartDate: order.eventStartDate,
			venueCity: order.venueCity,
			a2AdjustedPrice: order.a2AdjustedPrice,
			a2AdjustmentReason: order.a2AdjustmentReason,
			a2AdjustedAt: order.a2AdjustedAt,
			a2AdjustedBy: order.a2AdjustedByUser
				? {
						id: order.a2AdjustedByUser.id,
						name: order.a2AdjustedByUser.name,
					}
				: null,
			status: order.status,
			createdAt: order.createdAt,
		}))

		return successResponse({ orders: ordersData })
	} catch (error) {
		console.error('Error fetching pending approval orders:', error)
		return errorResponse('Failed to fetch pending approval orders', 500)
	}
}
