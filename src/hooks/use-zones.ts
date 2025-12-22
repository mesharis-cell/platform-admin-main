import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Zone, ZoneListResponse } from '@/types';

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
  const response = await fetch(`/api/zones?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch zones');
  }
  return response.json();
}

// Create zone
async function createZone(data: Partial<Zone>): Promise<Zone> {
  const response = await fetch('/api/zones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create zone');
  }
  return response.json();
}

// Update zone
async function updateZone({ id, data }: { id: string; data: Partial<Zone> }): Promise<Zone> {
  const response = await fetch(`/api/zones/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update zone');
  }
  return response.json();
}

// Delete zone
async function deleteZone(id: string): Promise<void> {
  const response = await fetch(`/api/zones/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete zone');
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

export function useDeleteZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.lists() });
    },
  });
}
