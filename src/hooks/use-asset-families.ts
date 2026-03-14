"use client";

import { useQuery } from "@tanstack/react-query";
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
