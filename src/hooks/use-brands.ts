import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Brand, BrandListResponse } from '@/types';

// Query keys
export const brandKeys = {
  all: ['brands'] as const,
  lists: () => [...brandKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...brandKeys.lists(), params] as const,
  details: () => [...brandKeys.all, 'detail'] as const,
  detail: (id: string) => [...brandKeys.details(), id] as const,
};

// Fetch brands list
async function fetchBrands(params?: Record<string, string>): Promise<BrandListResponse> {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/brands?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch brands');
  }
  return response.json();
}

// Create brand
async function createBrand(data: Partial<Brand>): Promise<Brand> {
  const response = await fetch('/api/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create brand');
  }
  return response.json();
}

// Update brand
async function updateBrand({ id, data }: { id: string; data: Partial<Brand> }): Promise<Brand> {
  const response = await fetch(`/api/brands/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update brand');
  }
  return response.json();
}

// Delete brand
async function deleteBrand(id: string): Promise<void> {
  const response = await fetch(`/api/brands/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete brand');
  }
}

// Hooks
export function useBrands(params?: Record<string, string>) {
  return useQuery({
    queryKey: brandKeys.list(params),
    queryFn: () => fetchBrands(params),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
    },
  });
}
