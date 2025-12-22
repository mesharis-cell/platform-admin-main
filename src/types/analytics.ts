/**
 * Phase 14: Admin Reporting & Analytics TypeScript Types
 */

/**
 * Time period presets for filtering
 */
export type TimePeriod = 'month' | 'quarter' | 'year'

/**
 * Time grouping for time series
 */
export type TimeGrouping = 'month' | 'quarter' | 'year'

/**
 * Sort options for company breakdown
 */
export type CompanyBreakdownSortBy =
  | 'revenue'
  | 'margin'
  | 'orderCount'
  | 'companyName'

/**
 * Time range representation
 */
export interface TimeRange {
  start: string // ISO 8601 timestamp
  end: string // ISO 8601 timestamp
}

/**
 * Revenue summary response
 */
export interface RevenueSummary {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  timeRange: TimeRange
  filters: {
    companyId: string | null
    companyName: string
  }
}

/**
 * Margin summary response
 */
export interface MarginSummary {
  totalMarginAmount: number
  averageMarginPercent: number
  orderCount: number
  timeRange: TimeRange
  filters: {
    companyId: string | null
    companyName: string
  }
}

/**
 * Single company metrics
 */
export interface CompanyMetrics {
  companyId: string
  companyName: string
  totalRevenue: number
  totalMarginAmount: number
  averageMarginPercent: number
  orderCount: number
  averageOrderValue: number
}

/**
 * Company breakdown response
 */
export interface CompanyBreakdown {
  companies: CompanyMetrics[]
  timeRange: TimeRange
  totals: {
    totalRevenue: number
    totalMarginAmount: number
    totalOrderCount: number
  }
}

/**
 * Single time period metrics
 */
export interface TimePeriodMetrics {
  period: string // e.g., "2024-Q1", "2024-01", "2024"
  periodStart: string // ISO 8601 timestamp
  periodEnd: string // ISO 8601 timestamp
  totalRevenue: number
  totalMarginAmount: number
  averageMarginPercent: number
  orderCount: number
}

/**
 * Time series response
 */
export interface TimeSeries {
  timeSeries: TimePeriodMetrics[]
  filters: {
    companyId: string | null
    companyName: string
    groupBy: TimeGrouping
  }
  totals: {
    totalRevenue: number
    totalMarginAmount: number
    totalOrderCount: number
  }
}

/**
 * Revenue API query parameters
 */
export interface RevenueQueryParams {
  companyId?: string
  startDate?: string
  endDate?: string
  timePeriod?: TimePeriod
}

/**
 * Margin API query parameters
 */
export interface MarginQueryParams {
  companyId?: string
  startDate?: string
  endDate?: string
  timePeriod?: TimePeriod
}

/**
 * Company breakdown API query parameters
 */
export interface CompanyBreakdownQueryParams {
  startDate?: string
  endDate?: string
  timePeriod?: TimePeriod
  sortBy?: CompanyBreakdownSortBy
  sortOrder?: 'asc' | 'desc'
}

/**
 * Time series API query parameters
 */
export interface TimeSeriesQueryParams {
  companyId?: string
  startDate?: string
  endDate?: string
  groupBy: TimeGrouping
}
