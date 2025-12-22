// Phase 4: Single Collection Item API Routes

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import {
	updateCollectionItem,
	removeCollectionItem,
} from '@/lib/services/collection-service';
import type { UpdateCollectionItemRequest } from '@/types/collection';

// PUT /api/collections/[id]/items/[itemId] - Update collection item
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; itemId: string }> }
) {
	const authResult = await requirePermission('collections:update');
	if (authResult instanceof Response) return authResult;

	try {
		const { itemId } = await params;

		const body = (await request.json()) as UpdateCollectionItemRequest;

		const collectionItem = await updateCollectionItem(itemId, body);

		return successResponse({ collectionItem }, 200);
	} catch (error) {
		console.error('Error updating collection item:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to update collection item',
			500
		);
	}
}

// DELETE /api/collections/[id]/items/[itemId] - Remove item from collection
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; itemId: string }> }
) {
	const authResult = await requirePermission('collections:update');
	if (authResult instanceof Response) return authResult;

	try {
		const { itemId } = await params;

		await removeCollectionItem(itemId);

		return successResponse({ message: 'Item removed from collection' }, 200);
	} catch (error) {
		console.error('Error removing collection item:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to remove collection item',
			500
		);
	}
}
