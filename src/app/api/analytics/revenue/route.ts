/**
 * GET /api/analytics/revenue
 * Fetch total revenue across all companies or filtered by company
 */

import { NextRequest } from 'next/server'
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware'
import { getRevenueSummary } from '@/lib/services/analytics-service'

export async function GET(request: NextRequest) {
  // Require analytics:view_revenue permission (PMG Admin only)
  const authResult = await requirePermission('analytics:view_revenue')
  if (authResult instanceof Response) return authResult
  const { user } = authResult

  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('companyId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const timePeriod = searchParams.get('timePeriod') as 'month' | 'quarter' | 'year' | undefined

    // Validate timePeriod if provided
    if (timePeriod && !['month', 'quarter', 'year'].includes(timePeriod)) {
      return errorResponse('Invalid timePeriod. Must be month, quarter, or year', 400)
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

    // Get revenue summary
    const summary = await getRevenueSummary(
      user.companies,
      companyId,
      startDate,
      endDate,
      timePeriod
    )

    return successResponse(summary, 200)
  } catch (error) {
    console.error('Error fetching revenue summary:', error)
    return errorResponse('Failed to fetch revenue summary', 500)
  }
}
