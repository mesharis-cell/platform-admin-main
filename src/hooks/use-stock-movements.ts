"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export const stockMovementKeys = {
    assetHistory: (assetId: string | null, params?: { page?: number; limit?: number }) =>
        ["stock-history", "asset", assetId, params?.page ?? 1, params?.limit ?? 20] as const,
    lowStock: () => ["low-stock-assets"] as const,
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

// useAssetFamilyStockHistory removed in the squash (locked decision #10).
// Per-asset history via useAssetStockHistory is the only path post-cutover.

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
    movement_type?: "ADJUSTMENT" | "OUTBOUND_AD_HOC";
    outbound_ad_hoc_reason?: "REPLACEMENT" | "INSTALL_CONSUMPTION" | "REPURPOSED" | "OTHER";
    linked_entity_type?: "ORDER" | "SELF_PICKUP";
    linked_entity_id?: string;
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
            qc.invalidateQueries({ queryKey: stockMovementKeys.lowStock() });
            // The new movement type changes both total + available. Refresh
            // asset counters and the root ["assets"] key because detail pages
            // read total_quantity from the asset-row query.
            qc.invalidateQueries({ queryKey: ["assets"] });
            qc.invalidateQueries({ queryKey: ["asset-availability-stats"] });
        },
        onError: throwApiError,
    });
}
