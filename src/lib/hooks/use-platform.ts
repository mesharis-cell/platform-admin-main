"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

const BASE = "/operations/v1/platform";

export interface PlatformConfig {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    logistics_partner_name?: string;
    support_email?: string;
    from_email?: string;
    currency?: string;
}

export interface PlatformFeatures {
    collections?: boolean;
    bulk_import?: boolean;
    advanced_reporting?: boolean;
    api_access?: boolean;
}

export interface Platform {
    id: string;
    name: string;
    domain: string;
    config: PlatformConfig;
    features: PlatformFeatures;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export function usePlatform() {
    return useQuery<Platform>({
        queryKey: ["platform"],
        queryFn: async () => {
            const res = await apiClient.get(`${BASE}/me`);
            return res.data.data;
        },
    });
}

export function useUpdatePlatformConfig() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (patch: Partial<PlatformConfig>) => {
            const res = await apiClient.patch(`${BASE}/config`, patch);
            return res.data.data as Platform;
        },
        onSuccess: () => {
            toast.success("Platform settings saved");
            qc.invalidateQueries({ queryKey: ["platform"] });
        },
        onError: (err: any) => throwApiError(err),
    });
}
