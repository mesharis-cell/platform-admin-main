"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

export type AssetCategory = {
    id: string;
    platform_id: string;
    company_id: string | null;
    name: string;
    slug: string;
    color: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
};

export function useAssetCategories(companyId?: string) {
    return useQuery({
        queryKey: ["asset-categories", companyId || "all"],
        queryFn: async (): Promise<{ data: AssetCategory[] }> => {
            const params = companyId ? `?company_id=${companyId}` : "";
            const response = await apiClient.get(`/operations/v1/asset-category${params}`);
            return response.data;
        },
    });
}

export function useCreateAssetCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { name: string; color?: string; company_id?: string }) => {
            const response = await apiClient.post("/operations/v1/asset-category", data);
            return response.data.data as AssetCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
        },
    });
}

export function useUpdateAssetCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: { name?: string; color?: string; sort_order?: number; is_active?: boolean } }) => {
            const response = await apiClient.patch(`/operations/v1/asset-category/${id}`, data);
            return response.data.data as AssetCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
        },
    });
}
