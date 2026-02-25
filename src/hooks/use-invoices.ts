"use client";

/**
 * Phase 9: Invoice Management React Query Hooks
 *
 * Client-side hooks for invoice operations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    GenerateInvoiceRequest,
    GenerateInvoiceResponse,
    SendInvoiceEmailRequest,
    SendInvoiceEmailResponse,
    InvoiceMetadata,
    ConfirmPaymentRequest,
    ConfirmPaymentResponse,
    InvoiceListParams,
    InvoiceListResponse,
} from "@/types/order";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { apiClient } from "@/lib/api/api-client";

// ============================================================
// Reconciliation Export
// ============================================================

export type ReconciliationExportParams = {
    company_id?: string;
    date_from?: string;
    date_to?: string;
};

export function useExportReconciliation() {
    return useMutation({
        mutationFn: async (params: ReconciliationExportParams) => {
            const qp = new URLSearchParams();
            if (params.company_id) qp.set("company_id", params.company_id);
            if (params.date_from) qp.set("date_from", params.date_from);
            if (params.date_to) qp.set("date_to", params.date_to);

            try {
                const response = await apiClient.get(
                    `/operations/v1/export/accounts-reconciliation?${qp.toString()}`,
                    { responseType: "blob" }
                );
                if (typeof window !== "undefined" && typeof document !== "undefined") {
                    const blob = new Blob([response.data], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `accounts-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

// ============================================================
// Query Keys
// ============================================================

export const invoiceKeys = {
    all: ["invoices"] as const,
    lists: () => [...invoiceKeys.all, "list"] as const,
    list: (params: InvoiceListParams) => [...invoiceKeys.lists(), params] as const,
    details: () => [...invoiceKeys.all, "detail"] as const,
    detail: (orderId: string) => [...invoiceKeys.details(), orderId] as const,
};

// ============================================================
// Queries
// ============================================================

/**
 * Get invoice metadata by order ID
 */
export function useInvoice(orderId: string) {
    return useQuery({
        queryKey: invoiceKeys.detail(orderId),
        queryFn: async () => {
            const response = await fetch(`/api/invoices/${orderId}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch invoice");
            }
            const data = await response.json();
            return data.invoice as InvoiceMetadata;
        },
        enabled: !!orderId,
    });
}

/**
 * List invoices with filtering
 */
export function useInvoices(params: InvoiceListParams = {}, enabled: boolean = true) {
    const queryParams = new URLSearchParams();

    if (params.company) queryParams.set("company", params.company);
    if (params.isPaid && params.isPaid !== "all") {
        queryParams.set("paid_status", params.isPaid);
    }
    if (params.type && params.type !== "all") {
        queryParams.set("type", params.type);
    }
    if (params.dateFrom) queryParams.set("date_from", params.dateFrom);
    if (params.dateTo) queryParams.set("date_to", params.dateTo);
    if (params.page) queryParams.set("page", params.page.toString());
    if (params.limit) queryParams.set("limit", params.limit.toString());
    if (params.sortBy) queryParams.set("sort_by", params.sortBy);
    if (params.sortOrder) queryParams.set("sort_order", params.sortOrder);

    return useQuery({
        queryKey: invoiceKeys.list(params),
        queryFn: async (): Promise<InvoiceListResponse> => {
            try {
                const response = await apiClient.get(
                    `/client/v1/invoice?${queryParams.toString()}`
                );

                const data = await response.data;
                return data as InvoiceListResponse;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled,
    });
}

// ============================================================
// Mutations
// ============================================================

/**
 * Generate invoice for order
 */
export function useGenerateInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: GenerateInvoiceRequest) => {
            const response = await fetch("/api/invoices/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to generate invoice");
            }

            return (await response.json()) as GenerateInvoiceResponse;
        },
        onSuccess: (data, variables) => {
            // Invalidate invoice queries
            queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.orderId) });
            queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });

            // Invalidate order queries (status changed to INVOICED)
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

/**
 * Send invoice email
 */
export function useSendInvoiceEmail() {
    return useMutation({
        mutationFn: async (data: SendInvoiceEmailRequest) => {
            const response = await fetch("/api/invoices/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to send invoice email");
            }

            return (await response.json()) as SendInvoiceEmailResponse;
        },
    });
}

/**
 * Download invoice PDF
 */
export function useDownloadInvoice() {
    return useMutation({
        mutationFn: async ({
            invoiceNumber,
            platformId,
        }: {
            invoiceNumber: string;
            platformId: string;
        }) => {
            try {
                const response = await apiClient.get(
                    `/client/v1/invoice/download-pdf/${invoiceNumber}?pid=${platformId}`,
                    {
                        responseType: "blob",
                    }
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

/**
 * Confirm payment for invoice
 */
export function useConfirmPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, data }: { orderId: string; data: ConfirmPaymentRequest }) => {
            try {
                const response = await apiClient.patch(
                    `/client/v1/invoice/${orderId}/confirm-payment`,
                    data
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            // Invalidate invoice queries
            queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.orderId) });
            queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });

            // Invalidate order queries (status changed to PAID)
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
        },
    });
}
