"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { mapArraySnakeToCamel } from "@/lib/utils/helper";
import type {
    ReskinRequest,
    ProcessReskinRequestRequest,
    CompleteReskinRequestRequest,
    CancelReskinRequestRequest,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const reskinRequestsKeys = {
    list: (orderId: string) => ["reskin-requests", orderId] as const,
};

// List reskin requests for order
export function useListReskinRequests(orderId: string | null) {
    return useQuery({
        queryKey: orderId ? reskinRequestsKeys.list(orderId) : ["reskin-requests", "none"],
        queryFn: async (): Promise<ReskinRequest[]> => {
            if (!orderId) return Promise.reject("No order ID");
            try {
                const response = await apiClient.get(`/client/v1/order/${orderId}/reskin-requests`);
                // Map snake_case API response to camelCase for UI components
                return mapArraySnakeToCamel(response.data.data) as unknown as ReskinRequest[];
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!orderId,
    });
}

// Process reskin request (Admin creates reskin record + cost line item)
export function useProcessReskinRequest(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderItemId,
            data,
        }: {
            orderItemId: string;
            data: ProcessReskinRequestRequest;
        }) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/order/${orderId}/reskin-requests/${orderItemId}/process`,
                    data
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reskinRequestsKeys.list(orderId) });
            queryClient.invalidateQueries({ queryKey: ["order-line-items", orderId] });
            queryClient.invalidateQueries({ queryKey: ["orders", "admin-detail", orderId] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

// Complete reskin request (creates new asset)
export function useCompleteReskinRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            reskinId,
            orderId,
            data,
        }: {
            reskinId: string;
            orderId: string;
            data: CompleteReskinRequestRequest;
        }) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/order/${orderId}/reskin-requests/${reskinId}/complete`,
                    data
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["reskin-requests"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["assets"] });
        },
    });
}

// Cancel reskin request
export function useCancelReskinRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            reskinId,
            data,
        }: {
            reskinId: string;
            data: CancelReskinRequestRequest;
        }) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/reskin-requests/${reskinId}/cancel`,
                    data
                );
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reskin-requests"] });
            queryClient.invalidateQueries({ queryKey: ["order-line-items"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}
