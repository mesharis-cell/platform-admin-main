// Phase 4: Catalog Asset Details API Route

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse, requireCompanyAccess } from '@/lib/api/auth-middleware';
import { getCatalogAssetDetails } from '@/lib/services/catalog-service';
import { db } from '@/db';
import { assets } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';

// GET /api/catalog/assets/[id] - Get detailed asset view for catalog
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission('assets:read');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const { id } = await params;

		const asset = await getCatalogAssetDetails(id);

		if (!asset) {
			return errorResponse('Asset not found', 404);
		}

		// Check company access
		const assetRecord = await db.query.assets.findFirst({
			where: eq(assets.id, id),
			columns: {
				company: true,
			},
		});

		if (!assetRecord) {
			return errorResponse('Asset not found', 404);
		}

		const companyCheck = await requireCompanyAccess(assetRecord.company);
		if (companyCheck instanceof Response) return companyCheck;

		return successResponse({ asset }, 200);
	} catch (error) {
		console.error('Error fetching catalog asset:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to fetch asset',
			500
		);
	}
}
