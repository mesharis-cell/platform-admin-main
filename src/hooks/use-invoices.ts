/**
 * Phase 9: Invoice Management React Query Hooks
 *
 * Client-side hooks for invoice operations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
} from '@/types/order';

// ============================================================
// Query Keys
// ============================================================

export const invoiceKeys = {
	all: ['invoices'] as const,
	lists: () => [...invoiceKeys.all, 'list'] as const,
	list: (params: InvoiceListParams) => [...invoiceKeys.lists(), params] as const,
	details: () => [...invoiceKeys.all, 'detail'] as const,
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
				throw new Error(error.error || 'Failed to fetch invoice');
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
export function useInvoices(params: InvoiceListParams = {}) {
	const queryParams = new URLSearchParams();

	if (params.company) queryParams.set('company', params.company);
	if (params.isPaid !== undefined)
		queryParams.set('isPaid', params.isPaid.toString());
	if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
	if (params.dateTo) queryParams.set('dateTo', params.dateTo);
	if (params.page) queryParams.set('page', params.page.toString());
	if (params.limit) queryParams.set('limit', params.limit.toString());
	if (params.sortBy) queryParams.set('sortBy', params.sortBy);
	if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

	return useQuery({
		queryKey: invoiceKeys.list(params),
		queryFn: async () => {
			const response = await fetch(`/api/invoices?${queryParams.toString()}`);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to fetch invoices');
			}
			const data = await response.json();
			return data as InvoiceListResponse;
		},
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
			const response = await fetch('/api/invoices/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to generate invoice');
			}

			return (await response.json()) as GenerateInvoiceResponse;
		},
		onSuccess: (data, variables) => {
			// Invalidate invoice queries
			queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.orderId) });
			queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });

			// Invalidate order queries (status changed to INVOICED)
			queryClient.invalidateQueries({ queryKey: ['orders'] });
		},
	});
}

/**
 * Send invoice email
 */
export function useSendInvoiceEmail() {
	return useMutation({
		mutationFn: async (data: SendInvoiceEmailRequest) => {
			const response = await fetch('/api/invoices/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to send invoice email');
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
		mutationFn: async (invoiceNumber: string) => {
			const response = await fetch(`/api/invoices/download/${invoiceNumber}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to download Cost Estimate');
			}

			// Get PDF blob
			const blob = await response.blob();

			// Create download link
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${invoiceNumber}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			return { success: true };
		},
	});
}

/**
 * Confirm payment for invoice
 */
export function useConfirmPayment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			orderId,
			data,
		}: {
			orderId: string;
			data: ConfirmPaymentRequest;
		}) => {
			const response = await fetch(`/api/invoices/${orderId}/confirm-payment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to confirm payment');
			}

			return (await response.json()) as ConfirmPaymentResponse;
		},
		onSuccess: (data, variables) => {
			// Invalidate invoice queries
			queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.orderId) });
			queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });

			// Invalidate order queries (status changed to PAID)
			queryClient.invalidateQueries({ queryKey: ['orders'] });
		},
	});
}
