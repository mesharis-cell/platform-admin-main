// Phase 4: Collections React Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	Collection,
	CollectionWithDetails,
	CollectionListParams,
	CreateCollectionRequest,
	UpdateCollectionRequest,
	AddCollectionItemRequest,
	UpdateCollectionItemRequest,
	CollectionAvailabilityResponse,
} from '@/types/collection';

// ========================================
// Collection Query Hooks
// ========================================

export function useCollections(params: CollectionListParams = {}) {
	return useQuery({
		queryKey: ['collections', params],
		queryFn: async () => {
			const queryParams = new URLSearchParams();

			if (params.company) queryParams.set('company', params.company);
			if (params.brand) queryParams.set('brand', params.brand);
			if (params.category) queryParams.set('category', params.category);
			if (params.search) queryParams.set('search', params.search);
			if (params.includeDeleted) queryParams.set('includeDeleted', 'true');
			if (params.limit) queryParams.set('limit', params.limit.toString());
			if (params.offset) queryParams.set('offset', params.offset.toString());

			const response = await fetch(`/api/collections?${queryParams.toString()}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to fetch collections');
			}

			return response.json();
		},
		staleTime: 30000, // 30 seconds
	});
}

export function useCollection(id: string | undefined) {
	return useQuery({
		queryKey: ['collections', id],
		queryFn: async () => {
			if (!id) throw new Error('Collection ID required');

			const response = await fetch(`/api/collections/${id}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to fetch collection');
			}

			return response.json();
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

export function useCollectionAvailability(
	id: string | undefined,
	eventStartDate: string,
	eventEndDate: string
) {
	return useQuery({
		queryKey: ['collections', id, 'availability', eventStartDate, eventEndDate],
		queryFn: async () => {
			if (!id) throw new Error('Collection ID required');

			const queryParams = new URLSearchParams({
				eventStartDate,
				eventEndDate,
			});

			const response = await fetch(`/api/collections/${id}/availability?${queryParams.toString()}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to check collection availability');
			}

			return response.json() as Promise<CollectionAvailabilityResponse>;
		},
		enabled: !!id && !!eventStartDate && !!eventEndDate,
		staleTime: 10000, // 10 seconds (fresher data for availability)
	});
}

// ========================================
// Collection Mutation Hooks
// ========================================

export function useCreateCollection() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateCollectionRequest) => {
			const response = await fetch('/api/collections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create collection');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['collections'] });
		},
	});
}

export function useUpdateCollection(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UpdateCollectionRequest) => {
			const response = await fetch(`/api/collections/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update collection');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['collections'] });
			queryClient.invalidateQueries({ queryKey: ['collections', id] });
		},
	});
}

export function useDeleteCollection() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`/api/collections/${id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete collection');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['collections'] });
		},
	});
}

// ========================================
// Collection Item Mutation Hooks
// ========================================

export function useAddCollectionItem(collectionId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: AddCollectionItemRequest) => {
			const response = await fetch(`/api/collections/${collectionId}/items`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to add collection item');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['collections', collectionId] });
			queryClient.invalidateQueries({ queryKey: ['collections'] });
		},
	});
}

export function useUpdateCollectionItem(collectionId: string, itemId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UpdateCollectionItemRequest) => {
			const response = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update collection item');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['collections', collectionId] });
		},
	});
}

export function useRemoveCollectionItem(collectionId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (itemId: string) => {
			const response = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to remove collection item');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['collections', collectionId] });
			queryClient.invalidateQueries({ queryKey: ['collections'] });
		},
	});
}

// ========================================
// Collection Image Upload Hook
// ========================================

export function useUploadCollectionImages() {
	return useMutation({
		mutationFn: async (files: File[]) => {
			const formData = new FormData();

			files.forEach((file) => {
				formData.append('images', file);
			});

			const response = await fetch('/api/uploads/collection-images', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to upload collection images');
			}

			const data = await response.json();
			return data.urls as string[];
		},
	});
}
