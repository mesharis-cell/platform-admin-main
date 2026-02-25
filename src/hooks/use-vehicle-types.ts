"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { mapCamelToSnake } from "@/lib/utils/helper";
import type {
    CreateVehicleTypeRequest,
    UpdateVehicleTypeRequest,
    VehicleType,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const vehicleTypesKeys = {
    all: () => ["vehicle-types"] as const,
    lists: () => ["vehicle-types", "list"] as const,
    list: (filters: Record<string, any>) => ["vehicle-types", "list", filters] as const,
    detail: (id: string) => ["vehicle-types", "detail", id] as const,
};

// List vehicle types
export function useListVehicleTypes(filters: Record<string, any> = {}) {
    const queryParams = new URLSearchParams();
    if (filters.search_term) queryParams.append("search_term", filters.search_term);
    if (filters.include_inactive) queryParams.append("include_inactive", "true");

    return useQuery({
        queryKey: vehicleTypesKeys.list(filters),
        queryFn: async (): Promise<{ data: VehicleType[] }> => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/pricing/vehicle-types?${queryParams}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

// Get vehicle type by ID
export function useGetVehicleType(id: string | null) {
    return useQuery({
        queryKey: id ? vehicleTypesKeys.detail(id) : ["vehicle-types", "none"],
        queryFn: async () => {
            if (!id) return Promise.reject("No ID");
            try {
                const response = await apiClient.get(`/operations/v1/pricing/vehicle-types/${id}`);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!id,
    });
}

// Create vehicle type
export function useCreateVehicleType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateVehicleTypeRequest) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.post(
                    "/operations/v1/pricing/vehicle-types",
                    apiData
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleTypesKeys.lists() });
        },
    });
}

// Update vehicle type
export function useUpdateVehicleType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateVehicleTypeRequest }) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.patch(
                    `/operations/v1/pricing/vehicle-types/${id}`,
                    apiData
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vehicleTypesKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: vehicleTypesKeys.lists() });
        },
    });
}

// Delete (deactivate) vehicle type
export function useDeleteVehicleType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(
                    `/operations/v1/pricing/vehicle-types/${id}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleTypesKeys.lists() });
        },
    });
}
