"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { mapCamelToSnake } from "@/lib/utils/helper";
import type { PricingConfig, SetPricingConfigRequest } from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const pricingConfigKeys = {
    platform: () => ["pricing-config", "platform"] as const,
    company: (companyId: string) => ["pricing-config", "company", companyId] as const,
};

// Get platform default config
export function useGetPlatformConfig() {
    return useQuery({
        queryKey: pricingConfigKeys.platform(),
        queryFn: async (): Promise<PricingConfig> => {
            try {
                const response = await apiClient.get("/operations/v1/pricing/config");
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

// Get company-specific config
export function useGetCompanyConfig(companyId: string | null) {
    return useQuery({
        queryKey: companyId ? pricingConfigKeys.company(companyId) : ["pricing-config", "none"],
        queryFn: async (): Promise<PricingConfig> => {
            if (!companyId) return Promise.reject("No company ID");
            try {
                const response = await apiClient.get(`/operations/v1/pricing/config/${companyId}`);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!companyId,
    });
}

// Set platform default
export function useSetPlatformDefault() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: SetPricingConfigRequest) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.put("/operations/v1/pricing/config", apiData);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pricingConfigKeys.platform() });
        },
    });
}

// Set company override
export function useSetCompanyOverride() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            companyId,
            data,
        }: {
            companyId: string;
            data: SetPricingConfigRequest;
        }) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.put(
                    `/operations/v1/pricing/config/${companyId}`,
                    apiData
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: pricingConfigKeys.company(variables.companyId),
            });
        },
    });
}

// Remove company override
export function useRemoveCompanyOverride() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (companyId: string) => {
            try {
                const response = await apiClient.delete(
                    `/operations/v1/pricing/config/${companyId}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, companyId) => {
            queryClient.invalidateQueries({ queryKey: pricingConfigKeys.company(companyId) });
        },
    });
}
