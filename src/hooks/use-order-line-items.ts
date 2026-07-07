"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { mapArraySnakeToCamel, mapCamelToSnake } from "@/lib/utils/helper";
import type {
    OrderLineItem,
    CreateCatalogLineItemRequest,
    CreateCustomLineItemRequest,
    UpdateLineItemRequest,
    PatchLineItemMetadataRequest,
    PatchLineItemVisibilityRequest,
    PatchEntityLineItemVisibilityRequest,
    VoidLineItemRequest,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateLedgerRelatedQueries } from "@/hooks/use-ledger-invalidation";

export const lineItemsKeys = {
    list: (
        targetId: string,
        purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP"
    ) => ["line-items", purposeType, targetId] as const,
};

// List line items (works for both orders and inbound requests)
export function useListLineItems(
    targetId: string | null,
    purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP" = "ORDER"
) {
    return useQuery({
        queryKey: targetId ? lineItemsKeys.list(targetId, purposeType) : ["line-items", "none"],
        queryFn: async (): Promise<OrderLineItem[]> => {
            if (!targetId) return Promise.reject("No target ID");
            try {
                const queryParam =
                    purposeType === "ORDER"
                        ? `order_id=${targetId}`
                        : purposeType === "INBOUND_REQUEST"
                          ? `inbound_request_id=${targetId}`
                          : purposeType === "SERVICE_REQUEST"
                            ? `service_request_id=${targetId}`
                            : `self_pickup_id=${targetId}`;
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

// Create catalog line item
export function useCreateCatalogLineItem(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            data: Omit<
                CreateCatalogLineItemRequest,
                "order_id" | "inbound_request_id" | "service_request_id" | "purpose_type"
            >
        ) => {
            try {
                const payload: CreateCatalogLineItemRequest = {
                    ...data,
                    purpose_type: purposeType,
                    ...(purposeType === "ORDER"
                        ? { order_id: targetId }
                        : purposeType === "INBOUND_REQUEST"
                          ? { inbound_request_id: targetId }
                          : purposeType === "SERVICE_REQUEST"
                            ? { service_request_id: targetId }
                            : { self_pickup_id: targetId }),
                };
                const response = await apiClient.post(`/operations/v1/line-item/catalog`, payload);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            invalidateLedgerRelatedQueries(queryClient, purposeType, targetId);
        },
    });
}

// Create custom line item
export function useCreateCustomLineItem(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            data: Omit<
                CreateCustomLineItemRequest,
                "order_id" | "inbound_request_id" | "service_request_id" | "purpose_type"
            >
        ) => {
            try {
                const payload: CreateCustomLineItemRequest = {
                    ...data,
                    purpose_type: purposeType,
                    ...(purposeType === "ORDER"
                        ? { order_id: targetId }
                        : purposeType === "INBOUND_REQUEST"
                          ? { inbound_request_id: targetId }
                          : purposeType === "SERVICE_REQUEST"
                            ? { service_request_id: targetId }
                            : { self_pickup_id: targetId }),
                };
                const response = await apiClient.post(`/operations/v1/line-item/custom`, payload);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            invalidateLedgerRelatedQueries(queryClient, purposeType, targetId);
        },
    });
}

// Update line item
export function useUpdateLineItem(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP" = "ORDER"
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
            invalidateLedgerRelatedQueries(queryClient, purposeType, targetId);
        },
    });
}

// Patch line item metadata and notes (post-lock safe)
export function usePatchLineItemMetadata(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            itemId,
            data,
        }: {
            itemId: string;
            data: PatchLineItemMetadataRequest;
        }) => {
            try {
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.patch(
                    `/operations/v1/line-item/${itemId}/metadata`,
                    apiData
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            invalidateLedgerRelatedQueries(queryClient, purposeType, targetId);
        },
    });
}

// Toggle one line item's audience visibility. Accepts both flags
// (client_price_visible + logistics_visible). Server requires at least one.
export function usePatchLineItemVisibility(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            itemId,
            data,
        }: {
            itemId: string;
            data: PatchLineItemVisibilityRequest;
        }) => {
            try {
                const apiData = mapCamelToSnake(data);
                const response = await apiClient.patch(
                    `/operations/v1/line-item/${itemId}/visibility`,
                    apiData
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            invalidateLedgerRelatedQueries(queryClient, purposeType, targetId);
        },
    });
}

// Bulk set audience visibility at entity scope. Accepts both flags.
export function usePatchEntityLineItemsVisibility(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP" = "ORDER"
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Omit<PatchEntityLineItemVisibilityRequest, "purposeType">) => {
            try {
                const payload = {
                    ...data,
                    purposeType,
                    ...(purposeType === "ORDER"
                        ? { orderId: targetId }
                        : purposeType === "INBOUND_REQUEST"
                          ? { inboundRequestId: targetId }
                          : purposeType === "SERVICE_REQUEST"
                            ? { serviceRequestId: targetId }
                            : { selfPickupId: targetId }),
                };
                const apiData = mapCamelToSnake(payload);
                const response = await apiClient.patch(
                    `/operations/v1/line-item/visibility`,
                    apiData
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            invalidateLedgerRelatedQueries(queryClient, purposeType, targetId);
        },
    });
}

// Void line item
export function useVoidLineItem(
    targetId: string,
    purposeType: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP" = "ORDER"
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
            invalidateLedgerRelatedQueries(queryClient, purposeType, targetId);
        },
    });
}
