'use client'

/**
 * Phase 13: Event Calendar Page
 * Professional calendar view of upcoming events with month navigation
 */

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useClientCalendar } from '@/hooks/use-client-orders'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
	ChevronLeft,
	ChevronRight,
	Calendar as CalendarIcon,
	Plus,
} from 'lucide-react'
import {
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	eachDayOfInterval,
	format,
	isSameMonth,
	isToday,
} from 'date-fns'

// Order status color coding for calendar events
const STATUS_CONFIG: Record<
	string,
	{
		label: string
		color: string
	}
> = {
	DRAFT: {
		label: 'DRAFT',
		color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
	},
	SUBMITTED: {
		label: 'SUBMITTED',
		color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
	},
	PRICING_REVIEW: {
		label: 'PRICING',
		color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
	},
	PENDING_APPROVAL: {
		label: 'PMG REVIEW',
		color: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
	},
	QUOTED: {
		label: 'QUOTED',
		color: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
	},
	APPROVED: {
		label: 'APPROVED',
		color: 'bg-green-500/10 text-green-700 border-green-500/20',
	},
	DECLINED: {
		label: 'DECLINED',
		color: 'bg-red-500/10 text-red-700 border-red-500/20',
	},
	INVOICED: {
		label: 'INVOICED',
		color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
	},
	PAID: {
		label: 'PAID',
		color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
	},
	CONFIRMED: {
		label: 'CONFIRMED',
		color: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
	},
	IN_PREPARATION: {
		label: 'IN PREP',
		color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
	},
	READY_FOR_DELIVERY: {
		label: 'READY',
		color: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
	},
	IN_TRANSIT: {
		label: 'IN TRANSIT',
		color: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
	},
	DELIVERED: {
		label: 'DELIVERED',
		color: 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20',
	},
	IN_USE: {
		label: 'IN USE',
		color: 'bg-pink-500/10 text-pink-700 border-pink-500/20',
	},
	AWAITING_RETURN: {
		label: 'AWAITING RET.',
		color: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
	},
	CLOSED: {
		label: 'CLOSED',
		color: 'bg-slate-600/10 text-slate-700 border-slate-600/20',
	},
}

const getStatusColor = (status: string) => {
	return (
		STATUS_CONFIG[status]?.color ||
		'bg-gray-500/10 text-gray-700 border-gray-500/20'
	)
}

const getStatusLabel = (status: string) => {
	return STATUS_CONFIG[status]?.label || status.replace(/_/g, ' ')
}

export default function EventCalendarPage() {
	const currentDate = new Date()
	const [selectedMonth, setSelectedMonth] = useState(
		currentDate.getMonth() + 1
	) // 1-12
	const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
	const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

	// Fetch calendar events for selected month
	// Format month as YYYY-MM for API
	const formattedMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

	const { data, isLoading, error } = useClientCalendar({
		month: formattedMonth, // Now passes "2024-12" format
	})

	// Group events by date - spread multi-day events across all dates
	const eventsByDate = useMemo(() => {
		if (!data?.data) return {}

		const grouped: Record<string, typeof data.data> = {}

		data.data.forEach(event => {
			const startDate = new Date(event.event_start_date)
			const endDate = new Date(event.event_end_date)

			// Loop through each day from start to end (inclusive)
			const currentDate = new Date(startDate)
			while (currentDate <= endDate) {
				const dateKey = currentDate.toISOString().split('T')[0]
				if (!grouped[dateKey]) {
					grouped[dateKey] = []
				}
				grouped[dateKey].push(event)

				// Move to next day
				currentDate.setDate(currentDate.getDate() + 1)
			}
		})

		return grouped
	}, [data])

	// Generate calendar days for the selected month
	const calendarDays = useMemo(() => {
		const monthStart = startOfMonth(
			new Date(selectedYear, selectedMonth - 1)
		)
		const monthEnd = endOfMonth(monthStart)
		const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Start on Sunday
		const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

		return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
	}, [selectedMonth, selectedYear])

	// Month navigation
	const goToPreviousMonth = () => {
		if (selectedMonth === 1) {
			setSelectedMonth(12)
			setSelectedYear(selectedYear - 1)
		} else {
			setSelectedMonth(selectedMonth - 1)
		}
	}

	const goToNextMonth = () => {
		if (selectedMonth === 12) {
			setSelectedMonth(1)
			setSelectedYear(selectedYear + 1)
		} else {
			setSelectedMonth(selectedMonth + 1)
		}
	}

	const goToToday = () => {
		setSelectedMonth(currentDate.getMonth() + 1)
		setSelectedYear(currentDate.getFullYear())
	}

	// Toggle expanded state for a specific day
	const toggleDayExpansion = (dateKey: string) => {
		setExpandedDays(prev => {
			const newSet = new Set(prev)
			if (newSet.has(dateKey)) {
				newSet.delete(dateKey)
			} else {
				newSet.add(dateKey)
			}
			return newSet
		})
	}

	// Format month name
	const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString(
		'default',
		{
			month: 'long',
			year: 'numeric',
		}
	)

	return (
		<div className='min-h-screen bg-linear-to-br from-background via-muted/30 to-background'>
			{/* Header */}
			<div className='border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-10'>
				<div className='container mx-auto px-6 py-6'>
					<div className='flex items-center justify-between'>
						<div>
							<h1 className='text-3xl font-bold text-foreground tracking-tight'>
								Event Calendar
							</h1>
							<p className='text-sm text-muted-foreground mt-1'>
								View your upcoming event schedule
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className='container mx-auto px-6 py-8'>
				{/* Month Navigation */}
				<Card className='bg-card/80 backdrop-blur-sm border-border/40 mb-6'>
					<CardContent className='py-4'>
						<div className='flex items-center justify-between'>
							<div className='flex items-center gap-3'>
								<Button
									onClick={goToPreviousMonth}
									variant='outline'
									size='icon'
								>
									<ChevronLeft className='h-5 w-5' />
								</Button>
								<h2 className='text-2xl font-bold text-foreground min-w-[200px] text-center font-mono'>
									{monthName}
								</h2>
								<Button
									onClick={goToNextMonth}
									variant='outline'
									size='icon'
								>
									<ChevronRight className='h-5 w-5' />
								</Button>
							</div>
							<Button
								onClick={goToToday}
								variant='secondary'
								className='gap-2'
							>
								<CalendarIcon className='h-4 w-4' />
								Go to Today
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Calendar Grid */}
				{isLoading ? (
					<div className='space-y-6'>
						<Skeleton className='h-96 w-full' />
					</div>
				) : error ? (
					<Card className='bg-card/80 backdrop-blur-sm border-border/40'>
						<CardContent className='p-12 text-center'>
							<p className='text-destructive font-medium'>
								Failed to load calendar events. Please try
								again.
							</p>
						</CardContent>
					</Card>
				) : (
					<Card className='bg-card/80 backdrop-blur-sm border-border/40'>
						<CardContent className='p-6'>
							{/* Weekday Headers */}
							<div className='grid grid-cols-7 gap-2 mb-2'>
								{[
									'Sun',
									'Mon',
									'Tue',
									'Wed',
									'Thu',
									'Fri',
									'Sat',
								].map(day => (
									<div
										key={day}
										className='text-center font-semibold text-sm text-muted-foreground py-2'
									>
										{day}
									</div>
								))}
							</div>

							{/* Calendar Days */}
							<div className='grid grid-cols-7 gap-2'>
								{calendarDays.map((day, index) => {
									const dateKey = format(
										day,
										'yyyy-MM-dd'
									)
									const dayEvents =
										eventsByDate[dateKey] || []
									const isCurrentMonth = isSameMonth(
										day,
										new Date(
											selectedYear,
											selectedMonth - 1
										)
									)
									const isTodayDate = isToday(day)

									return (
										<div
											key={index}
											className={`min-h-[120px] border-2 rounded-lg p-2 transition-all ${isTodayDate
												? 'border-primary bg-primary/5'
												: isCurrentMonth
													? 'border-border bg-card hover:border-primary/30'
													: 'border-border/40 bg-muted/20 opacity-40'
												}`}
										>
											<div
												className={`text-sm font-semibold mb-2 ${isTodayDate
													? 'text-primary'
													: isCurrentMonth
														? 'text-foreground'
														: 'text-muted-foreground'
													}`}
											>
												{format(day, 'd')}
											</div>

											{/* Events for this day */}
											<div className='flex flex-col space-y-1'>
												{dayEvents
													.slice(
														0,
														expandedDays.has(
															dateKey
														)
															? dayEvents.length
															: 2
													)
													.map(event => (
														<Link
															key={event.id}
															href={`/orders/${event.order_id}`}
														>
															<div
																className={`text-xs p-1.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(event.status)}`}
																title={`${event.order_id} - ${event.venue_name}`}
															>
																<div className='truncate text-[10px] opacity-80 text-center'>
																	{event.venue_name}
																</div>
															</div>
															<div className='truncate text-[11px] opacity-80 mt-2 text-center'>
																{event.order_id}
															</div>
															<div className='truncate text-[11px] opacity-80 mt-2 text-center'>
																{event.company.name}
															</div>
														</Link>
													))}
												{dayEvents.length > 2 && (
													<button
														onClick={() => toggleDayExpansion(dateKey)}
														className='text-[10px] text-primary hover:text-primary/80 font-medium px-1.5 py-1 text-left transition-colors'
													>
														{expandedDays.has(dateKey)
															? 'Show less'
															: `+ ${dayEvents.length - 2} more`}
													</button>
												)}
											</div>
										</div>
									)
								})}
							</div>

							{/* Event Legend */}
							{Object.keys(eventsByDate).length > 0 && (
								<div className='mt-6 pt-6 border-t border-border/40'>
									<p className='text-sm font-semibold mb-3'>
										Event Status Legend
									</p>
									<div className='flex flex-wrap gap-2'>
										{Array.from(
											new Set<string>(
												data?.data?.map(
													e => e.status
												) || []
											)
										).map(status => (
											<Badge
												key={status}
												variant='outline'
												className={`${getStatusColor(status)} text-xs`}
											>
												{getStatusLabel(status)}
											</Badge>
										))}
									</div>
								</div>
							)}

							{/* No events message */}
							{Object.keys(eventsByDate).length === 0 && (
								<div className='text-center py-12'>
									<CalendarIcon className='h-16 w-16 mx-auto text-muted-foreground/50 mb-4' />
									<p className='text-foreground font-medium text-lg mb-2'>
										No events this month
									</p>
									<p className='text-sm text-muted-foreground mb-6'>
										You don't have any scheduled events
										for {monthName}
									</p>
									<Link href='/catalog'>
										<Button className='gap-2'>
											<Plus className='h-4 w-4' />
											Create New Order
										</Button>
									</Link>
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}
