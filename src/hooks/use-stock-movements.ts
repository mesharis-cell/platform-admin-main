"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export const stockMovementKeys = {
    assetHistory: (assetId: string | null, params?: { page?: number; limit?: number }) =>
        ["stock-history", "asset", assetId, params?.page ?? 1, params?.limit ?? 20] as const,
    familyHistory: (familyId: string | null) => ["stock-history", "family", familyId] as const,
    lowStock: () => ["low-stock-families"] as const,
};

export function useAssetStockHistory(
    assetId: string | null,
    params?: { page?: number; limit?: number }
) {
    return useQuery({
        queryKey: stockMovementKeys.assetHistory(assetId, params),
        queryFn: async () => {
            const query = new URLSearchParams();
            if (params?.page) query.set("page", String(params.page));
            if (params?.limit) query.set("limit", String(params.limit));
            const { data } = await apiClient.get(
                `/operations/v1/stock-movements/asset/${assetId}/stock-history?${query.toString()}`
            );
            return data;
        },
        enabled: !!assetId,
    });
}

export function useAssetFamilyStockHistory(
    familyId: string | null,
    params?: { page?: number; limit?: number }
) {
    return useQuery({
        queryKey: stockMovementKeys.familyHistory(familyId),
        queryFn: async () => {
            const query = new URLSearchParams();
            if (params?.page) query.set("page", String(params.page));
            if (params?.limit) query.set("limit", String(params.limit));
            const { data } = await apiClient.get(
                `/operations/v1/stock-movements/asset-family/${familyId}/stock-history?${query.toString()}`
            );
            return data;
        },
        enabled: !!familyId,
    });
}

export function useLowStockFamilies(companyId?: string) {
    return useQuery({
        queryKey: [...stockMovementKeys.lowStock(), companyId],
        queryFn: async () => {
            const query = new URLSearchParams();
            if (companyId) query.set("company_id", companyId);
            const { data } = await apiClient.get(
                `/operations/v1/stock-movements/low-stock?${query.toString()}`
            );
            return data;
        },
    });
}

export type ManualStockAdjustmentPayload = {
    asset_id: string;
    delta: number;
    reason_note: string;
    movement_type?: "ADJUSTMENT" | "WRITE_OFF";
    write_off_reason?: "CONSUMED" | "LOST" | "DAMAGED" | "OTHER";
};

export function useManualStockAdjustment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: ManualStockAdjustmentPayload) => {
            const { data } = await apiClient.post(
                "/operations/v1/stock-movements/manual-adjustment",
                payload
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["stock-history"] });
            qc.invalidateQueries({ queryKey: ["low-stock-families"] });
        },
        onError: throwApiError,
    });
}
