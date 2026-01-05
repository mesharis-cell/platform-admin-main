"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Asset, AssetsDetails, AssetWithDetails, CreateAssetRequest } from '@/types/asset';
import { apiClient } from '@/lib/api/api-client';
import { throwApiError } from '@/lib/utils/throw-api-error';

// Query keys
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};

// Fetch assets list
async function fetchAssets(params?: Record<string, string>): Promise<{ 
  data: Asset[]; 
  meta: { total: number; limit: number; page: number; summary: { red_count: number; orange_count: number, green_count: number } } 
  }> {
  try {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) {
        delete params[key];
      }
    }
    console.log(params)
    const searchParams = new URLSearchParams(params);
    console.log(searchParams)
    const response = await apiClient.get(`/operations/v1/asset?${searchParams}`);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Fetch single asset
async function fetchAsset(id: string): Promise<{ data: AssetsDetails }> {
  try {
    const response = await apiClient.get(`/operations/v1/asset/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Create asset
async function createAsset(data: CreateAssetRequest): Promise<Asset> {
  try {
    const response = await apiClient.post(`/operations/v1/asset`, data);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Update asset
async function updateAsset(id: string, data: Partial<CreateAssetRequest>): Promise<Asset> {
  try {
    const response = await apiClient.patch(`/operations/v1/asset/${id}`, data);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Delete asset
async function deleteAsset(id: string): Promise<void> {
  try {
    const response = await apiClient.delete(`/operations/v1/asset/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Upload image
async function uploadImage(formData: FormData): Promise<{ data: { imageUrls: string[], presignedUrl: string } }> {
  try {
    const response = await apiClient.post('/operations/v1/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Generate QR code
async function generateQRCode(qrCode: string): Promise<{ qrCodeImage: string }> {
  try {
    const response = await apiClient.post('/api/assets/qr-code/generate', {
      qrCode,
    });

    return response.data;
  } catch (error) {
    throwApiError(error);
  }
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
