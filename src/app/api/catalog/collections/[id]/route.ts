// Phase 4: Catalog Collection Preview API Route

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse, requireCompanyAccess } from '@/lib/api/auth-middleware';
import { getCatalogCollectionPreview } from '@/lib/services/catalog-service';
import { db } from '@/db';
import { collections } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';

// GET /api/catalog/collections/[id] - Preview collection with per-item availability
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission('collections:read');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const { id } = await params;

		const collection = await getCatalogCollectionPreview(id);

		if (!collection) {
			return errorResponse('Collection not found', 404);
		}

		// Check company access
		const collectionRecord = await db.query.collections.findFirst({
			where: eq(collections.id, id),
			columns: {
				company: true,
			},
		});

		if (!collectionRecord) {
			return errorResponse('Collection not found', 404);
		}

		const companyCheck = await requireCompanyAccess(collectionRecord.company);
		if (companyCheck instanceof Response) return companyCheck;

		return successResponse({ collection }, 200);
	} catch (error) {
		console.error('Error fetching catalog collection:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to fetch collection',
			500
		);
	}
}
