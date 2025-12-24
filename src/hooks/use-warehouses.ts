"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateWarehouseRequest, Warehouse, WarehouseListResponse } from '@/types';
import { apiClient } from '@/lib/api/api-client';

// Query keys
export const warehouseKeys = {
  all: ['warehouses'] as const,
  lists: () => [...warehouseKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...warehouseKeys.lists(), params] as const,
  details: () => [...warehouseKeys.all, 'detail'] as const,
  detail: (id: string) => [...warehouseKeys.details(), id] as const,
};

// Fetch warehouses list
async function fetchWarehouses(params?: Record<string, string>): Promise<WarehouseListResponse> {
  const searchParams = new URLSearchParams(params);
  const response = await apiClient.get(`/operations/v1/warehouse?${searchParams}`);
  return response.data;
}

// Create warehouse
async function createWarehouse(data: Partial<CreateWarehouseRequest>): Promise<Warehouse> {
  const response = await apiClient.post('/operations/v1/warehouse', data);
  return response.data;
}

// Update warehouse
async function updateWarehouse({ id, data }: { id: string; data: Partial<Warehouse> }): Promise<Warehouse> {
  const response = await apiClient.patch(`/operations/v1/warehouse/${id}`, data);
  return response.data;
}

// Archive warehouse
async function archiveWarehouse(id: string): Promise<void> {
  const response = await apiClient.delete(`/operations/v1/warehouse/${id}`);
  return response.data;
}

// Hooks
export function useWarehouses(params?: Record<string, string>) {
  return useQuery({
    queryKey: warehouseKeys.list(params),
    queryFn: () => fetchWarehouses(params),
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

export function useArchiveWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}
