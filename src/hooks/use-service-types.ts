"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    ServiceType,
    CreateServiceTypeRequest,
    UpdateServiceTypeRequest,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const serviceTypesKeys = {
    all: () => ["service-types"] as const,
    lists: () => ["service-types", "list"] as const,
    list: (filters: Record<string, any>) => ["service-types", "list", filters] as const,
    detail: (id: string) => ["service-types", "detail", id] as const,
};

// List service types
export function useListServiceTypes(filters: Record<string, any> = {}) {
    const queryParams = new URLSearchParams();
    if (filters.category) queryParams.append("category", filters.category);
    if (filters.search_term) queryParams.append("search_term", filters.search_term);
    if (filters.include_inactive) queryParams.append("include_inactive", "true");

    return useQuery({
        queryKey: serviceTypesKeys.list(filters),
        queryFn: async () => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/pricing/service-types?${queryParams}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

// Get service type by ID
export function useGetServiceType(id: string | null) {
    return useQuery({
        queryKey: id ? serviceTypesKeys.detail(id) : ["service-types", "none"],
        queryFn: async () => {
            if (!id) return Promise.reject("No ID");
            try {
                const response = await apiClient.get(`/operations/v1/pricing/service-types/${id}`);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!id,
    });
}

// Create service type
export function useCreateServiceType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateServiceTypeRequest) => {
            try {
                const response = await apiClient.post("/operations/v1/pricing/service-types", data);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceTypesKeys.lists() });
        },
    });
}

// Update service type
export function useUpdateServiceType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateServiceTypeRequest }) => {
            try {
                const response = await apiClient.put(
                    `/operations/v1/pricing/service-types/${id}`,
                    data
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceTypesKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceTypesKeys.lists() });
        },
    });
}

// Delete (deactivate) service type
export function useDeleteServiceType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(`/operations/v1/pricing/service-types/${id}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceTypesKeys.lists() });
        },
    });
}
