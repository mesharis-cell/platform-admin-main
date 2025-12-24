"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Zone, ZoneListResponse } from '@/types';
import { apiClient } from '@/lib/api/api-client';

// Query keys
export const zoneKeys = {
  all: ['zones'] as const,
  lists: () => [...zoneKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...zoneKeys.lists(), params] as const,
  details: () => [...zoneKeys.all, 'detail'] as const,
  detail: (id: string) => [...zoneKeys.details(), id] as const,
};

// Fetch zones list
async function fetchZones(params?: Record<string, string>): Promise<ZoneListResponse> {
  const searchParams = new URLSearchParams(params);
  const response = await apiClient.get(`/operations/v1/zone?${searchParams}`);
  return response.data;
}

// Create zone
async function createZone(data: Partial<Zone>): Promise<Zone> {
  const response = await apiClient.post('/operations/v1/zone', data);
  return response.data;
}

// Update zone
async function updateZone({ id, data }: { id: string; data: Partial<Zone> }): Promise<Zone> {
  const response = await apiClient.patch(`/operations/v1/zone/${id}`, data);
  return response.data;
}

// Delete zone
async function deleteZone(id: string): Promise<void> {
  const response = await apiClient.delete(`/operations/v1/zone/${id}`);
  return response.data;
}

// Hooks
export function useZones(params?: Record<string, string>) {
  return useQuery({
    queryKey: zoneKeys.list(params),
    queryFn: () => fetchZones(params),
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.lists() });
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.lists() });
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.lists() });
    },
  });
}
