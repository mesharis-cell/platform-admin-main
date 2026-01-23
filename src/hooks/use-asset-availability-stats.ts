"use client";

/**
 * Hook for fetching real-time asset availability statistics
 */

import { apiClient } from "@/lib/api/api-client";
import { useQuery } from "@tanstack/react-query";

interface AvailabilityStats {
    data: {
        asset_id: string;
        total_quantity: number;
        available_quantity: number;
        booked_quantity: number;
        out_quantity: number;
        in_maintenance_quantity: number;
        breakdown: {
            active_bookings_count: number;
            outbound_scans_total: number;
            inbound_scans_total: number;
        };
    };
}

export function useAssetAvailabilityStats(assetId: string) {
    return useQuery<AvailabilityStats>({
        queryKey: ["asset-availability-stats", assetId],
        queryFn: async () => {
            const response = await apiClient.get(
                `/operations/v1/asset/${assetId}/availability-stats`
            );
            return response.data;
        },
        enabled: !!assetId,
        refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    });
}
