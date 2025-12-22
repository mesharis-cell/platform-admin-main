/**
 * React Query hooks for scanning operations
 * Phase 11: QR Code Scanning & Inventory Tracking
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	StartOutboundScanRequest,
	StartOutboundScanResponse,
	OutboundScanRequest,
	OutboundScanResponse,
	UploadTruckPhotosRequest,
	UploadTruckPhotosResponse,
	CompleteOutboundScanRequest,
	CompleteOutboundScanResponse,
	StartInboundScanRequest,
	StartInboundScanResponse,
	InboundScanRequest,
	InboundScanResponse,
	CompleteInboundScanRequest,
	CompleteInboundScanResponse,
	GetSessionProgressResponse,
	GetScanEventsResponse,
	GetAssetScanHistoryResponse,
	InventoryAvailabilityParams,
	GetInventoryAvailabilityResponse,
} from '@/types/scanning'

// ============================================================
// Outbound Scanning Hooks (Stateless)
// ============================================================

export function useOutboundScanProgress(orderId: string | null) {
	return useQuery({
		queryKey: ['outboundScanProgress', orderId],
		queryFn: async () => {
			if (!orderId) return null

			const response = await fetch(
				`/api/scanning/outbound/${orderId}/progress`
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to get scan progress')
			}

			return response.json()
		},
		enabled: !!orderId,
		refetchInterval: 3000, // Poll every 3 seconds for real-time updates
	})
}

export function useScanOutboundItem() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: {
			orderId: string
			qrCode: string
			quantity?: number
		}) => {
			const response = await fetch(
				`/api/scanning/outbound/${data.orderId}/scan`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						qrCode: data.qrCode,
						quantity: data.quantity,
					}),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to scan outbound item')
			}

			return response.json() as Promise<OutboundScanResponse>
		},
		onSuccess: (_, variables) => {
			// Invalidate progress query
			queryClient.invalidateQueries({
				queryKey: ['outboundScanProgress', variables.orderId],
			})
		},
	})
}

export function useUploadTruckPhotos() {
	return useMutation({
		mutationFn: async (data: { orderId: string; photos: string[] }) => {
			const response = await fetch(
				'/api/scanning/outbound/truck-photos',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to upload truck photos')
			}

			return response.json() as Promise<UploadTruckPhotosResponse>
		},
	})
}

export function useCompleteOutboundScan() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: { orderId: string }) => {
			const response = await fetch(
				`/api/scanning/outbound/${data.orderId}/complete`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to complete outbound scan'
				)
			}

			return response.json() as Promise<CompleteOutboundScanResponse>
		},
		onSuccess: data => {
			// Invalidate order details
			queryClient.invalidateQueries({ queryKey: ['order', data.orderId] })
			queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
			queryClient.invalidateQueries({
				queryKey: ['outboundScanProgress', data.orderId],
			})
		},
	})
}

// ============================================================
// Inbound Scanning Hooks (Stateless)
// ============================================================

export function useInboundScanProgress(orderId: string | null) {
	return useQuery({
		queryKey: ['inboundScanProgress', orderId],
		queryFn: async () => {
			if (!orderId) return null

			const response = await fetch(
				`/api/scanning/inbound/${orderId}/progress`
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to get scan progress')
			}

			return response.json()
		},
		enabled: !!orderId,
		refetchInterval: 3000, // Poll every 3 seconds for real-time updates
	})
}

export function useScanInboundItem() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: {
			orderId: string
			qrCode: string
			condition: 'GREEN' | 'ORANGE' | 'RED'
			notes?: string
			photos?: string[]
			refurbDaysEstimate?: number // Feedback #2
			discrepancyReason?: 'BROKEN' | 'LOST' | 'OTHER'
			quantity?: number
		}) => {
			const response = await fetch(
				`/api/scanning/inbound/${data.orderId}/scan`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						qrCode: data.qrCode,
						condition: data.condition,
						notes: data.notes,
						photos: data.photos,
						refurbDaysEstimate: data.refurbDaysEstimate, // Feedback #2
						discrepancyReason: data.discrepancyReason,
						quantity: data.quantity,
					}),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to scan inbound item')
			}

			return response.json()
		},
		onSuccess: (_, variables) => {
			// Invalidate progress query
			queryClient.invalidateQueries({
				queryKey: ['inboundScanProgress', variables.orderId],
			})
		},
	})
}

export function useCompleteInboundScan() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: { orderId: string }) => {
			const response = await fetch(
				`/api/scanning/inbound/${data.orderId}/complete`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to complete inbound scan'
				)
			}

			return response.json()
		},
		onSuccess: data => {
			// Invalidate order details and asset data
			queryClient.invalidateQueries({ queryKey: ['order', data.orderId] })
			queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
			queryClient.invalidateQueries({ queryKey: ['assets'] })
			queryClient.invalidateQueries({
				queryKey: ['inboundScanProgress', data.orderId],
			})
		},
	})
}

// ============================================================
// Scan History Hooks
// ============================================================

export function useOrderScanEvents(orderId: string) {
	return useQuery({
		queryKey: ['orderScanEvents', orderId],
		queryFn: async () => {
			const response = await fetch(`/api/orders/${orderId}/scan-events`)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to get order scan events'
				)
			}

			return response.json() as Promise<GetScanEventsResponse>
		},
		enabled: !!orderId,
	})
}

export function useAssetScanHistory(assetId: string) {
	return useQuery({
		queryKey: ['assetScanHistory', assetId],
		queryFn: async () => {
			const response = await fetch(`/api/assets/${assetId}/scan-history`)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to get asset scan history'
				)
			}

			return response.json() as Promise<GetAssetScanHistoryResponse>
		},
		enabled: !!assetId,
	})
}

// ============================================================
// Inventory Tracking Hooks
// ============================================================

export function useInventoryAvailability(params: InventoryAvailabilityParams) {
	return useQuery({
		queryKey: ['inventoryAvailability', params],
		queryFn: async () => {
			const searchParams = new URLSearchParams()
			if (params.company) searchParams.append('company', params.company)
			if (params.warehouse)
				searchParams.append('warehouse', params.warehouse)
			if (params.zone) searchParams.append('zone', params.zone)
			if (params.status) searchParams.append('status', params.status)

			const response = await fetch(
				`/api/inventory/availability?${searchParams.toString()}`
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to get inventory availability'
				)
			}

			return response.json() as Promise<GetInventoryAvailabilityResponse>
		},
		refetchInterval: 10000, // Poll every 10 seconds for real-time availability
	})
}
