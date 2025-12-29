"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Zone, ZoneListResponse } from '@/types';
import { apiClient } from '@/lib/api/api-client';
import { throwApiError } from '@/lib/utils/throw-api-error';

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
  try {
    const searchParams = new URLSearchParams(params);
    const response = await apiClient.get(`/operations/v1/zone?${searchParams}`);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Create zone
async function createZone(data: Partial<Zone>): Promise<Zone> {
  try {
    const response = await apiClient.post('/operations/v1/zone', data);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Update zone
async function updateZone({ id, data }: { id: string; data: Partial<Zone> }): Promise<Zone> {
  try {
    const response = await apiClient.patch(`/operations/v1/zone/${id}`, data);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Delete zone
async function deleteRestoreZone(id: string): Promise<void> {
  try {
    const response = await apiClient.delete(`/operations/v1/zone/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
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

export function useDeleteRestoreZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRestoreZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.lists() });
    },
  });
}
