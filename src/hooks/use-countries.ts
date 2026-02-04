"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { Country, CountryResponse } from "@/types/country";
import { useMutation } from "@tanstack/react-query";

// Query keys
export const countryKeys = {
    all: ["countries"] as const,
    lists: () => [...countryKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...countryKeys.lists(), params] as const,
    details: () => [...countryKeys.all, "detail"] as const,
    detail: (id: string) => [...countryKeys.details(), id] as const,
}

export const useCountries = (params?: Record<string, string>) => {
    return useQuery<CountryResponse, Error>({
        queryKey: countryKeys.list(params),
        queryFn: async () => {
          try {
            const response = await apiClient.get("/operations/v1/country", { params });
            return response.data;
          } catch (error) {
            throwApiError(error);
          }
        },
    });
}

export const useCreateCountry = () => {
    const queryClient = useQueryClient();
    return useMutation<CountryResponse, Error, { name: string }>({
        mutationFn: async (data) => {
          try {
            const response = await apiClient.post("/operations/v1/country", data);
            return response.data;
          } catch (error) {
            throwApiError(error);
          }
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: countryKeys.lists() });
        },
    });
}

export const useUpdateCountry = () => {
    const queryClient = useQueryClient();
    return useMutation<CountryResponse, Error, { id: string; data: { name: string } }>({
        mutationFn: async (data) => {
          try {
            const response = await apiClient.patch(`/operations/v1/country/${data.id}`, data.data);
            return response.data;
          } catch (error) {
            throwApiError(error);
          }
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: countryKeys.lists() });
        },
    });
}

export const useDeleteCountry = () => {
    const queryClient = useQueryClient();
    return useMutation<CountryResponse, Error, { id: string }>({
        mutationFn: async (data) => {
          try {
            const response = await apiClient.delete(`/operations/v1/country/${data.id}`);
            return response.data;
          } catch (error) {
            throwApiError(error);
          }
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: countryKeys.lists() });
        },
    });
}