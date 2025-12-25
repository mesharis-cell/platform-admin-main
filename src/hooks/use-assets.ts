"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Asset, AssetWithDetails, CreateAssetRequest } from '@/types/asset';
import { apiClient } from '@/lib/api/api-client';

// Query keys
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};

// Fetch assets list
async function fetchAssets(params?: Record<string, string>): Promise<{ data: Asset[]; meta: { total: number; limit: number; page: number } }> {
  const searchParams = new URLSearchParams(params);
  const response = await apiClient.get(`/operations/v1/asset?${searchParams}`);
  return response.data;
}

// Fetch single asset
async function fetchAsset(id: string): Promise<{ asset: AssetWithDetails }> {
  const response = await apiClient.get(`/operations/v1/asset/${id}`);
  return response.data;
}

// Create asset
async function createAsset(data: CreateAssetRequest): Promise<Asset> {
  const response = await apiClient.post(`/operations/v1/asset`, data);
  return response.data;
}

// Update asset
async function updateAsset(id: string, data: Partial<CreateAssetRequest>): Promise<Asset> {
  const response = await apiClient.put(`/operations/v1/asset/${id}`, data);
  return response.data;
}

// Delete asset
async function deleteAsset(id: string): Promise<void> {
  const response = await apiClient.delete(`/operations/v1/asset/${id}`);
  return response.data;
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
