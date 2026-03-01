"use client";

/**
 * Invoice domain is intentionally disabled in pre-alpha.
 * Hooks are kept as stubs to preserve import contracts.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import {
    ConfirmPaymentRequest,
    ConfirmPaymentResponse,
    GenerateInvoiceRequest,
    GenerateInvoiceResponse,
    InvoiceListParams,
    InvoiceListResponse,
    InvoiceMetadata,
    SendInvoiceEmailRequest,
    SendInvoiceEmailResponse,
} from "@/types/order";

const INVOICE_DOMAIN_DISABLED_MESSAGE =
    "Invoice domain is disabled in pre-alpha. Re-enable after invoice redesign.";

const invoiceDomainDisabled = <T>(): T => {
    throw new Error(INVOICE_DOMAIN_DISABLED_MESSAGE);
};

// ============================================================
// Reconciliation Export (active)
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
// Stubbed invoice hooks
// ============================================================

export function useInvoice(orderId: string) {
    return useQuery({
        queryKey: invoiceKeys.detail(orderId),
        queryFn: async (): Promise<InvoiceMetadata> => invoiceDomainDisabled<InvoiceMetadata>(),
        enabled: false,
    });
}

export function useInvoices(params: InvoiceListParams = {}, _enabled: boolean = true) {
    return useQuery({
        queryKey: invoiceKeys.list(params),
        queryFn: async (): Promise<InvoiceListResponse> =>
            invoiceDomainDisabled<InvoiceListResponse>(),
        enabled: false,
    });
}

export function useGenerateInvoice() {
    return useMutation({
        mutationFn: async (_data: GenerateInvoiceRequest): Promise<GenerateInvoiceResponse> =>
            invoiceDomainDisabled<GenerateInvoiceResponse>(),
    });
}

export function useSendInvoiceEmail() {
    return useMutation({
        mutationFn: async (_data: SendInvoiceEmailRequest): Promise<SendInvoiceEmailResponse> =>
            invoiceDomainDisabled<SendInvoiceEmailResponse>(),
    });
}

export function useDownloadInvoice() {
    return useMutation({
        mutationFn: async (_payload: {
            invoiceNumber: string;
            platformId: string;
        }): Promise<Blob | string> => invoiceDomainDisabled<Blob | string>(),
    });
}

export function useConfirmPayment() {
    return useMutation({
        mutationFn: async (_args: {
            orderId: string;
            data: ConfirmPaymentRequest;
        }): Promise<ConfirmPaymentResponse> => invoiceDomainDisabled<ConfirmPaymentResponse>(),
    });
}
