"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { mapArraySnakeToCamel, mapCamelToSnake } from "@/lib/utils/helper";
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
export function useCreateCatalogLineItem(targetId: string, purposeType: "ORDER" | "INBOUND_REQUEST" = "ORDER") {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Omit<CreateCatalogLineItemRequest, "order_id" | "inbound_request_id" | "purpose_type">) => {
            try {
                const payload: CreateCatalogLineItemRequest = {
                    ...data,
                    purpose_type: purposeType,
                    ...(purposeType === "ORDER" ? { order_id: targetId } : { inbound_request_id: targetId }),
                };
                const response = await apiClient.post(
                    `/client/v1/order/${targetId}/line-items/catalog`,
                    payload
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderLineItemsKeys.list(targetId) });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
        },
    });
}

// Create custom line item
export function useCreateCustomLineItem(targetId: string, purposeType: "ORDER" | "INBOUND_REQUEST" = "ORDER") {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Omit<CreateCustomLineItemRequest, "order_id" | "inbound_request_id" | "purpose_type">) => {
            try {
                const payload: CreateCustomLineItemRequest = {
                    ...data,
                    purpose_type: purposeType,
                    ...(purposeType === "ORDER" ? { order_id: targetId } : { inbound_request_id: targetId }),
                };
                const response = await apiClient.post(
                    `/client/v1/order/${targetId}/line-items/custom`,
                    payload
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderLineItemsKeys.list(targetId) });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
        },
    });
}

// Update line item
export function useUpdateLineItem(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateLineItemRequest }) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.put(
                    `/client/v1/order/${orderId}/line-items/${itemId}`,
                    apiData
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
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.delete(
                    `/client/v1/order/${orderId}/line-items/${itemId}`,
                    {
                        data: apiData,
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
