"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

interface AssetFamilyAvailabilityStats {
    data: {
        family_id: string;
        total_quantity: number;
        available_quantity: number;
        booked_quantity: number;
        out_quantity: number;
        in_maintenance_quantity: number;
        self_booked_quantity: number;
        stock_record_count: number;
        breakdown: {
            active_bookings_count: number;
            outbound_scans_total: number;
            inbound_scans_total: number;
        };
    };
}

export function useAssetFamilyAvailabilityStats(familyId: string) {
    return useQuery<AssetFamilyAvailabilityStats>({
        queryKey: ["asset-family-availability-stats", familyId],
        queryFn: async () => {
            const response = await apiClient.get(
                `/operations/v1/asset-family/${familyId}/availability-stats`
            );
            return response.data;
        },
        enabled: !!familyId,
        refetchInterval: 30000,
    });
}
