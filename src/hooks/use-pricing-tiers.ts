"use client";

/**
 * Phase 5: Pricing Tiers React Query Hooks
 * Custom hooks for pricing tier management operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    PricingTier,
    CreatePricingTierRequest,
    UpdatePricingTierRequest,
    PricingTierListParams,
    PricingTierListResponse,
    TogglePricingTierRequest,
    CalculatePricingParams,
    CalculatePricingResponse,
} from "@/types/pricing";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { apiClient } from "@/lib/api/api-client";

/**
 * List pricing tiers with filtering
 */
export function usePricingTiers(params: PricingTierListParams = {}) {
    return useQuery<PricingTierListResponse>({
        queryKey: ["pricing-tiers", params],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        searchParams.append(key, value.toString());
                    }
                });

                const response = await apiClient.get(
                    `/operations/v1/pricing-tier?${searchParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

/**
 * Get single pricing tier by ID
 */
export function usePricingTier(id: string | null) {
    return useQuery<{ success: boolean; data: PricingTier }>({
        queryKey: ["pricing-tier", id],
        queryFn: async () => {
            try {
                if (!id) throw new Error("Pricing tier ID is required");
                const response = await apiClient.get(`/operations/v1/pricing-tier/${id}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!id,
    });
}

/**
 * Create new pricing tier
 */
export function useCreatePricingTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePricingTierRequest) => {
            try {
                const response = await apiClient.post("/operations/v1/pricing-tier", data);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
        },
    });
}

/**
 * Update pricing tier
 */
export function useUpdatePricingTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdatePricingTierRequest }) => {
            try {
                const response = await apiClient.patch(`/operations/v1/pricing-tier/${id}`, data);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
            queryClient.invalidateQueries({
                queryKey: ["pricing-tier", variables.id],
            });
        },
    });
}

/**
 * Delete pricing tier
 */
export function useDeletePricingTier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(`/operations/v1/pricing-tier/${id}`);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
        },
    });
}

/**
 * Calculate pricing for given volume and location
 * Used for order estimation in Phase 6+
 */
export function useCalculatePricing(params: CalculatePricingParams | null) {
    const queryParams = new URLSearchParams();

    if (params?.country) queryParams.set("country", params.country);
    if (params?.city) queryParams.set("city", params.city);
    if (params?.volume !== undefined) queryParams.set("volume", params.volume.toString());

    return useQuery<CalculatePricingResponse>({
        queryKey: ["pricing-calculate", params],
        queryFn: async () => {
            try {
                if (!params) throw new Error("Pricing calculation parameters required");

                const response = await apiClient.get(
                    `/operations/v1/pricing-tier/calculate?${queryParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!params && !!params.country && !!params.city && params.volume >= 0,
        retry: false, // Don't retry if no tier found
    });
}
