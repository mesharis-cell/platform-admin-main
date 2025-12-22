import { NextRequest } from 'next/server'
import {
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { orders, companies, brands } from '@/db/schema/schema'
import { eq, and, or, ilike, desc, isNull, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
	// Require authentication and orders:read permission
	const authResult = await requirePermission('orders:read')
	if (authResult instanceof Response) return authResult
	const { user } = authResult

	// Get query parameters
	const { searchParams } = new URL(request.url)
	const status = searchParams.get('status')
	const search = searchParams.get('search')
	const dateFrom = searchParams.get('dateFrom')
	const dateTo = searchParams.get('dateTo')
	const brand = searchParams.get('brand')
	const page = parseInt(searchParams.get('page') || '1', 10)
	const limit = parseInt(searchParams.get('limit') || '20', 10)

	try {
		// Get user's company (Client Users have single company in array)
		const userCompanyId = user.companies?.[0]
		if (!userCompanyId || userCompanyId === '*') {
			return errorResponse('Invalid company access', 403)
		}

		// Build WHERE conditions
		const conditions = [
			eq(orders.company, userCompanyId),
			isNull(orders.deletedAt),
		]

		// Apply status filter
		if (status) {
			conditions.push(sql`${orders.status} = ${status}`)
		}

		// Apply date range filters
		if (dateFrom) {
			conditions.push(sql`${orders.eventStartDate} >= ${dateFrom}`)
		}
		if (dateTo) {
			conditions.push(sql`${orders.eventStartDate} <= ${dateTo}`)
		}

		// Apply brand filter
		if (brand) {
			conditions.push(eq(orders.brand, brand))
		}

		// Apply search filter (order ID, venue name)
		let searchConditions = null
		if (search) {
			searchConditions = or(
				ilike(orders.orderId, `%${search}%`),
				ilike(orders.venueName, `%${search}%`)
			)
		}

		// Count total orders matching filters
		const countQuery = searchConditions
			? db
					.select()
					.from(orders)
					.where(and(...conditions, searchConditions))
			: db
					.select()
					.from(orders)
					.where(and(...conditions))

		const totalOrders = await countQuery
		const total = totalOrders.length

		// Calculate pagination
		const offset = (page - 1) * limit
		const totalPages = Math.ceil(total / limit)

		// Query orders
		const ordersList = await db
			.select()
			.from(orders)
			.where(
				searchConditions
					? and(...conditions, searchConditions)
					: and(...conditions)
			)
			.orderBy(desc(orders.createdAt))
			.limit(limit)
			.offset(offset)

		// Get company and brand info for each order
		const ordersWithDetails = await Promise.all(
			ordersList.map(async order => {
				const [companyData] = await db
					.select()
					.from(companies)
					.where(eq(companies.id, order.company))

				let brandData = null
				if (order.brand) {
					;[brandData] = await db
						.select()
						.from(brands)
						.where(eq(brands.id, order.brand))
				}

				return {
					id: order.id,
					orderId: order.orderId,
					company: companyData
						? { id: companyData.id, name: companyData.name }
						: null,
					brand: brandData
						? { id: brandData.id, name: brandData.name }
						: null,
					eventStartDate: order.eventStartDate,
					eventEndDate: order.eventEndDate,
					venueName: order.venueName,
					venueCity: order.venueCity,
					status: order.status,
					financialStatus: order.financialStatus, // Feedback #1: Include separate financial status
					finalTotalPrice: order.finalTotalPrice,
					createdAt: order.createdAt,
				}
			})
		)

		return successResponse({
			orders: ordersWithDetails,
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		})
	} catch (error) {
		console.error('Error fetching client orders:', error)
		return errorResponse('Failed to fetch orders', 500)
	}
}
