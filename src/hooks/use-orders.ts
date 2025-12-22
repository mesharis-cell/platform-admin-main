/**
 * Phase 6: Order Management React Query Hooks
 *
 * Client-side hooks for order creation, cart management, and order submission workflows.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	SubmitOrderRequest,
	SubmitOrderResponse,
	OrderWithDetails,
	MyOrdersListParams,
	MyOrdersListResponse,
} from '@/types/order'

// ============================================================
// Order Submission
// ============================================================

/**
 * Submit order
 */
export function useSubmitOrder(draftId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (
			data: SubmitOrderRequest
		): Promise<SubmitOrderResponse> => {
			const response = await fetch(`/api/orders/${draftId}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to submit order')
			}

			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['orders'] })
		},
	})
}

/**
 * Submit order directly from cart (no draft)
 */
export function useSubmitOrderFromCart() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: any) => {
			const response = await fetch('/api/orders/submit-from-cart', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to submit order')
			}

			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['orders'] })
			queryClient.invalidateQueries({ queryKey: ['client-orders'] })
			queryClient.invalidateQueries({
				queryKey: ['client-dashboard-summary'],
			})
		},
	})
}

// ============================================================
// Order Retrieval
// ============================================================

/**
 * Get order details
 */
export function useOrder(orderId: string | null) {
	return useQuery({
		queryKey: ['orders', orderId],
		queryFn: async (): Promise<OrderWithDetails> => {
			const response = await fetch(`/api/orders/${orderId}`)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to fetch order')
			}

			return response.json()
		},
		enabled: !!orderId,
	})
}

/**
 * List user's orders
 */
export function useMyOrders(params: MyOrdersListParams = {}) {
	const queryParams = new URLSearchParams()
	if (params.status) queryParams.append('status', params.status)
	if (params.limit) queryParams.append('limit', params.limit.toString())
	if (params.offset) queryParams.append('offset', params.offset.toString())
	if (params.sortBy) queryParams.append('sortBy', params.sortBy)
	if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

	return useQuery({
		queryKey: ['orders', 'my-orders', params],
		queryFn: async (): Promise<MyOrdersListResponse> => {
			const response = await fetch(`/api/orders/my-orders?${queryParams}`)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to fetch orders')
			}

			return response.json()
		},
	})
}

// ============================================================
// Phase 7: Admin Order Management Hooks
// ============================================================

/**
 * List all orders for admin with filtering and search
 */
export function useAdminOrders(
	params: {
		page?: number
		limit?: number
		company?: string
		brand?: string
		status?: string
		dateFrom?: string
		dateTo?: string
		search?: string
		sortBy?: string
		sortOrder?: 'asc' | 'desc'
	} = {}
) {
	const queryParams = new URLSearchParams()
	if (params.page) queryParams.append('page', params.page.toString())
	if (params.limit) queryParams.append('limit', params.limit.toString())
	if (params.company) queryParams.append('company', params.company)
	if (params.brand) queryParams.append('brand', params.brand)
	if (params.status) queryParams.append('status', params.status)
	if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom)
	if (params.dateTo) queryParams.append('dateTo', params.dateTo)
	if (params.search) queryParams.append('search', params.search)
	if (params.sortBy) queryParams.append('sortBy', params.sortBy)
	if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

	return useQuery({
		queryKey: ['orders', 'admin-list', params],
		queryFn: async () => {
			const response = await fetch(`/api/orders?${queryParams}`)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to fetch orders')
			}

			return response.json()
		},
	})
}

/**
 * Get order details for admin (includes status history)
 */
export function useAdminOrderDetails(orderId: string | null) {
	return useQuery({
		queryKey: ['orders', 'admin-detail', orderId],
		queryFn: async () => {
			const response = await fetch(`/api/orders/${orderId}`)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to fetch order details')
			}

			return response.json()
		},
		enabled: !!orderId,
	})
}

/**
 * Update job number (PMG Admin only)
 */
export function useUpdateJobNumber() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			orderId,
			jobNumber,
		}: {
			orderId: string
			jobNumber: string | null
		}) => {
			const response = await fetch(`/api/orders/${orderId}/job-number`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jobNumber }),
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to update job number')
			}

			return response.json()
		},
		onSuccess: (_, variables) => {
			// Invalidate order details and list
			queryClient.invalidateQueries({
				queryKey: ['orders', 'admin-detail', variables.orderId],
			})
			queryClient.invalidateQueries({
				queryKey: ['orders', 'admin-list'],
			})
		},
	})
}

/**
 * Export orders as CSV
 */
export function useExportOrders() {
	return useMutation({
		mutationFn: async (params: {
			company?: string
			brand?: string
			status?: string
			dateFrom?: string
			dateTo?: string
			search?: string
		}) => {
			const queryParams = new URLSearchParams()
			if (params.company) queryParams.append('company', params.company)
			if (params.brand) queryParams.append('brand', params.brand)
			if (params.status) queryParams.append('status', params.status)
			if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom)
			if (params.dateTo) queryParams.append('dateTo', params.dateTo)
			if (params.search) queryParams.append('search', params.search)

			const response = await fetch(`/api/orders/export?${queryParams}`)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to export orders')
			}

			// Get blob and create download link
			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			window.URL.revokeObjectURL(url)

			return true
		},
	})
}

// ============================================================
// Phase 8: Pricing & Quoting System Hooks
// ============================================================

/**
 * List orders in PRICING_REVIEW status (A2 Staff)
 */
export function usePricingReviewOrders() {
	return useQuery({
		queryKey: ['orders', 'pricing-review'],
		queryFn: async () => {
			const response = await fetch('/api/admin/orders/pricing-review')

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to fetch pricing review orders'
				)
			}

			return response.json()
		},
	})
}

/**
 * List orders in PENDING_APPROVAL status (PMG Admin)
 */
export function usePendingApprovalOrders() {
	return useQuery({
		queryKey: ['orders', 'pending-approval'],
		queryFn: async () => {
			const response = await fetch('/api/admin/orders/pending-approval')

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to fetch pending approval orders'
				)
			}

			return response.json()
		},
	})
}

/**
 * A2 approve standard pricing
 */
export function useA2ApproveStandard() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			orderId,
			notes,
		}: {
			orderId: string
			notes?: string
		}) => {
			const response = await fetch(
				`/api/admin/orders/${orderId}/pricing/approve-standard`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ notes }),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to approve standard pricing'
				)
			}

			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['orders', 'pricing-review'],
			})
			queryClient.invalidateQueries({
				queryKey: ['orders', 'admin-list'],
			})
		},
	})
}

/**
 * A2 adjust pricing
 */
export function useA2AdjustPricing() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			orderId,
			adjustedPrice,
			adjustmentReason,
		}: {
			orderId: string
			adjustedPrice: number
			adjustmentReason: string
		}) => {
			const response = await fetch(
				`/api/admin/orders/${orderId}/pricing/adjust`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ adjustedPrice, adjustmentReason }),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to adjust pricing')
			}

			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['orders', 'pricing-review'],
			})
			queryClient.invalidateQueries({
				queryKey: ['orders', 'admin-list'],
			})
		},
	})
}

/**
 * PMG approve pricing
 */
export function usePMGApprovePricing() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			orderId,
			a2BasePrice,
			pmgMarginPercent,
			pmgReviewNotes,
		}: {
			orderId: string
			a2BasePrice: number
			pmgMarginPercent: number
			pmgReviewNotes?: string
		}) => {
			const response = await fetch(
				`/api/admin/orders/${orderId}/pricing/pmg-approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						a2BasePrice,
						pmgMarginPercent,
						pmgReviewNotes,
					}),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to approve pricing')
			}

			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['orders', 'pending-approval'],
			})
			queryClient.invalidateQueries({
				queryKey: ['orders', 'admin-list'],
			})
		},
	})
}

/**
 * Client approve quote
 */
export function useClientApproveQuote() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			orderId,
			notes,
		}: {
			orderId: string
			notes?: string
		}) => {
			const response = await fetch(
				`/api/client/orders/${orderId}/quote/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ notes }),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to approve quote')
			}

			return response.json()
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['client-order-detail', variables.orderId],
			})
			queryClient.invalidateQueries({ queryKey: ['client-orders'] })
			queryClient.invalidateQueries({ queryKey: ['orders', 'my-orders'] })
		},
	})
}

/**
 * Client decline quote
 */
export function useClientDeclineQuote() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			orderId,
			declineReason,
		}: {
			orderId: string
			declineReason: string
		}) => {
			const response = await fetch(
				`/api/client/orders/${orderId}/quote/decline`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ declineReason }),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to decline quote')
			}

			return response.json()
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['client-order-detail', variables.orderId],
			})
			queryClient.invalidateQueries({ queryKey: ['client-orders'] })
			queryClient.invalidateQueries({ queryKey: ['orders', 'my-orders'] })
		},
	})
}
