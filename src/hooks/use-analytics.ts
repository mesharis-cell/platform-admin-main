/**
 * Phase 14: Analytics React Query Hooks
 */

import { useQuery } from '@tanstack/react-query'
import type {
  RevenueSummary,
  MarginSummary,
  CompanyBreakdown,
  TimeSeries,
  RevenueQueryParams,
  MarginQueryParams,
  CompanyBreakdownQueryParams,
  TimeSeriesQueryParams,
} from '@/types/analytics'

/**
 * Fetch revenue summary
 */
export function useRevenueSummary(params: RevenueQueryParams = {}) {
  return useQuery({
    queryKey: ['analytics', 'revenue', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()

      if (params.companyId) searchParams.set('companyId', params.companyId)
      if (params.startDate) searchParams.set('startDate', params.startDate)
      if (params.endDate) searchParams.set('endDate', params.endDate)
      if (params.timePeriod) searchParams.set('timePeriod', params.timePeriod)

      const response = await fetch(`/api/analytics/revenue?${searchParams.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch revenue summary')
      }

      return response.json() as Promise<RevenueSummary>
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Fetch margin summary
 */
export function useMarginSummary(params: MarginQueryParams = {}) {
  return useQuery({
    queryKey: ['analytics', 'margins', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()

      if (params.companyId) searchParams.set('companyId', params.companyId)
      if (params.startDate) searchParams.set('startDate', params.startDate)
      if (params.endDate) searchParams.set('endDate', params.endDate)
      if (params.timePeriod) searchParams.set('timePeriod', params.timePeriod)

      const response = await fetch(`/api/analytics/margins?${searchParams.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch margin summary')
      }

      return response.json() as Promise<MarginSummary>
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Fetch company breakdown
 */
export function useCompanyBreakdown(params: CompanyBreakdownQueryParams = {}) {
  return useQuery({
    queryKey: ['analytics', 'company-breakdown', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()

      if (params.startDate) searchParams.set('startDate', params.startDate)
      if (params.endDate) searchParams.set('endDate', params.endDate)
      if (params.timePeriod) searchParams.set('timePeriod', params.timePeriod)
      if (params.sortBy) searchParams.set('sortBy', params.sortBy)
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

      const response = await fetch(
        `/api/analytics/company-breakdown?${searchParams.toString()}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch company breakdown')
      }

      return response.json() as Promise<CompanyBreakdown>
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Fetch time series data
 */
export function useTimeSeries(params: TimeSeriesQueryParams) {
  return useQuery({
    queryKey: ['analytics', 'time-series', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()

      searchParams.set('groupBy', params.groupBy) // Required parameter

      if (params.companyId) searchParams.set('companyId', params.companyId)
      if (params.startDate) searchParams.set('startDate', params.startDate)
      if (params.endDate) searchParams.set('endDate', params.endDate)

      const response = await fetch(`/api/analytics/time-series?${searchParams.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch time series')
      }

      return response.json() as Promise<TimeSeries>
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!params.groupBy, // Only run query if groupBy is provided
  })
}
