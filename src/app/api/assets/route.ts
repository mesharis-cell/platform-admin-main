/**
 * Asset Management API Routes
 * Phase 3: Asset Management & QR Code Generation
 *
 * POST /api/assets - Create new asset
 * GET /api/assets - List assets with filtering
 */

import { NextRequest } from 'next/server'
import {
	requireAuth,
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { createAsset, listAssets } from '@/lib/services/asset-service'
import { getUserCompanyScope } from '@/lib/auth/permissions'
import type { CreateAssetRequest, AssetListParams } from '@/types/asset'

/**
 * POST /api/assets - Create new asset
 * Permission: assets:create (A2 Staff only)
 */
export async function POST(request: NextRequest) {
	// Require assets:create permission
	const authResult = await requirePermission('assets:create')
	if (authResult instanceof Response) return authResult

	const { user } = authResult

	try {
		const body = (await request.json()) as CreateAssetRequest

		// Validate required fields
		if (
			!body.company ||
			!body.warehouse ||
			!body.zone ||
			!body.name ||
			!body.category
		) {
			return errorResponse('Missing required fields', 400)
		}

		if (
			!body.trackingMethod ||
			!['INDIVIDUAL', 'BATCH'].includes(body.trackingMethod)
		) {
			return errorResponse(
				'Invalid tracking method. Must be INDIVIDUAL or BATCH',
				400
			)
		}

		if (
			!body.weight ||
			!body.dimensionLength ||
			!body.dimensionWidth ||
			!body.dimensionHeight ||
			!body.volume
		) {
			return errorResponse(
				'Physical specifications (weight, dimensions, volume) are required',
				400
			)
		}

		if (body.trackingMethod === 'BATCH' && !body.packaging) {
			return errorResponse(
				'Packaging description is required for BATCH tracking method',
				400
			)
		}

		if (!body.totalQuantity || body.totalQuantity < 1) {
			return errorResponse('Total quantity must be at least 1', 400)
		}

		// Create asset(s)
		// For INDIVIDUAL tracking with quantity > 1, multiple assets will be created
		// For BATCH tracking, one asset with quantity field will be created
		const result = await createAsset(body, user.id) // Pass user ID for condition history

		return successResponse(
			{
				asset: result.asset,
				assetsCreated: result.assetsCreated,
				message:
					result.assetsCreated > 1
						? `Successfully created ${result.assetsCreated} individual assets with unique QR codes`
						: 'Asset created successfully',
			},
			201
		)
	} catch (error) {
		console.error('Error creating asset:', error)
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to create asset',
			500
		)
	}
}

/**
 * GET /api/assets - List assets with filtering
 * Permission: assets:read (A2 Staff, PMG Admin, Client User)
 */
export async function GET(request: NextRequest) {
	// Require assets:read permission
	const authResult = await requirePermission('assets:read')
	if (authResult instanceof Response) return authResult

	const { user } = authResult

	try {
		const { searchParams } = new URL(request.url)

		// Parse query parameters
		const params: AssetListParams = {
			company: searchParams.get('company') || undefined,
			brand: searchParams.get('brand') || undefined,
			warehouse: searchParams.get('warehouse') || undefined,
			zone: searchParams.get('zone') || undefined,
			category:
				(searchParams.get('category') as AssetListParams['category']) ||
				undefined,
			condition:
				(searchParams.get(
					'condition'
				) as AssetListParams['condition']) || undefined,
			status:
				(searchParams.get('status') as AssetListParams['status']) ||
				undefined,
			search: searchParams.get('search') || undefined,
			limit: searchParams.get('limit')
				? parseInt(searchParams.get('limit')!)
				: 50,
			offset: searchParams.get('offset')
				? parseInt(searchParams.get('offset')!)
				: 0,
		}

		// Get user's company scope
		const companyScopeFilter = getUserCompanyScope(user)

		// List assets with company scoping
		const { assets, total } = await listAssets(params, companyScopeFilter)

		return successResponse(
			{
				assets,
				total,
				limit: params.limit,
				offset: params.offset,
			},
			200
		)
	} catch (error) {
		console.error('Error listing assets:', error)
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to list assets',
			500
		)
	}
}
