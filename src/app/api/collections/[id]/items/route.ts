// Phase 4: Collection Items API Routes

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse, requireCompanyAccess } from '@/lib/api/auth-middleware';
import {
	getCollectionById,
	addCollectionItem,
} from '@/lib/services/collection-service';
import type { AddCollectionItemRequest } from '@/types/collection';

// POST /api/collections/[id]/items - Add asset to collection
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission('collections:assign_assets');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const { id: collectionId } = await params;

		// Check collection exists and get company
		const collection = await getCollectionById(collectionId);

		if (!collection) {
			return errorResponse('Collection not found', 404);
		}

		// Check company access
		const companyCheck = await requireCompanyAccess(collection.company);
		if (companyCheck instanceof Response) return companyCheck;

		const body = (await request.json()) as AddCollectionItemRequest;

		// Validate required fields
		if (!body.asset || !body.defaultQuantity || body.defaultQuantity < 1) {
			return errorResponse('Asset ID and positive default quantity are required', 400);
		}

		const collectionItem = await addCollectionItem(collectionId, body);

		return successResponse({ collectionItem }, 201);
	} catch (error) {
		console.error('Error adding collection item:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to add collection item',
			500
		);
	}
}
