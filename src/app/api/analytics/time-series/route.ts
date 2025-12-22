/**
 * GET /api/analytics/time-series
 * Fetch revenue and margin metrics broken down by time periods for trend analysis
 */

import { NextRequest } from 'next/server'
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware'
import { getTimeSeries } from '@/lib/services/analytics-service'
import type { TimeGrouping } from '@/types/analytics'

export async function GET(request: NextRequest) {
  // Require analytics:filter_by_time_period permission (PMG Admin only)
  const authResult = await requirePermission('analytics:filter_by_time_period')
  if (authResult instanceof Response) return authResult
  const { user } = authResult

  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('companyId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const groupBy = searchParams.get('groupBy') as TimeGrouping | null

    // groupBy is required
    if (!groupBy) {
      return errorResponse('groupBy parameter is required', 400)
    }

    // Validate groupBy
    if (!['month', 'quarter', 'year'].includes(groupBy)) {
      return errorResponse('Invalid groupBy. Must be month, quarter, or year', 400)
    }

    // Validate date range if both provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return errorResponse('Invalid date format. Use ISO 8601 format', 400)
      }

      if (start > end) {
        return errorResponse('startDate must be before endDate', 400)
      }
    }

    // Get time series data
    const timeSeries = await getTimeSeries(
      user.companies,
      groupBy,
      companyId,
      startDate,
      endDate
    )

    return successResponse(timeSeries, 200)
  } catch (error) {
    console.error('Error fetching time series:', error)
    return errorResponse('Failed to fetch time series', 500)
  }
}
