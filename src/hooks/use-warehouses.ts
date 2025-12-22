import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Warehouse, WarehouseListResponse } from '@/types';

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
  const response = await fetch(`/api/warehouses?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch warehouses');
  }
  return response.json();
}

// Create warehouse
async function createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
  const response = await fetch('/api/warehouses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create warehouse');
  }
  return response.json();
}

// Update warehouse
async function updateWarehouse({ id, data }: { id: string; data: Partial<Warehouse> }): Promise<Warehouse> {
  const response = await fetch(`/api/warehouses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update warehouse');
  }
  return response.json();
}

// Archive warehouse
async function archiveWarehouse(id: string): Promise<void> {
  const response = await fetch(`/api/warehouses/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to archive warehouse');
  }
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
