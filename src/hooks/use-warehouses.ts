"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateWarehouseRequest, Warehouse, WarehouseListResponse } from "@/types";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

// Query keys
export const warehouseKeys = {
    all: ["warehouses"] as const,
    lists: () => [...warehouseKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...warehouseKeys.lists(), params] as const,
    details: () => [...warehouseKeys.all, "detail"] as const,
    detail: (id: string) => [...warehouseKeys.details(), id] as const,
};

// Fetch warehouses list
async function fetchWarehouses(params?: Record<string, string>): Promise<WarehouseListResponse> {
    try {
        const searchParams = new URLSearchParams(params);
        const response = await apiClient.get(`/operations/v1/warehouse?${searchParams}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Create warehouse
async function createWarehouse(data: Partial<CreateWarehouseRequest>): Promise<Warehouse> {
    try {
        const response = await apiClient.post("/operations/v1/warehouse", data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Update warehouse
async function updateWarehouse({
    id,
    data,
}: {
    id: string;
    data: Partial<Warehouse>;
}): Promise<Warehouse> {
    try {
        const response = await apiClient.patch(`/operations/v1/warehouse/${id}`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Archive warehouse
async function archiveUnarchiveWarehouse(id: string): Promise<void> {
    try {
        const response = await apiClient.delete(`/operations/v1/warehouse/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Hooks
export function useWarehouses(params?: Record<string, string>) {
    return useQuery({
        queryKey: warehouseKeys.list(params),
        queryFn: () => fetchWarehouses(params),
    });
}

export function useCreateWarehouse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createWarehouse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        },
    });
}

export function useUpdateWarehouse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateWarehouse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        },
    });
}

export function useArchiveUnarchiveWarehouse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: archiveUnarchiveWarehouse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        },
    });
}
