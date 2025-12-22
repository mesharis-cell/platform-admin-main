/**
 * Batch Asset Availability Check API
 * Validates multiple assets in a single request for cart validation
 */

import { NextRequest } from 'next/server'
import {
	requireAuth,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { assets } from '@/db/schema/schema'
import { inArray, and, isNull, eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
	try {
		const authResult = await requireAuth()
		if (authResult instanceof Response) return authResult
		const { user } = authResult

		const companyId = user.companies[0] === '*' ? null : user.companies[0]
		if (!companyId) {
			return errorResponse('Company ID is required', 400)
		}

		const body = await request.json()
		const { assetIds } = body

		if (!Array.isArray(assetIds) || assetIds.length === 0) {
			return errorResponse('assetIds array is required', 400)
		}

		// Fetch assets with availability info
		// Feedback #4: availableQuantity removed, return totalQuantity as placeholder
		const foundAssets = await db
			.select({
				id: assets.id,
				name: assets.name,
				status: assets.status,
				availableQuantity: assets.totalQuantity, // Placeholder - real availability needs dates
				volume: assets.volume,
				weight: assets.weight,
			})
			.from(assets)
			.where(
				and(
					inArray(assets.id, assetIds),
					eq(assets.company, companyId),
					isNull(assets.deletedAt)
				)
			)

		return successResponse({ assets: foundAssets }, 200)
	} catch (error) {
		console.error('Error fetching batch availability:', error)
		return errorResponse('Failed to fetch availability', 500)
	}
}
