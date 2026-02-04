"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { CityResponse } from "@/types/country";
import { useMutation } from "@tanstack/react-query";

// Query keys
export const cityKeys = {
    all: ["cities"] as const,
    lists: () => [...cityKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...cityKeys.lists(), params] as const,
    details: () => [...cityKeys.all, "detail"] as const,
    detail: (id: string) => [...cityKeys.details(), id] as const,
}

export const useCities = (params?: Record<string, string>) => {
    return useQuery<CityResponse, Error>({
        queryKey: cityKeys.list(params),
        queryFn: async () => {
          try {
            const response = await apiClient.get("/operations/v1/city", { params });
            return response.data;
          } catch (error) {
            throwApiError(error);
          }
        },
    });
}

export const useCreateCity = () => {
    const queryClient = useQueryClient();
    return useMutation<CityResponse, Error, { name: string; country_id: string }>({
        mutationFn: async (data) => {
          try {
            const response = await apiClient.post("/operations/v1/city", data);
            return response.data;
          } catch (error) {
            throwApiError(error);
          }
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: cityKeys.lists() });
        },
    });
}

export const useUpdateCity = () => {
    const queryClient = useQueryClient();
    return useMutation<CityResponse, Error, { id: string; data: { name: string; country_id: string } }>({
        mutationFn: async (data) => {
          try {
            const response = await apiClient.patch(`/operations/v1/city/${data.id}`, data.data);
            return response.data;
          } catch (error) {
            throwApiError(error);
          }
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: cityKeys.lists() });
        },
    });
}

export const useDeleteCity = () => {
    const queryClient = useQueryClient();
    return useMutation<CityResponse, Error, { id: string }>({
        mutationFn: async (data) => {
          try {
            const response = await apiClient.delete(`/operations/v1/city/${data.id}`);
            return response.data;
          } catch (error) {
            throwApiError(error);
          }
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: cityKeys.lists() });
        },
    });
}
