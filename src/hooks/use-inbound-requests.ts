"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
    InboundRequestDetails,
    CreateInboundRequestPayload,
    UpdateInboundRequestPayload,
    InboundRequestDetailsResponse,
    CompleteInboundRequestPayload,
} from "@/types/inbound-request";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

// Query keys
export const inboundRequestKeys = {
    all: ["inbound-requests"] as const,
    lists: () => [...inboundRequestKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...inboundRequestKeys.lists(), params] as const,
    details: () => [...inboundRequestKeys.all, "detail"] as const,
    detail: (id: string) => [...inboundRequestKeys.details(), id] as const,
};

// Fetch inbound requests list
async function fetchInboundRequests(
    params?: Record<string, string>
): Promise<{ data: InboundRequestDetails[]; meta: { total: number; limit: number; page: number } }> {
    try {
        const searchParams = new URLSearchParams(params);
        const response = await apiClient.get(`/client/v1/inbound-request?${searchParams}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Fetch single inbound request
async function fetchInboundRequest(id: string): Promise<InboundRequestDetailsResponse> {
    try {
        const response = await apiClient.get(`/client/v1/inbound-request/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Create inbound request
async function createInboundRequest(data: CreateInboundRequestPayload): Promise<InboundRequestDetails> {
    try {
        const response = await apiClient.post(`/client/v1/inbound-request`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Update inbound request
async function updateInboundRequest(
    id: string,
    data: UpdateInboundRequestPayload
): Promise<InboundRequestDetails> {
    try {
        const response = await apiClient.patch(`/client/v1/inbound-request/${id}`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Delete inbound request
async function deleteInboundRequest(id: string): Promise<void> {
    try {
        const response = await apiClient.delete(`/client/v1/inbound-request/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Cancel inbound request
async function cancelInboundRequest({ id, note }: { id: string; note: string }): Promise<InboundRequestDetails> {
    try {
        const response = await apiClient.post(`/client/v1/inbound-request/${id}/cancel`, { note });
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Submit inbound request for approval
async function submitInboundRequestForApproval(id: string): Promise<InboundRequestDetails> {
    try {
        const response = await apiClient.post(`/client/v1/inbound-request/${id}/submit-for-approval`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Admin approve inbound request
async function adminApproveInboundRequest({
    id,
    marginOverridePercent,
    marginOverrideReason,
}: {
    id: string;
    marginOverridePercent?: number;
    marginOverrideReason?: string;
}): Promise<InboundRequestDetails> {
    try {
        const payload: any = {};
        if (marginOverridePercent !== undefined) payload.margin_override_percent = marginOverridePercent;
        if (marginOverrideReason !== undefined) payload.margin_override_reason = marginOverrideReason;

        const response = await apiClient.post(`/client/v1/inbound-request/${id}/approve-request`, payload);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Return inbound request to logistics
async function returnInboundRequestToLogistics({
    id,
    reason,
}: {
    id: string;
    reason: string;
}): Promise<InboundRequestDetails> {
    try {
        const response = await apiClient.post(`/client/v1/inbound-request/${id}/return-to-logistics`, {
            reason,
        });
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Complete inbound request
async function completeInboundRequest(id: string, payload: CompleteInboundRequestPayload): Promise<InboundRequestDetails> {
    try {
        const response = await apiClient.post(`/client/v1/inbound-request/${id}/complete`, payload);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Hooks
export function useInboundRequests(params?: Record<string, string>) {
    return useQuery({
        queryKey: inboundRequestKeys.list(params),
        queryFn: () => fetchInboundRequests(params),
    });
}
//...
export function useCancelInboundRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cancelInboundRequest,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(data.id) });
        },
    });
}

export function useInboundRequest(id: string) {
    return useQuery({
        queryKey: inboundRequestKeys.detail(id),
        queryFn: () => fetchInboundRequest(id),
        enabled: !!id,
    });
}

export function useCreateInboundRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createInboundRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
        },
    });
}

export function useUpdateInboundRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateInboundRequestPayload }) =>
            updateInboundRequest(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(variables.id) });
        },
    });
}

export function useDeleteInboundRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteInboundRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
        },
    });
}



// Submit inbound request for approval

export function useSubmitInboundRequestForApproval() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: submitInboundRequestForApproval,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(data.id) });
        },
    });
}

export function useAdminApproveInboundRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: adminApproveInboundRequest,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(data.id) });
        },
    });
}

export function useReturnInboundRequestToLogistics() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: returnInboundRequestToLogistics,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(data.id) });
        },
    });
}

export function useCompleteInboundRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: CompleteInboundRequestPayload }) =>
            completeInboundRequest(id, payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(data.id) });
        },
    });
}
