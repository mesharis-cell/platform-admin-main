/**
 * GET /api/analytics/company-breakdown
 * Fetch per-company revenue and margin metrics for comparison
 */

import { NextRequest } from 'next/server'
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware'
import { getCompanyBreakdown } from '@/lib/services/analytics-service'
import type { CompanyBreakdownSortBy } from '@/types/analytics'

export async function GET(request: NextRequest) {
  // Require analytics:filter_by_company permission (PMG Admin only)
  const authResult = await requirePermission('analytics:filter_by_company')
  if (authResult instanceof Response) return authResult
  const { user } = authResult

  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const timePeriod = searchParams.get('timePeriod') as 'month' | 'quarter' | 'year' | undefined
    const sortBy = (searchParams.get('sortBy') || 'revenue') as CompanyBreakdownSortBy
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    // Validate timePeriod if provided
    if (timePeriod && !['month', 'quarter', 'year'].includes(timePeriod)) {
      return errorResponse('Invalid timePeriod. Must be month, quarter, or year', 400)
    }

    // Validate sortBy
    if (!['revenue', 'margin', 'orderCount', 'companyName'].includes(sortBy)) {
      return errorResponse(
        'Invalid sortBy. Must be revenue, margin, orderCount, or companyName',
        400
      )
    }

    // Validate sortOrder
    if (!['asc', 'desc'].includes(sortOrder)) {
      return errorResponse('Invalid sortOrder. Must be asc or desc', 400)
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

    // Get company breakdown
    const breakdown = await getCompanyBreakdown(
      user.companies,
      startDate,
      endDate,
      timePeriod,
      sortBy,
      sortOrder
    )

    return successResponse(breakdown, 200)
  } catch (error) {
    console.error('Error fetching company breakdown:', error)
    return errorResponse('Failed to fetch company breakdown', 500)
  }
}
