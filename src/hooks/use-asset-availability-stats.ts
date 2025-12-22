/**
 * Hook for fetching real-time asset availability statistics
 */

import { useQuery } from '@tanstack/react-query'

interface AvailabilityStats {
	assetId: string
	totalQuantity: number
	availableQuantity: number
	bookedQuantity: number
	outQuantity: number
	inMaintenanceQuantity: number
	breakdown: {
		activeBookingsCount: number
		outboundScansTotal: number
		inboundScansTotal: number
	}
}

export function useAssetAvailabilityStats(assetId: string) {
	return useQuery<AvailabilityStats>({
		queryKey: ['asset-availability-stats', assetId],
		queryFn: async () => {
			const response = await fetch(
				`/api/assets/${assetId}/availability-stats`
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(
					error.error || 'Failed to fetch availability stats'
				)
			}

			const data = await response.json()
			return data
		},
		enabled: !!assetId,
		refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
	})
}
