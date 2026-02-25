"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    SelfBooking,
    SelfBookingsListResponse,
    CreateSelfBookingRequest,
    ReturnScanRequest,
    CancelSelfBookingRequest,
} from "@/types/self-booking";

const BASE = "/operations/v1/self-bookings";

export const selfBookingKeys = {
    all: ["self-bookings"] as const,
    lists: () => [...selfBookingKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...selfBookingKeys.lists(), params] as const,
    details: () => [...selfBookingKeys.all, "detail"] as const,
    detail: (id: string) => [...selfBookingKeys.details(), id] as const,
};

async function fetchSelfBookings(
    params?: Record<string, string>
): Promise<SelfBookingsListResponse> {
    try {
        const response = await apiClient.get(BASE, { params });
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function fetchSelfBooking(id: string): Promise<{ data: SelfBooking }> {
    try {
        const response = await apiClient.get(`${BASE}/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function createSelfBooking(data: CreateSelfBookingRequest): Promise<{ data: SelfBooking }> {
    try {
        const response = await apiClient.post(BASE, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function returnScan(id: string, data: ReturnScanRequest): Promise<{ data: SelfBooking }> {
    try {
        const response = await apiClient.post(`${BASE}/${id}/return-scan`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function cancelSelfBooking(
    id: string,
    data: CancelSelfBookingRequest
): Promise<{ data: SelfBooking }> {
    try {
        const response = await apiClient.post(`${BASE}/${id}/cancel`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// -------------------------------- Hooks --------------------------------

export function useSelfBookings(params?: Record<string, string>) {
    return useQuery({
        queryKey: selfBookingKeys.list(params),
        queryFn: () => fetchSelfBookings(params),
    });
}

export function useSelfBooking(id: string) {
    return useQuery({
        queryKey: selfBookingKeys.detail(id),
        queryFn: () => fetchSelfBooking(id),
        enabled: !!id,
    });
}

export function useCreateSelfBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateSelfBookingRequest) => createSelfBooking(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: selfBookingKeys.lists() });
        },
    });
}

export function useReturnScan(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ReturnScanRequest) => returnScan(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: selfBookingKeys.detail(id) });
        },
    });
}

export function useCancelSelfBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: CancelSelfBookingRequest }) =>
            cancelSelfBooking(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: selfBookingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: selfBookingKeys.detail(variables.id) });
        },
    });
}
