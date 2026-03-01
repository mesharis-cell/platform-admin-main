"use client";

import { apiClient } from "@/lib/api/api-client";
import { mapArraySnakeToCamel, mapCamelToSnake, mapSnakeToCamel } from "@/lib/utils/helper";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    CreateOrderTransportTripPayload,
    OrderTransportTrip,
    UpdateOrderTransportTripPayload,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const orderTransportTripKeys = {
    list: (orderId: string) => ["order-transport-trips", orderId] as const,
};

export function useOrderTransportTrips(orderId: string | null) {
    return useQuery({
        queryKey: orderId
            ? orderTransportTripKeys.list(orderId)
            : ["order-transport-trips", "none"],
        queryFn: async () => {
            if (!orderId) return Promise.reject("No order id");
            try {
                const response = await apiClient.get(
                    `/operations/v1/order/${orderId}/transport-trips`
                );
                const rows = Array.isArray(response.data?.data) ? response.data.data : [];
                return mapArraySnakeToCamel(rows) as unknown as OrderTransportTrip[];
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!orderId,
    });
}

export function useCreateOrderTransportTrip(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateOrderTransportTripPayload) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/order/${orderId}/transport-trips`,
                    mapCamelToSnake(payload)
                );
                return mapSnakeToCamel(response.data?.data || {});
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderTransportTripKeys.list(orderId) });
        },
    });
}

export function useUpdateOrderTransportTrip(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            tripId,
            payload,
        }: {
            tripId: string;
            payload: UpdateOrderTransportTripPayload;
        }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/order/${orderId}/transport-trips/${tripId}`,
                    mapCamelToSnake(payload)
                );
                return mapSnakeToCamel(response.data?.data || {});
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderTransportTripKeys.list(orderId) });
        },
    });
}

export function useDeleteOrderTransportTrip(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (tripId: string) => {
            try {
                const response = await apiClient.delete(
                    `/operations/v1/order/${orderId}/transport-trips/${tripId}`
                );
                return mapSnakeToCamel(response.data?.data || {});
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: orderTransportTripKeys.list(orderId) });
        },
    });
}
