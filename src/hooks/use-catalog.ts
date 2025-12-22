// Phase 4: Catalog React Query Hooks

import { useQuery } from '@tanstack/react-query';
import type {
	CatalogListParams,
	CatalogListResponse,
	CatalogAssetDetailsResponse,
	CatalogCollectionDetailsResponse,
} from '@/types/collection';

// ========================================
// Catalog Query Hooks
// ========================================

export function useCatalog(params: CatalogListParams = {}) {
	return useQuery({
		queryKey: ['catalog', params],
		queryFn: async () => {
			const queryParams = new URLSearchParams();

			if (params.company) queryParams.set('company', params.company);
			if (params.brand) queryParams.set('brand', params.brand);
			if (params.category) queryParams.set('category', params.category);
			if (params.search) queryParams.set('search', params.search);
			if (params.type) queryParams.set('type', params.type);
			if (params.limit) queryParams.set('limit', params.limit.toString());
			if (params.offset) queryParams.set('offset', params.offset.toString());

			const response = await fetch(`/api/catalog?${queryParams.toString()}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to fetch catalog');
			}

			return response.json() as Promise<CatalogListResponse>;
		},
		staleTime: 30000, // 30 seconds
	});
}

export function useCatalogAsset(id: string | undefined) {
	return useQuery({
		queryKey: ['catalog', 'assets', id],
		queryFn: async () => {
			if (!id) throw new Error('Asset ID required');

			const response = await fetch(`/api/catalog/assets/${id}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to fetch asset details');
			}

			return response.json() as Promise<CatalogAssetDetailsResponse>;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

export function useCatalogCollection(id: string | undefined) {
	return useQuery({
		queryKey: ['catalog', 'collections', id],
		queryFn: async () => {
			if (!id) throw new Error('Collection ID required');

			const response = await fetch(`/api/catalog/collections/${id}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to fetch collection details');
			}

			return response.json() as Promise<CatalogCollectionDetailsResponse>;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}
