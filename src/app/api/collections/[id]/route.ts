// Phase 4: Single Collection API Routes

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse, requireCompanyAccess } from '@/lib/api/auth-middleware';
import {
	getCollectionById,
	updateCollection,
	deleteCollection,
} from '@/lib/services/collection-service';
import type { UpdateCollectionRequest } from '@/types/collection';

// GET /api/collections/[id] - Get collection details with items
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission('collections:read');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const { id } = await params;

		const collection = await getCollectionById(id);

		if (!collection) {
			return errorResponse('Collection not found', 404);
		}

		// Check company access
		const companyCheck = await requireCompanyAccess(collection.company);
		if (companyCheck instanceof Response) return companyCheck;

		return successResponse({ collection }, 200);
	} catch (error) {
		console.error('Error fetching collection:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to fetch collection',
			500
		);
	}
}

// PUT /api/collections/[id] - Update collection
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission('collections:update');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const { id } = await params;

		// Check collection exists and get company
		const existing = await getCollectionById(id);

		if (!existing) {
			return errorResponse('Collection not found', 404);
		}

		// Check company access
		const companyCheck = await requireCompanyAccess(existing.company);
		if (companyCheck instanceof Response) return companyCheck;

		const body = (await request.json()) as UpdateCollectionRequest;

		const collection = await updateCollection(id, body);

		return successResponse({ collection }, 200);
	} catch (error) {
		console.error('Error updating collection:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to update collection',
			500
		);
	}
}

// DELETE /api/collections/[id] - Soft delete collection
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission('collections:delete');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const { id } = await params;

		// Check collection exists and get company
		const existing = await getCollectionById(id);

		if (!existing) {
			return errorResponse('Collection not found', 404);
		}

		// Check company access
		const companyCheck = await requireCompanyAccess(existing.company);
		if (companyCheck instanceof Response) return companyCheck;

		await deleteCollection(id);

		return successResponse({ message: 'Collection deleted successfully' }, 200);
	} catch (error) {
		console.error('Error deleting collection:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to delete collection',
			500
		);
	}
}
