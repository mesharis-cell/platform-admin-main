/**
 * POST /api/assets/check-availability
 * Check asset availability for specific date range
 * Feedback #4 & #5: Date-based availability with buffer days
 *
 * Auth: All authenticated users
 */

import { NextRequest } from 'next/server'
import {
	requireAuth,
	errorResponse,
	successResponse,
} from '@/lib/api/auth-middleware'
import {
	getAssetAvailability,
	checkMultipleAssetsAvailability,
	getAssetAvailabilitySummary,
} from '@/lib/services/availability-service'

export async function POST(request: NextRequest) {
	// Validate authentication
	const authResult = await requireAuth()
	if (authResult instanceof Response) return authResult

	try {
		const body = await request.json()
		const { assetId, assetIds, startDate, endDate, items } = body

		// Validate required fields
		if (!startDate || !endDate) {
			return errorResponse('startDate and endDate are required', 400)
		}

		const start = new Date(startDate)
		const end = new Date(endDate)

		// Validate dates
		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			return errorResponse('Invalid date format', 400)
		}

		if (end < start) {
			return errorResponse('endDate must be after startDate', 400)
		}

		// Single asset check
		if (assetId) {
			const availability = await getAssetAvailability(assetId, start, end)
			return successResponse(availability, 200)
		}

		// Multiple assets check (for cart validation)
		if (items && Array.isArray(items)) {
			const result = await checkMultipleAssetsAvailability(
				items,
				start,
				end
			)
			return successResponse(result, 200)
		}

		// Batch asset summary check (for catalog display)
		if (assetIds && Array.isArray(assetIds)) {
			const summaries = await Promise.all(
				assetIds.map(async (id: string) => {
					const summary = await getAssetAvailabilitySummary(
						id,
						start,
						end
					)
					return {
						assetId: id,
						...summary,
					}
				})
			)
			return successResponse({ assets: summaries }, 200)
		}

		return errorResponse(
			'Either assetId, assetIds, or items array is required',
			400
		)
	} catch (error) {
		console.error('Error checking availability:', error)
		return errorResponse(
			error instanceof Error
				? error.message
				: 'Failed to check availability',
			400
		)
	}
}
