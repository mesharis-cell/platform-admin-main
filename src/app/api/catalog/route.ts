// Phase 4: Client Catalog API Route

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { getUserCompanyScope } from '@/lib/auth/permissions';
import { browseCatalog } from '@/lib/services/catalog-service';
import type { CatalogListParams } from '@/types/collection';

// GET /api/catalog - Browse client-facing catalog with assets and collections
export async function GET(request: NextRequest) {
	const authResult = await requirePermission('assets:read');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const searchParams = request.nextUrl.searchParams;

		const params: CatalogListParams = {
			company: searchParams.get('company') || undefined,
			brand: searchParams.get('brand') || undefined,
			category: searchParams.get('category') || undefined,
			search: searchParams.get('search') || undefined,
			type: (searchParams.get('type') as 'asset' | 'collection' | 'all') || 'all',
			limit: parseInt(searchParams.get('limit') || '50'),
			offset: parseInt(searchParams.get('offset') || '0'),
		};

		// Get user's company scope for multi-tenancy filtering
		const companyScope = getUserCompanyScope(user);

		// Browse catalog with company scope enforcement
		const result = await browseCatalog(params, companyScope);

		return successResponse(result, 200);
	} catch (error) {
		console.error('Error browsing catalog:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to browse catalog',
			500
		);
	}
}
