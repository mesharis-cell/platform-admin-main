'use client'

/**
 * Phase 14: Analytics Dashboard
 * Financial operations command center for PMG Admins
 */

import { useState } from 'react'
import {
  useRevenueSummary,
  useMarginSummary,
  useCompanyBreakdown,
  useTimeSeries,
} from '@/hooks/use-analytics'
import { useCompanies } from '@/hooks/use-companies'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  BarChart3,
  Activity,
  ArrowUpRight,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin-header'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type TimePeriod = 'month' | 'quarter' | 'year' | 'all'
type TimeGrouping = 'month' | 'quarter' | 'year'

export default function AnalyticsPage() {
  // Filter state
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('month')

  // Fetch data
  const { data: companies, isLoading: companiesLoading } = useCompanies({})

  const revenueParams = {
    companyId: selectedCompany === 'all' ? undefined : selectedCompany,
    timePeriod: timePeriod === 'all' ? undefined : timePeriod,
  }

  const marginParams = {
    companyId: selectedCompany === 'all' ? undefined : selectedCompany,
    timePeriod: timePeriod === 'all' ? undefined : timePeriod,
  }

  const breakdownParams = {
    timePeriod: timePeriod === 'all' ? undefined : timePeriod,
    sortBy: 'revenue' as const,
    sortOrder: 'desc' as const,
  }

  const timeSeriesParams = {
    companyId: selectedCompany === 'all' ? undefined : selectedCompany,
    groupBy: timeGrouping,
  }

  const { data: revenue, isLoading: revenueLoading } = useRevenueSummary(revenueParams)
  const { data: margin, isLoading: marginLoading } = useMarginSummary(marginParams)
  const { data: breakdown, isLoading: breakdownLoading } = useCompanyBreakdown(breakdownParams)
  const { data: timeSeries, isLoading: timeSeriesLoading } = useTimeSeries(timeSeriesParams)

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-muted/30 via-background to-muted/20">
      {/* Header */}
      <AdminHeader
        icon={BarChart3}
        title="ANALYTICS DASHBOARD"
        description="Revenue · Margins · Performance"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[140px] border-0 h-auto p-0 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedCompany}
                onValueChange={setSelectedCompany}
                disabled={companiesLoading}
              >
                <SelectTrigger className="w-[180px] border-0 h-auto p-0 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies?.data.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">
                  Total Revenue
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {revenueLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="space-y-1">
                  <div className="text-3xl font-bold tracking-tight font-mono">
                    {formatCurrency(revenue?.data?.totalRevenue || 0)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Activity className="h-3 w-3" />
                    <span>{revenue?.data?.orderCount || 0} paid orders</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Margin */}
          <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">
                  Platform Margin
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {marginLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="space-y-1">
                  <div className="text-3xl font-bold tracking-tight font-mono">
                    {formatCurrency(margin?.data?.totalMarginAmount || 0)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Badge variant="secondary" className="h-5 px-2 text-[10px] font-mono">
                      {formatPercent(margin?.data?.averageMarginPercent || 0)} avg
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Average Order Value */}
          <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-chart-1/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">
                  Avg Order Value
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-chart-1/10 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 text-chart-1" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {revenueLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="space-y-1">
                  <div className="text-3xl font-bold tracking-tight font-mono">
                    {formatCurrency(revenue?.data?.averageOrderValue || 0)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span>per completed order</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-chart-2/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">
                  Completed Orders
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-chart-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {revenueLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="space-y-1">
                  <div className="text-3xl font-bold tracking-tight font-mono">
                    {revenue?.data?.orderCount || 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span>paid & fulfilled</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Time Series Chart */}
        <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold font-mono">Revenue Trends</CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  Historical revenue and margin performance
                </CardDescription>
              </div>
              <Select value={timeGrouping} onValueChange={(v) => setTimeGrouping(v as TimeGrouping)}>
                <SelectTrigger className="w-[130px] font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">By Month</SelectItem>
                  <SelectItem value="quarter">By Quarter</SelectItem>
                  <SelectItem value="year">By Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {timeSeriesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : timeSeries && timeSeries?.data?.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeries.data.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="period"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="var(--font-mono)"
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `AED ${(value / 1000).toFixed(0)}k`}
                    fontFamily="var(--font-mono)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend
                    wrapperStyle={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Revenue"
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalMarginAmount"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    name="Platform Margin"
                    dot={{ fill: 'hsl(var(--secondary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground font-mono text-sm">
                No data available for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Breakdown Table */}
        <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-bold font-mono">Company Performance</CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              Revenue and margin breakdown by company
            </CardDescription>
          </CardHeader>
          <CardContent>
            {breakdownLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : breakdown && breakdown.data?.companies.length > 0 ? (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-mono text-xs uppercase">Company</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Revenue</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Platform Margin</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Margin %</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Orders</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.data?.companies.map((company) => (
                      <TableRow
                        key={company.companyId}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="font-medium font-mono">{company.companyName}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-primary">
                          {formatCurrency(company.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-secondary">
                          {formatCurrency(company.totalMarginAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {formatPercent(company.averageMarginPercent)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {company.orderCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(company.averageOrderValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 flex items-center justify-center text-muted-foreground font-mono text-sm">
                No company data available
              </div>
            )}

            {/* Totals Summary */}
            {breakdown && breakdown.data?.companies.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                      Total Revenue
                    </div>
                    <div className="text-2xl font-bold font-mono text-primary">
                      {formatCurrency(breakdown.data?.totals.totalRevenue)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                      Total Margin
                    </div>
                    <div className="text-2xl font-bold font-mono text-secondary">
                      {formatCurrency(breakdown.data?.totals.totalMarginAmount)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                      Total Orders
                    </div>
                    <div className="text-2xl font-bold font-mono">
                      {breakdown.data?.totals.totalOrderCount}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
