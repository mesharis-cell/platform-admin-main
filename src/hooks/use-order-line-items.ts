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
import { inboundRequestKeys } from "@/hooks/use-inbound-requests";

export const lineItemsKeys = {
    list: (targetId: string, purposeType: "ORDER" | "INBOUND_REQUEST") =>
        ["line-items", purposeType, targetId] as const,
};

// For backward compatibility
export const orderLineItemsKeys = {
    list: (orderId: string) => lineItemsKeys.list(orderId, "ORDER"),
};

// List line items (works for both orders and inbound requests)
export function useListLineItems(
    targetId: string | null,
    purposeType: "ORDER" | "INBOUND_REQUEST" = "ORDER"
) {
    return useQuery({
        queryKey: targetId ? lineItemsKeys.list(targetId, purposeType) : ["line-items", "none"],
        queryFn: async (): Promise<OrderLineItem[]> => {
            if (!targetId) return Promise.reject("No target ID");
            try {
                const queryParam =
                    purposeType === "ORDER"
                        ? `order_id=${targetId}`
                        : `inbound_request_id=${targetId}`;
                const response = await apiClient.get(`/operations/v1/line-item?${queryParam}`);
                // Map snake_case API response to camelCase for UI components
                return mapArraySnakeToCamel(response.data.data) as unknown as OrderLineItem[];
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!targetId,
    });
}

// Backward compatible alias for orders
export function useListOrderLineItems(orderId: string | null) {
    return useListLineItems(orderId, "ORDER");
}

// Create catalog line item
export function useCreateCatalogLineItem(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            data: Omit<
                CreateCatalogLineItemRequest,
                "order_id" | "inbound_request_id" | "purpose_type"
            >
        ) => {
            try {
                const payload: CreateCatalogLineItemRequest = {
                    ...data,
                    purpose_type: purposeType,
                    ...(purposeType === "ORDER"
                        ? { order_id: targetId }
                        : { inbound_request_id: targetId }),
                };
                const response = await apiClient.post(`/operations/v1/line-item/catalog`, payload);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lineItemsKeys.list(targetId, purposeType) });

            if (purposeType === "ORDER") {
                queryClient.invalidateQueries({ queryKey: ["orders"] });
            } else {
                queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
                queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(targetId) });
            }
        },
    });
}

// Create custom line item
export function useCreateCustomLineItem(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            data: Omit<
                CreateCustomLineItemRequest,
                "order_id" | "inbound_request_id" | "purpose_type"
            >
        ) => {
            try {
                const payload: CreateCustomLineItemRequest = {
                    ...data,
                    purpose_type: purposeType,
                    ...(purposeType === "ORDER"
                        ? { order_id: targetId }
                        : { inbound_request_id: targetId }),
                };
                const response = await apiClient.post(`/operations/v1/line-item/custom`, payload);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lineItemsKeys.list(targetId, purposeType) });

            if (purposeType === "ORDER") {
                queryClient.invalidateQueries({ queryKey: ["orders"] });
            } else {
                queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
                queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(targetId) });
            }
        },
    });
}

// Update line item
export function useUpdateLineItem(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateLineItemRequest }) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.put(`/operations/v1/line-item/${itemId}`, apiData);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lineItemsKeys.list(targetId, purposeType) });

            if (purposeType === "ORDER") {
                queryClient.invalidateQueries({ queryKey: ["orders"] });
            } else {
                queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
                queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(targetId) });
            }
        },
    });
}

// Void line item
export function useVoidLineItem(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ itemId, data }: { itemId: string; data: VoidLineItemRequest }) => {
            try {
                // Transform camelCase to snake_case for API
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.delete(`/operations/v1/line-item/${itemId}`, {
                    data: apiData,
                });
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lineItemsKeys.list(targetId, purposeType) });

            if (purposeType === "ORDER") {
                queryClient.invalidateQueries({ queryKey: ["orders"] });
            } else {
                queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
                queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(targetId) });
            }
        },
    });
}
