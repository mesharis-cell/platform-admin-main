import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Asset, AssetWithDetails, CreateAssetRequest } from '@/types/asset';

// Query keys
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};

// Fetch assets list
async function fetchAssets(params?: Record<string, string>): Promise<{ assets: Asset[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/assets?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch assets');
  }
  return response.json();
}

// Fetch single asset
async function fetchAsset(id: string): Promise<{ asset: AssetWithDetails }> {
  const response = await fetch(`/api/assets/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch asset');
  }
  return response.json();
}

// Create asset
async function createAsset(data: CreateAssetRequest): Promise<Asset> {
  const response = await fetch('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create asset');
  }
  return response.json();
}

// Update asset
async function updateAsset(id: string, data: Partial<CreateAssetRequest>): Promise<Asset> {
  const response = await fetch(`/api/assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update asset');
  }
  return response.json();
}

// Delete asset
async function deleteAsset(id: string): Promise<void> {
  const response = await fetch(`/api/assets/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete asset');
  }
}

// Upload image
async function uploadImage(formData: FormData): Promise<{ imageUrl: string }> {
  const response = await fetch('/api/assets/upload-image', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to upload image');
  }
  return response.json();
}

// Generate QR code
async function generateQRCode(qrCode: string): Promise<{ qrCodeImage: string }> {
  const response = await fetch('/api/assets/qr-code/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrCode }),
  });
  if (!response.ok) {
    throw new Error('Failed to generate QR code');
  }
  return response.json();
}

// Hooks
export function useAssets(params?: Record<string, string>) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: () => fetchAssets(params),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => fetchAsset(id),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: uploadImage,
  });
}

export function useGenerateQRCode() {
  return useMutation({
    mutationFn: generateQRCode,
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAssetRequest> }) =>
      updateAsset(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}
