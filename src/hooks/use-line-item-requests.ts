"use client";

import { apiClient } from "@/lib/api/api-client";
import { mapArraySnakeToCamel, mapCamelToSnake, mapSnakeToCamel } from "@/lib/utils/helper";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    ApproveLineItemRequestPayload,
    CreateLineItemRequestPayload,
    LineItemRequest,
    PurposeType,
    RejectLineItemRequestPayload,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const lineItemRequestKeys = {
    all: () => ["line-item-requests"] as const,
    list: (filters: Record<string, unknown>) => ["line-item-requests", "list", filters] as const,
};

export function useLineItemRequests(
    filters: {
        status?: "REQUESTED" | "APPROVED" | "REJECTED";
        purposeType?: PurposeType;
        orderId?: string;
        inboundRequestId?: string;
        serviceRequestId?: string;
        page?: number;
        limit?: number;
    } = {}
) {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.purposeType) queryParams.append("purpose_type", filters.purposeType);
    if (filters.orderId) queryParams.append("order_id", filters.orderId);
    if (filters.inboundRequestId)
        queryParams.append("inbound_request_id", filters.inboundRequestId);
    if (filters.serviceRequestId)
        queryParams.append("service_request_id", filters.serviceRequestId);
    if (filters.page) queryParams.append("page", String(filters.page));
    if (filters.limit) queryParams.append("limit", String(filters.limit));

    return useQuery({
        queryKey: lineItemRequestKeys.list(filters),
        queryFn: async () => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/line-item-requests?${queryParams.toString()}`
                );
                const rows = Array.isArray(response.data?.data) ? response.data.data : [];
                return mapArraySnakeToCamel(rows) as unknown as LineItemRequest[];
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

export function useCreateLineItemRequest(targetId: string, purposeType: PurposeType = "ORDER") {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            payload: Omit<
                CreateLineItemRequestPayload,
                "purposeType" | "orderId" | "inboundRequestId" | "serviceRequestId"
            >
        ) => {
            try {
                const requestPayload: CreateLineItemRequestPayload = {
                    ...payload,
                    purposeType,
                    ...(purposeType === "ORDER"
                        ? { orderId: targetId }
                        : purposeType === "INBOUND_REQUEST"
                          ? { inboundRequestId: targetId }
                          : { serviceRequestId: targetId }),
                };

                const apiPayload = mapCamelToSnake(requestPayload);
                const response = await apiClient.post(
                    "/operations/v1/line-item-requests",
                    apiPayload
                );
                return mapSnakeToCamel(response.data?.data || {});
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lineItemRequestKeys.all() });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
            queryClient.invalidateQueries({ queryKey: ["service-requests"] });
        },
    });
}

export function useApproveLineItemRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: ApproveLineItemRequestPayload }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/line-item-requests/${id}/approve`,
                    mapCamelToSnake(data)
                );
                return mapSnakeToCamel(response.data?.data || {});
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lineItemRequestKeys.all() });
            queryClient.invalidateQueries({ queryKey: ["line-items"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
            queryClient.invalidateQueries({ queryKey: ["service-requests"] });
        },
    });
}

export function useRejectLineItemRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: RejectLineItemRequestPayload }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/line-item-requests/${id}/reject`,
                    mapCamelToSnake(data)
                );
                return mapSnakeToCamel(response.data?.data || {});
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lineItemRequestKeys.all() });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
            queryClient.invalidateQueries({ queryKey: ["service-requests"] });
        },
    });
}
