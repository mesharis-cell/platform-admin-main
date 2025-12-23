"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Brand, BrandListResponse, CreateBrandRequest, UpdateBrandRequest } from '@/types';
import { apiClient } from '@/lib/api/api-client';

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
  const response = await apiClient.get(`/operations/v1/brand?${searchParams}`);
  return response.data;
}

// Create brand
async function createBrand(data: CreateBrandRequest): Promise<Brand> {
  const response = await apiClient.post('/operations/v1/brand', data);
  return response.data;
}

// Update brand
async function updateBrand({ id, data }: { id: string; data: UpdateBrandRequest }): Promise<Brand> {
  const response = await apiClient.patch(`/operations/v1/brand/${id}`, data);
  return response.data;
}

// Delete brand
async function deleteBrand(id: string): Promise<void> {
  const response = await apiClient.delete(`/operations/v1/brand/${id}`);
  return response.data;
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
