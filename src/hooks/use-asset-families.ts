"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssetFamily } from "@/types/asset-family";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export const assetFamilyKeys = {
    all: ["asset-families"] as const,
    lists: () => [...assetFamilyKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...assetFamilyKeys.lists(), params] as const,
    details: () => [...assetFamilyKeys.all, "detail"] as const,
    detail: (id: string) => [...assetFamilyKeys.details(), id] as const,
};

async function fetchAssetFamilies(
    params?: Record<string, string>
): Promise<{ data: AssetFamily[] }> {
    try {
        const cleanedParams = { ...(params || {}) };
        for (const [key, value] of Object.entries(cleanedParams)) {
            if (value === undefined || value === "" || value === "all" || value === "_all_") {
                delete cleanedParams[key];
            }
        }

        const searchParams = new URLSearchParams(cleanedParams);
        const response = await apiClient.get(`/operations/v1/asset-family?${searchParams}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function fetchAssetFamily(id: string): Promise<{ data: AssetFamily }> {
    try {
        const response = await apiClient.get(`/operations/v1/asset-family/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

export function useAssetFamilies(params?: Record<string, string>) {
    return useQuery({
        queryKey: assetFamilyKeys.list(params),
        queryFn: () => fetchAssetFamilies(params),
    });
}

export function useAssetFamily(id: string) {
    return useQuery({
        queryKey: assetFamilyKeys.detail(id),
        queryFn: () => fetchAssetFamily(id),
        enabled: !!id,
    });
}

export function useUpdateAssetFamily() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<AssetFamily> }) => {
            const response = await apiClient.patch(`/operations/v1/asset-family/${id}`, data);
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: assetFamilyKeys.all });
            queryClient.invalidateQueries({ queryKey: assetFamilyKeys.detail(variables.id) });
        },
    });
}

export function useCreateAssetFamily() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const response = await apiClient.post(`/operations/v1/asset-family`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assetFamilyKeys.all });
            // When a new family is created with new_category, a new row is
            // inserted into asset_categories server-side. Invalidate the
            // category list so the Settings page + filter dropdown pick it up.
            queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
        },
    });
}

export function useDeleteAssetFamily() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.delete(`/operations/v1/asset-family/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assetFamilyKeys.all });
        },
    });
}
