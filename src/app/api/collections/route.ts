// Phase 4: Collection Management API Routes

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { getUserCompanyScope } from '@/lib/auth/permissions';
import {
	createCollection,
	listCollections,
} from '@/lib/services/collection-service';
import type { CreateCollectionRequest, CollectionListParams } from '@/types/collection';

// POST /api/collections - Create new collection
export async function POST(request: NextRequest) {
	const authResult = await requirePermission('collections:create');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const body = (await request.json()) as CreateCollectionRequest;

		// Validate required fields
		if (!body.company || !body.name) {
			return errorResponse('Company and name are required', 400);
		}

		// Create collection
		const collection = await createCollection(body);

		return successResponse({ collection }, 201);
	} catch (error) {
		console.error('Error creating collection:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to create collection',
			500
		);
	}
}

// GET /api/collections - List collections with filtering
export async function GET(request: NextRequest) {
	const authResult = await requirePermission('collections:read');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const searchParams = request.nextUrl.searchParams;

		const params: CollectionListParams = {
			company: searchParams.get('company') || undefined,
			brand: searchParams.get('brand') || undefined,
			category: searchParams.get('category') || undefined,
			search: searchParams.get('search') || undefined,
			includeDeleted: searchParams.get('includeDeleted') === 'true',
			limit: parseInt(searchParams.get('limit') || '50'),
			offset: parseInt(searchParams.get('offset') || '0'),
		};

		// Get user's company scope for multi-tenancy filtering
		const companyScope = getUserCompanyScope(user);

		// List collections with company scope enforcement
		const result = await listCollections(params, companyScope);

		return successResponse(result, 200);
	} catch (error) {
		console.error('Error listing collections:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to list collections',
			500
		);
	}
}
