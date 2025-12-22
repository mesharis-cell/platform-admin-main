/**
 * Phase 5: Pricing Tier Calculate API Route
 * GET /api/pricing-tiers/calculate - Calculate estimated price for volume and location
 * Returns tier-based flat rate + PMG margin for client estimate
 */

import { NextRequest } from 'next/server'
import {
	requirePermission,
	errorResponse,
	successResponse,
} from '@/lib/api/auth-middleware'
import { findMatchingTier } from '@/lib/services/pricing-tier-service'
import { db } from '@/db'
import { companies } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/pricing-tiers/calculate
 * Calculate A2 base price for given volume and location
 * Utility endpoint for order creation in Phase 6+
 * Auth: Any authenticated user (clients need this for checkout)
 */
export async function GET(request: NextRequest) {
	const authResult = await requirePermission('orders:create')
	if (authResult instanceof Response) return authResult

	const { user } = authResult

	try {
		const { searchParams } = new URL(request.url)

		const country = searchParams.get('country')
		const city = searchParams.get('city')
		const volumeStr = searchParams.get('volume')

		// Validation
		if (!country || country.trim().length === 0) {
			return errorResponse('country is required', 400)
		}

		if (!city || city.trim().length === 0) {
			return errorResponse('city is required', 400)
		}

		if (!volumeStr) {
			return errorResponse('volume is required', 400)
		}

		const volume = parseFloat(volumeStr)
		if (isNaN(volume) || volume < 0) {
			return errorResponse('volume must be a positive number', 400)
		}

		// Find matching tier
		const matchingTier = await findMatchingTier(country, city, volume)

		if (!matchingTier) {
			return errorResponse(
				`No active pricing tier found for ${city} with volume ${volume}m³`,
				404
			)
		}

		// Get user's company to fetch PMG margin
		const companyId = user.companies[0] === '*' ? null : user.companies[0]
		let pmgMarginPercent = 25.0 // Default

		if (companyId) {
			const company = await db.query.companies.findFirst({
				where: eq(companies.id, companyId),
			})
			if (company) {
				pmgMarginPercent = parseFloat(company.pmgMarginPercent)
			}
		}

		// Calculate estimated total (flat rate + margin)
		const a2BasePrice = matchingTier.basePrice // Already a number from mapper
		const pmgMarginAmount = a2BasePrice * (pmgMarginPercent / 100)
		const estimatedTotal = a2BasePrice + pmgMarginAmount

		return successResponse(
			{
				pricingTierId: matchingTier.id,
				country: matchingTier.country,
				city: matchingTier.city,
				volumeMin: matchingTier.volumeMin,
				volumeMax: matchingTier.volumeMax,
				basePrice: matchingTier.basePrice, // A2 flat rate for this tier
				pmgMarginPercent: pmgMarginPercent.toFixed(2),
				estimatedTotal: estimatedTotal.toFixed(2), // Final estimate with margin
				matchedVolume: volume,
				note: 'This is a flat rate for the volume range, not a per-m³ rate',
			},
			200
		)
	} catch (error) {
		if (error instanceof Error) {
			return errorResponse(error.message, 400)
		}
		return errorResponse('Failed to calculate pricing', 500)
	}
}
