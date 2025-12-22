/**
 * Public Pricing Tier Locations API
 * Returns only country/city combinations without pricing details
 * No authentication required - used for checkout location dropdowns
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { db } from '@/db';
import { pricingTiers } from '@/db/schema/schema';
import { eq, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
	try {
		// Fetch only active pricing tier locations (no pricing details)
		const tiers = await db
			.select({
				country: pricingTiers.country,
				city: pricingTiers.city,
			})
			.from(pricingTiers)
			.where(eq(pricingTiers.isActive, true));

		// Extract unique countries
		const countries = Array.from(new Set(tiers.map((t) => t.country))).sort();

		// Group cities by country
		const locationsByCountry: Record<string, string[]> = {};
		tiers.forEach((tier) => {
			if (!locationsByCountry[tier.country]) {
				locationsByCountry[tier.country] = [];
			}
			if (!locationsByCountry[tier.country].includes(tier.city)) {
				locationsByCountry[tier.country].push(tier.city);
			}
		});

		// Sort cities within each country
		Object.keys(locationsByCountry).forEach((country) => {
			locationsByCountry[country].sort();
		});

		return successResponse(
			{
				countries,
				locationsByCountry,
			},
			200
		);
	} catch (error) {
		console.error('Error fetching pricing tier locations:', error);
		return errorResponse('Failed to fetch locations', 500);
	}
}
