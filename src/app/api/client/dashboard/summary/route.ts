import { NextRequest } from 'next/server'
import {
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { orders } from '@/db/schema/schema'
import { eq, and, gte, isNull, desc, inArray, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
	// Require authentication and orders:read permission
	const authResult = await requirePermission('orders:read')
	if (authResult instanceof Response) return authResult
	const { user } = authResult

	try {
		// Get user's company (Client Users have single company in array)
		const userCompanyId = user.companies?.[0]
		if (!userCompanyId || userCompanyId === '*') {
			return errorResponse('Invalid company access', 403)
		}

		// Get today's date for upcoming events filter
		const today = new Date().toISOString().split('T')[0]

		// Base condition for all queries
		const baseCondition = and(
			eq(orders.company, userCompanyId),
			isNull(orders.deletedAt)
		)

		// Count active orders (in progress statuses)
		const activeOrderStatuses = [
			'CONFIRMED',
			'IN_PREPARATION',
			'READY_FOR_DELIVERY',
			'IN_TRANSIT',
			'DELIVERED',
			'IN_USE',
			'AWAITING_RETURN',
		] as const
		const activeOrders = await db
			.select()
			.from(orders)
			.where(
				and(baseCondition, inArray(orders.status, activeOrderStatuses))
			)

		// Count pending quotes
		const pendingQuotes = await db
			.select()
			.from(orders)
			.where(and(baseCondition, sql`${orders.status} = 'QUOTED'`))

		// Count upcoming events (future events in pre-delivery statuses) - Updated for Feedback #1
		const upcomingEventStatuses = ['CONFIRMED', 'IN_PREPARATION'] as const
		const upcomingEvents = await db
			.select()
			.from(orders)
			.where(
				and(
					baseCondition,
					sql`${orders.eventStartDate} >= ${today}`,
					inArray(orders.status, upcomingEventStatuses)
				)
			)

		// Count orders awaiting return
		const awaitingReturn = await db
			.select()
			.from(orders)
			.where(
				and(baseCondition, sql`${orders.status} = 'AWAITING_RETURN'`)
			)

		// Get 5 most recent orders
		const recentOrders = await db
			.select({
				id: orders.id,
				orderId: orders.orderId,
				venueName: orders.venueName,
				eventStartDate: orders.eventStartDate,
				status: orders.status,
				createdAt: orders.createdAt,
			})
			.from(orders)
			.where(baseCondition)
			.orderBy(desc(orders.createdAt))
			.limit(5)

		return successResponse({
			summary: {
				activeOrders: activeOrders.length,
				pendingQuotes: pendingQuotes.length,
				upcomingEvents: upcomingEvents.length,
				awaitingReturn: awaitingReturn.length,
			},
			recentOrders: recentOrders.map(order => ({
				id: order.id,
				orderId: order.orderId,
				venueName: order.venueName,
				eventStartDate: order.eventStartDate,
				status: order.status,
				createdAt: order.createdAt,
			})),
		})
	} catch (error) {
		console.error('Error fetching dashboard summary:', error)
		return errorResponse('Failed to fetch dashboard summary', 500)
	}
}
