/**
 * Phase 14: Analytics Service
 * Business logic for revenue and margin analytics
 */

import { db } from '@/db'
import { orders, companies } from '@/db/schema'
import { eq, and, gte, lte, sql, desc, asc, inArray } from 'drizzle-orm'
import type {
  RevenueSummary,
  MarginSummary,
  CompanyBreakdown,
  TimeSeries,
  TimeGrouping,
  CompanyBreakdownSortBy,
  TimePeriodMetrics,
} from '@/types/analytics'

/**
 * Order statuses that indicate paid/confirmed revenue
 * (PAID and all subsequent statuses)
 */
const REVENUE_STATUSES = [
  'PAID',
  'CONFIRMED',
  'IN_PREPARATION',
  'READY_FOR_DELIVERY',
  'IN_TRANSIT',
  'DELIVERED',
  'IN_USE',
  'AWAITING_RETURN',
  'CLOSED',
]

/**
 * Calculate time range based on preset or custom dates
 */
export function calculateTimeRange(
  startDate?: string,
  endDate?: string,
  timePeriod?: 'month' | 'quarter' | 'year'
): { start: Date; end: Date } {
  const now = new Date()

  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate),
    }
  }

  if (timePeriod === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }

  if (timePeriod === 'quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3)
    const start = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0)
    const end = new Date(
      now.getFullYear(),
      currentQuarter * 3 + 3,
      0,
      23,
      59,
      59,
      999
    )
    return { start, end }
  }

  if (timePeriod === 'year') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    return { start, end }
  }

  // Default: all time
  const start = new Date(2020, 0, 1, 0, 0, 0, 0) // Platform inception
  const end = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Get revenue summary
 */
export async function getRevenueSummary(
  userCompanies: string[],
  companyId?: string,
  startDate?: string,
  endDate?: string,
  timePeriod?: 'month' | 'quarter' | 'year'
): Promise<RevenueSummary> {
  const timeRange = calculateTimeRange(startDate, endDate, timePeriod)

  // Build query conditions
  const conditions = [
    inArray(orders.status, REVENUE_STATUSES as any),
    gte(orders.invoicePaidAt, timeRange.start),
    lte(orders.invoicePaidAt, timeRange.end),
  ]

  // Company filtering
  if (companyId) {
    conditions.push(eq(orders.company, companyId))
  } else if (!userCompanies.includes('*')) {
    conditions.push(inArray(orders.company, userCompanies))
  }

  // Execute query
  const result = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${orders.finalTotalPrice}), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(and(...conditions))

  const data = result[0] || { totalRevenue: 0, orderCount: 0 }
  const averageOrderValue =
    data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0

  // Get company name if filtering by company
  let companyName = 'All Companies'
  if (companyId) {
    const companyResult = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    companyName = companyResult[0]?.name || 'Unknown Company'
  }

  return {
    totalRevenue: Number(data.totalRevenue),
    orderCount: Number(data.orderCount),
    averageOrderValue: Number(averageOrderValue.toFixed(2)),
    timeRange: {
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString(),
    },
    filters: {
      companyId: companyId || null,
      companyName,
    },
  }
}

/**
 * Get margin summary
 */
export async function getMarginSummary(
  userCompanies: string[],
  companyId?: string,
  startDate?: string,
  endDate?: string,
  timePeriod?: 'month' | 'quarter' | 'year'
): Promise<MarginSummary> {
  const timeRange = calculateTimeRange(startDate, endDate, timePeriod)

  // Build query conditions
  const conditions = [
    inArray(orders.status, REVENUE_STATUSES as any),
    gte(orders.invoicePaidAt, timeRange.start),
    lte(orders.invoicePaidAt, timeRange.end),
  ]

  // Company filtering
  if (companyId) {
    conditions.push(eq(orders.company, companyId))
  } else if (!userCompanies.includes('*')) {
    conditions.push(inArray(orders.company, userCompanies))
  }

  // Execute query
  const result = await db
    .select({
      totalMarginAmount: sql<number>`COALESCE(SUM(${orders.pmgMarginAmount}), 0)`,
      averageMarginPercent: sql<number>`COALESCE(AVG(${orders.pmgMarginPercent}), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(and(...conditions))

  const data = result[0] || {
    totalMarginAmount: 0,
    averageMarginPercent: 0,
    orderCount: 0,
  }

  // Get company name if filtering by company
  let companyName = 'All Companies'
  if (companyId) {
    const companyResult = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    companyName = companyResult[0]?.name || 'Unknown Company'
  }

  return {
    totalMarginAmount: Number(data.totalMarginAmount),
    averageMarginPercent: Number(
      parseFloat(data.averageMarginPercent.toString()).toFixed(2)
    ),
    orderCount: Number(data.orderCount),
    timeRange: {
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString(),
    },
    filters: {
      companyId: companyId || null,
      companyName,
    },
  }
}

/**
 * Get company breakdown
 */
export async function getCompanyBreakdown(
  userCompanies: string[],
  startDate?: string,
  endDate?: string,
  timePeriod?: 'month' | 'quarter' | 'year',
  sortBy: CompanyBreakdownSortBy = 'revenue',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<CompanyBreakdown> {
  const timeRange = calculateTimeRange(startDate, endDate, timePeriod)

  // Build query conditions
  const conditions = [
    inArray(orders.status, REVENUE_STATUSES as any),
    gte(orders.invoicePaidAt, timeRange.start),
    lte(orders.invoicePaidAt, timeRange.end),
  ]

  // Company scope filtering
  if (!userCompanies.includes('*')) {
    conditions.push(inArray(orders.company, userCompanies))
  }

  // Execute query with grouping
  const result = await db
    .select({
      companyId: orders.company,
      companyName: companies.name,
      totalRevenue: sql<number>`COALESCE(SUM(${orders.finalTotalPrice}), 0)`,
      totalMarginAmount: sql<number>`COALESCE(SUM(${orders.pmgMarginAmount}), 0)`,
      averageMarginPercent: sql<number>`COALESCE(AVG(${orders.pmgMarginPercent}), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .innerJoin(companies, eq(orders.company, companies.id))
    .where(and(...conditions))
    .groupBy(orders.company, companies.name)

  // Calculate average order value and format data
  const companyMetrics = result.map((row) => {
    const orderCount = Number(row.orderCount)
    const totalRevenue = Number(row.totalRevenue)
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0

    return {
      companyId: row.companyId,
      companyName: row.companyName,
      totalRevenue,
      totalMarginAmount: Number(row.totalMarginAmount),
      averageMarginPercent: Number(
        parseFloat(row.averageMarginPercent.toString()).toFixed(2)
      ),
      orderCount,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
    }
  })

  // Sort results
  const sortedMetrics = companyMetrics.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'revenue':
        comparison = a.totalRevenue - b.totalRevenue
        break
      case 'margin':
        comparison = a.totalMarginAmount - b.totalMarginAmount
        break
      case 'orderCount':
        comparison = a.orderCount - b.orderCount
        break
      case 'companyName':
        comparison = a.companyName.localeCompare(b.companyName)
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Calculate totals
  const totals = {
    totalRevenue: companyMetrics.reduce((sum, m) => sum + m.totalRevenue, 0),
    totalMarginAmount: companyMetrics.reduce(
      (sum, m) => sum + m.totalMarginAmount,
      0
    ),
    totalOrderCount: companyMetrics.reduce((sum, m) => sum + m.orderCount, 0),
  }

  return {
    companies: sortedMetrics,
    timeRange: {
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString(),
    },
    totals,
  }
}

/**
 * Format period label based on grouping
 */
function formatPeriodLabel(date: Date, groupBy: TimeGrouping): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const quarter = Math.floor(date.getMonth() / 3) + 1

  switch (groupBy) {
    case 'month':
      return `${year}-${month.toString().padStart(2, '0')}`
    case 'quarter':
      return `${year}-Q${quarter}`
    case 'year':
      return `${year}`
  }
}

/**
 * Get time series data
 */
export async function getTimeSeries(
  userCompanies: string[],
  groupBy: TimeGrouping,
  companyId?: string,
  startDate?: string,
  endDate?: string
): Promise<TimeSeries> {
  const timeRange = calculateTimeRange(startDate, endDate)

  // Build query conditions
  const conditions = [
    inArray(orders.status, REVENUE_STATUSES as any),
    gte(orders.invoicePaidAt, timeRange.start),
    lte(orders.invoicePaidAt, timeRange.end),
  ]

  // Company filtering
  if (companyId) {
    conditions.push(eq(orders.company, companyId))
  } else if (!userCompanies.includes('*')) {
    conditions.push(inArray(orders.company, userCompanies))
  }

  // Determine PostgreSQL date_trunc format
  const truncFormat = groupBy === 'month' ? 'month' : groupBy === 'quarter' ? 'quarter' : 'year'

  // Create the date truncation expression to ensure consistency between SELECT and GROUP BY
  // Use sql.raw() for truncFormat to insert it as a literal, not a parameter
  const periodExpression = sql`date_trunc(${sql.raw(`'${truncFormat}'`)}, ${orders.invoicePaidAt})`

  // Execute query with time grouping
  const result = await db
    .select({
      period: sql<Date>`${periodExpression}`.as('period'),
      totalRevenue: sql<number>`COALESCE(SUM(${orders.finalTotalPrice}), 0)`,
      totalMarginAmount: sql<number>`COALESCE(SUM(${orders.pmgMarginAmount}), 0)`,
      averageMarginPercent: sql<number>`COALESCE(AVG(${orders.pmgMarginPercent}), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(periodExpression)
    .orderBy(periodExpression)

  // Format time series data
  const timeSeries: TimePeriodMetrics[] = result.map((row) => {
    const periodDate = new Date(row.period as Date)
    const periodLabel = formatPeriodLabel(periodDate, groupBy)

    // Calculate period end based on grouping
    let periodEnd: Date
    if (groupBy === 'month') {
      periodEnd = new Date(
        periodDate.getFullYear(),
        periodDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )
    } else if (groupBy === 'quarter') {
      const quarterMonth = Math.floor(periodDate.getMonth() / 3) * 3
      periodEnd = new Date(
        periodDate.getFullYear(),
        quarterMonth + 3,
        0,
        23,
        59,
        59,
        999
      )
    } else {
      periodEnd = new Date(periodDate.getFullYear(), 11, 31, 23, 59, 59, 999)
    }

    return {
      period: periodLabel,
      periodStart: periodDate.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalRevenue: Number(row.totalRevenue),
      totalMarginAmount: Number(row.totalMarginAmount),
      averageMarginPercent: Number(
        parseFloat(row.averageMarginPercent.toString()).toFixed(2)
      ),
      orderCount: Number(row.orderCount),
    }
  })

  // Get company name if filtering by company
  let companyName = 'All Companies'
  if (companyId) {
    const companyResult = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    companyName = companyResult[0]?.name || 'Unknown Company'
  }

  // Calculate totals
  const totals = {
    totalRevenue: timeSeries.reduce((sum, m) => sum + m.totalRevenue, 0),
    totalMarginAmount: timeSeries.reduce((sum, m) => sum + m.totalMarginAmount, 0),
    totalOrderCount: timeSeries.reduce((sum, m) => sum + m.orderCount, 0),
  }

  return {
    timeSeries,
    filters: {
      companyId: companyId || null,
      companyName,
      groupBy,
    },
    totals,
  }
}
