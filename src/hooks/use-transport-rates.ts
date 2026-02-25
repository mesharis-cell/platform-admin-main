"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { mapCamelToSnake } from "@/lib/utils/helper";
import type {
    TransportRate,
    CreateTransportRateRequest,
    UpdateTransportRateRequest,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const transportRatesKeys = {
    all: () => ["transport-rates"] as const,
    lists: () => ["transport-rates", "list"] as const,
    list: (filters: Record<string, any>) => ["transport-rates", "list", filters] as const,
    detail: (id: string) => ["transport-rates", "detail", id] as const,
};

// List transport rates
export function useListTransportRates(filters: Record<string, any> = {}) {
    const queryParams = new URLSearchParams();
    if (filters.city || filters.emirate)
        queryParams.append("city", filters.city || filters.emirate);
    if (filters.trip_type) queryParams.append("trip_type", filters.trip_type);
    if (filters.vehicle_type_id || filters.vehicle_type) {
        queryParams.append("vehicle_type_id", filters.vehicle_type_id || filters.vehicle_type);
    }
    if (filters.company_id !== undefined) queryParams.append("company_id", filters.company_id);
    if (filters.include_inactive) queryParams.append("include_inactive", "true");

    return useQuery({
        queryKey: transportRatesKeys.list(filters),
        queryFn: async () => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/pricing/transport-rates?${queryParams}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

// Get transport rate by ID
export function useGetTransportRate(id: string | null) {
    return useQuery({
        queryKey: id ? transportRatesKeys.detail(id) : ["transport-rates", "none"],
        queryFn: async () => {
            if (!id) return Promise.reject("No ID");
            try {
                const response = await apiClient.get(
                    `/operations/v1/pricing/transport-rates/${id}`
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!id,
    });
}

// Create transport rate
export function useCreateTransportRate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateTransportRateRequest) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.post(
                    "/operations/v1/pricing/transport-rates",
                    apiData
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transportRatesKeys.lists() });
        },
    });
}

// Update transport rate
export function useUpdateTransportRate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateTransportRateRequest }) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.put(
                    `/operations/v1/pricing/transport-rates/${id}`,
                    apiData
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: transportRatesKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: transportRatesKeys.lists() });
        },
    });
}

// Delete (deactivate) transport rate
export function useDeleteTransportRate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(
                    `/operations/v1/pricing/transport-rates/${id}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transportRatesKeys.lists() });
        },
    });
}

// Sync transport rates → service catalog
export function useSyncTransportRateCards() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (includeInactive: boolean = false) => {
            try {
                const response = await apiClient.post(
                    "/operations/v1/pricing/service-types/sync-transport-rates",
                    { include_inactive_rates: includeInactive ?? false }
                );
                return response.data.data as {
                    created: number;
                    updated: number;
                    skipped: number;
                    total_rates: number;
                };
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["service-types"] });
        },
    });
}

// Lookup transport rate
export function useLookupTransportRate() {
    return useMutation({
        mutationFn: async (params: { city: string; trip_type: string; vehicle_type: string }) => {
            try {
                const queryParams = new URLSearchParams({
                    city: params.city,
                    trip_type: params.trip_type,
                    vehicle_type: params.vehicle_type,
                });
                const response = await apiClient.get(
                    `/operations/v1/pricing/transport-rates/lookup?${queryParams}`
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}
