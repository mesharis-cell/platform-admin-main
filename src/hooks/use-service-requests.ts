"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    ApplyServiceRequestConcessionPayload,
    CancelServiceRequestPayload,
    CreateServiceRequestPayload,
    ListServiceRequestsParams,
    ServiceRequestDetailsResponse,
    ServiceRequestListResponse,
    UpdateServiceRequestCommercialStatusPayload,
    UpdateServiceRequestPayload,
    UpdateServiceRequestStatusPayload,
} from "@/types/service-request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const serviceRequestKeys = {
    all: () => ["service-requests"] as const,
    lists: () => ["service-requests", "list"] as const,
    list: (filters: ListServiceRequestsParams) => ["service-requests", "list", filters] as const,
    detail: (id: string) => ["service-requests", "detail", id] as const,
};

function buildQueryString(params: ListServiceRequestsParams) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search_term) queryParams.append("search_term", params.search_term);
    if (params.company_id) queryParams.append("company_id", params.company_id);
    if (params.request_status) queryParams.append("request_status", params.request_status);
    if (params.request_type) queryParams.append("request_type", params.request_type);
    if (params.billing_mode) queryParams.append("billing_mode", params.billing_mode);
    return queryParams.toString();
}

export function useListServiceRequests(filters: ListServiceRequestsParams = {}) {
    return useQuery({
        queryKey: serviceRequestKeys.list(filters),
        queryFn: async (): Promise<ServiceRequestListResponse> => {
            try {
                const query = buildQueryString(filters);
                const response = await apiClient.get(`/operations/v1/service-request?${query}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

export function useServiceRequestDetails(id: string | null) {
    return useQuery({
        queryKey: id ? serviceRequestKeys.detail(id) : ["service-requests", "none"],
        queryFn: async (): Promise<ServiceRequestDetailsResponse> => {
            if (!id) return Promise.reject("No service request ID");
            try {
                const response = await apiClient.get(`/operations/v1/service-request/${id}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!id,
    });
}

export function useCreateServiceRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateServiceRequestPayload) => {
            try {
                const response = await apiClient.post("/operations/v1/service-request", payload);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
        },
    });
}

export function useUpdateServiceRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: UpdateServiceRequestPayload;
        }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/service-request/${id}`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
        },
    });
}

export function useUpdateServiceRequestStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: UpdateServiceRequestStatusPayload;
        }) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/service-request/${id}/status`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
        },
    });
}

export function useCancelServiceRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: CancelServiceRequestPayload;
        }) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/service-request/${id}/cancel`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
        },
    });
}

export function useUpdateServiceRequestCommercialStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: UpdateServiceRequestCommercialStatusPayload;
        }) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/service-request/${id}/commercial-status`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
        },
    });
}

export function useGenerateServiceRequestInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (serviceRequestId: string) => {
            try {
                const response = await apiClient.post("/operations/v1/invoice/generate", {
                    service_request_id: serviceRequestId,
                });
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.all() });
        },
    });
}

export function useApplyServiceRequestConcession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: ApplyServiceRequestConcessionPayload;
        }) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/service-request/${id}/concession`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
        },
    });
}

export function useDownloadServiceRequestCostEstimate() {
    return useMutation({
        mutationFn: async ({
            requestId,
            platformId,
        }: {
            requestId: string;
            platformId: string;
        }) => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/invoice/download-sr-cost-estimate-pdf/${requestId}?pid=${platformId}`,
                    { responseType: "blob" }
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}
