/**
 * Single Asset API Routes
 * Phase 3: Asset Management & QR Code Generation
 *
 * GET /api/assets/:id - Get asset details
 * PUT /api/assets/:id - Update asset
 * DELETE /api/assets/:id - Soft delete asset
 */

import { NextRequest } from 'next/server'
import {
	requireAuth,
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import {
	getAssetById,
	updateAsset,
	deleteAsset,
} from '@/lib/services/asset-service'
import { hasCompanyAccess } from '@/lib/auth/permissions'
import type { UpdateAssetRequest } from '@/types/asset'

/**
 * GET /api/assets/:id - Get asset details
 * Permission: assets:read (A2 Staff, PMG Admin, Client User)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	// Require assets:read permission
	const authResult = await requirePermission('assets:read')
	if (authResult instanceof Response) return authResult

	const { user } = authResult

	try {
		const { id } = await params

		// Get asset
		const asset = await getAssetById(id)

		if (!asset) {
			return errorResponse('Asset not found', 404)
		}

		// Check company access
		if (!hasCompanyAccess(user, asset.company)) {
			return errorResponse('You do not have access to this asset', 403)
		}

		return successResponse(
			{
				asset,
			},
			200
		)
	} catch (error) {
		console.error('Error getting asset:', error)
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to get asset',
			500
		)
	}
}

/**
 * PUT /api/assets/:id - Update asset
 * Permission: assets:update (A2 Staff only)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	// Require assets:update permission
	const authResult = await requirePermission('assets:update')
	if (authResult instanceof Response) return authResult

	const { user } = authResult

	try {
		const { id } = await params

		// Get existing asset to check company access
		const existing = await getAssetById(id)
		if (!existing) {
			return errorResponse('Asset not found', 404)
		}

		// Check company access
		if (!hasCompanyAccess(user, existing.company)) {
			return errorResponse('You do not have access to this asset', 403)
		}

		const body = (await request.json()) as UpdateAssetRequest

		// Update asset (pass user ID for condition history)
		const asset = await updateAsset(id, body, user.id)

		return successResponse(
			{
				asset,
			},
			200
		)
	} catch (error) {
		console.error('Error updating asset:', error)
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to update asset',
			500
		)
	}
}

/**
 * DELETE /api/assets/:id - Soft delete asset
 * Permission: assets:delete (A2 Staff only)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	// Require assets:delete permission
	const authResult = await requirePermission('assets:delete')
	if (authResult instanceof Response) return authResult

	const { user } = authResult

	try {
		const { id } = await params

		// Get existing asset to check company access
		const existing = await getAssetById(id)
		if (!existing) {
			return errorResponse('Asset not found', 404)
		}

		// Check company access
		if (!hasCompanyAccess(user, existing.company)) {
			return errorResponse('You do not have access to this asset', 403)
		}

		// Delete asset
		await deleteAsset(id)

		return successResponse(
			{
				message: 'Asset deleted successfully',
			},
			200
		)
	} catch (error) {
		console.error('Error deleting asset:', error)
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to delete asset',
			500
		)
	}
}
