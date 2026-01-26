"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { mapArraySnakeToCamel } from "@/lib/utils/helper";
import type {
    OrderLineItem,
    CreateCatalogLineItemRequest,
    CreateCustomLineItemRequest,
    UpdateLineItemRequest,
    VoidLineItemRequest,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const orderLineItemsKeys = {
    list: (orderId: string) => ["order-line-items", orderId] as const,
};

// List order line items
export function useListOrderLineItems(orderId: string | null) {
    return useQuery({
        queryKey: orderId ? orderLineItemsKeys.list(orderId) : ["order-line-items", "none"],
        queryFn: async (): Promise<OrderLineItem[]> => {
            if (!orderId) return Promise.reject("No order ID");
            try {
                const response = await apiClient.get(`/client/v1/order/${orderId}/line-items`);
                // Map snake_case API response to camelCase for UI components
                return mapArraySnakeToCamel(response.data.data) as unknown as OrderLineItem[];
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!orderId,
    });
}

// Create catalog line item
export function useCreateCatalogLineItem(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateCatalogLineItemRequest) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/order/${orderId}/line-items/catalog`,
                    data
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderLineItemsKeys.list(orderId) });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

// Create custom line item
export function useCreateCustomLineItem(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateCustomLineItemRequest) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/order/${orderId}/line-items/custom`,
                    data
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderLineItemsKeys.list(orderId) });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

// Update line item
export function useUpdateLineItem(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateLineItemRequest }) => {
            try {
                const response = await apiClient.put(
                    `/client/v1/order/${orderId}/line-items/${itemId}`,
                    data
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderLineItemsKeys.list(orderId) });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

// Void line item
export function useVoidLineItem(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ itemId, data }: { itemId: string; data: VoidLineItemRequest }) => {
            try {
                const response = await apiClient.delete(
                    `/client/v1/order/${orderId}/line-items/${itemId}`,
                    {
                        data,
                    }
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderLineItemsKeys.list(orderId) });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}
