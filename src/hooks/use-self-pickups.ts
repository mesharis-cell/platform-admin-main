"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

// ----------------------------------- KEYS ---------------------------------------------------

export const selfPickupKeys = {
    list: (params?: Record<string, unknown>) => ["self-pickups", params] as const,
    detail: (id: string | null) => ["self-pickup", id] as const,
    statusHistory: (id: string | null) => ["self-pickup-status-history", id] as const,
};

// ----------------------------------- LIST (ADMIN) -------------------------------------------

export function useAdminSelfPickups(params: {
    page?: number;
    limit?: number;
    company?: string;
    brand?: string;
    self_pickup_status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
} = {}) {
    return useQuery({
        queryKey: selfPickupKeys.list(params),
        queryFn: async () => {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== "") query.set(key, String(value));
            });
            const { data } = await apiClient.get(
                `/operations/v1/self-pickup?${query.toString()}`
            );
            return data;
        },
    });
}

// ----------------------------------- DETAIL -------------------------------------------------

export function useAdminSelfPickupDetails(id: string | null) {
    return useQuery({
        queryKey: selfPickupKeys.detail(id),
        queryFn: async () => {
            const { data } = await apiClient.get(`/operations/v1/self-pickup/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

// ----------------------------------- STATUS HISTORY -----------------------------------------

export function useAdminSelfPickupStatusHistory(id: string | null) {
    return useQuery({
        queryKey: selfPickupKeys.statusHistory(id),
        queryFn: async () => {
            const { data } = await apiClient.get(
                `/operations/v1/self-pickup/${id}/status-history`
            );
            return data;
        },
        enabled: !!id,
    });
}

// ----------------------------------- MUTATIONS ----------------------------------------------

export function useSubmitForApproval() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(
                `/operations/v1/self-pickup/${id}/submit-for-approval`
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useAdminApproveQuote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(
                `/operations/v1/self-pickup/${id}/approve`
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useMarkReadyForPickup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(
                `/operations/v1/self-pickup/${id}/ready-for-pickup`
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useCancelSelfPickup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const { data } = await apiClient.post(
                `/operations/v1/self-pickup/${id}/cancel`,
                { reason }
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useUpdateSelfPickupJobNumber() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            job_number,
        }: {
            id: string;
            job_number: string | null;
        }) => {
            const { data } = await apiClient.patch(
                `/operations/v1/self-pickup/${id}/job-number`,
                { job_number }
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
        },
        onError: throwApiError,
    });
}
