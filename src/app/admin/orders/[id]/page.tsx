'use client'

/**
 * Phase 10: Enhanced Admin Order Detail Page
 * Status progression controls, time windows management, and comprehensive order view
 *
 * Design: Industrial-Technical Command Center
 * - Monospace Geist Mono typography for precision
 * - Grid-based data layout with clear hierarchy
 * - Interactive status machine with allowed transitions
 * - Timeline visualization with connection lines
 */

import { use, useState } from 'react'
import Link from 'next/link'
import { useAdminOrderDetails, useUpdateJobNumber } from '@/hooks/use-orders'
import { ScanActivityTimeline } from '@/components/scanning/scan-activity-timeline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
	ArrowLeft,
	Package,
	Calendar,
	MapPin,
	User,
	Phone,
	Mail,
	FileText,
	Clock,
	Edit,
	Save,
	X,
	Boxes,
	ChevronRight,
	Truck,
	PlayCircle,
	AlertCircle,
	ScanLine,
	DollarSign,
	CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { hasPermission } from '@/lib/auth/permissions'
import { useSession } from '@/lib/auth'

// Status configuration with next states for state machine (Feedback #1: Updated for new flow)
const STATUS_CONFIG: Record<
	string,
	{
		label: string
		color: string
		nextStates: string[]
	}
> = {
	DRAFT: {
		label: 'DRAFT',
		color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
		nextStates: ['SUBMITTED'],
	},
	SUBMITTED: {
		label: 'SUBMITTED',
		color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
		nextStates: ['PRICING_REVIEW'],
	},
	PRICING_REVIEW: {
		label: 'PRICING',
		color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
		nextStates: ['QUOTED', 'PENDING_APPROVAL'],
	},
	PENDING_APPROVAL: {
		label: 'PMG REVIEW',
		color: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
		nextStates: ['QUOTED'],
	},
	QUOTED: {
		label: 'QUOTED',
		color: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
		nextStates: ['CONFIRMED', 'DECLINED'],
	},
	DECLINED: {
		label: 'DECLINED',
		color: 'bg-red-500/10 text-red-700 border-red-500/20',
		nextStates: [],
	},
	CONFIRMED: {
		label: 'CONFIRMED',
		color: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
		nextStates: ['IN_PREPARATION'],
	},
	IN_PREPARATION: {
		label: 'IN PREP',
		color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
		nextStates: ['READY_FOR_DELIVERY'],
	},
	READY_FOR_DELIVERY: {
		label: 'READY',
		color: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
		nextStates: ['IN_TRANSIT'],
	},
	IN_TRANSIT: {
		label: 'IN TRANSIT',
		color: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
		nextStates: ['DELIVERED'],
	},
	DELIVERED: {
		label: 'DELIVERED',
		color: 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20',
		nextStates: ['IN_USE'],
	},
	IN_USE: {
		label: 'IN USE',
		color: 'bg-pink-500/10 text-pink-700 border-pink-500/20',
		nextStates: ['AWAITING_RETURN'],
	},
	AWAITING_RETURN: {
		label: 'AWAITING RET.',
		color: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
		nextStates: ['CLOSED'],
	},
	CLOSED: {
		label: 'CLOSED',
		color: 'bg-slate-600/10 text-slate-700 border-slate-600/20',
		nextStates: [],
	},
}

export default function AdminOrderDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const resolvedParams = use(params)
	const { data: order, isLoading } = useAdminOrderDetails(resolvedParams.id)
	console.log(order)
	const { data: session } = useSession()
	const updateJobNumber = useUpdateJobNumber()

	// Check permissions - PMG Admin can see full pricing breakdown
	const canSeePMGMargin = session?.user
		? hasPermission(session.user as any, 'pricing:pmg_approve')
		: false
	const canConfirmPayment = session?.user
		? hasPermission(session.user as any, 'invoices:confirm_payment')
		: false

	const [isEditingJobNumber, setIsEditingJobNumber] = useState(false)
	const [jobNumber, setJobNumber] = useState('')
	const [statusDialogOpen, setStatusDialogOpen] = useState(false)
	const [selectedNextStatus, setSelectedNextStatus] = useState('')
	const [statusNotes, setStatusNotes] = useState('')
	const [timeWindowsOpen, setTimeWindowsOpen] = useState(false)
	const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
	const [paymentDetails, setPaymentDetails] = useState({
		paymentMethod: '',
		paymentReference: '',
		paymentDate: new Date(),
		notes: '',
	})
	const [timeWindows, setTimeWindows] = useState<{
		deliveryWindowStart: Date | undefined
		deliveryWindowEnd: Date | undefined
		pickupWindowStart: Date | undefined
		pickupWindowEnd: Date | undefined
	}>({
		deliveryWindowStart: undefined,
		deliveryWindowEnd: undefined,
		pickupWindowStart: undefined,
		pickupWindowEnd: undefined,
	})

	// Initialize states when order loads
	if (order) {
		if (!jobNumber && order.jobNumber) setJobNumber(order.jobNumber)
		if (!timeWindows.deliveryWindowStart && order.deliveryWindowStart) {
			setTimeWindows({
				deliveryWindowStart: new Date(order.deliveryWindowStart),
				deliveryWindowEnd: new Date(order.deliveryWindowEnd),
				pickupWindowStart: new Date(order.pickupWindowStart),
				pickupWindowEnd: new Date(order.pickupWindowEnd),
			})
		}
	}

	const handleJobNumberSave = async () => {
		if (!order) return
		try {
			await updateJobNumber.mutateAsync({
				orderId: order.id,
				jobNumber: jobNumber || null,
			})
			setIsEditingJobNumber(false)
			toast.success('Job number updated')
		} catch (error: any) {
			toast.error(error.message || 'Failed to update job number')
		}
	}

	const handleStatusProgression = async () => {
		if (!order || !selectedNextStatus) return
		try {
			const response = await fetch(`/api/orders/${order.id}/status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					newStatus: selectedNextStatus,
					notes: statusNotes || undefined,
				}),
			})
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to progress status')
			}
			toast.success(
				`Status updated to ${STATUS_CONFIG[selectedNextStatus]?.label}`
			)
			setStatusDialogOpen(false)
			setSelectedNextStatus('')
			setStatusNotes('')
			window.location.reload()
		} catch (error: any) {
			toast.error(error.message)
		}
	}

	const handleTimeWindowsSave = async () => {
		if (!order) return

		// Validate all windows are set
		if (
			!timeWindows.deliveryWindowStart ||
			!timeWindows.deliveryWindowEnd ||
			!timeWindows.pickupWindowStart ||
			!timeWindows.pickupWindowEnd
		) {
			toast.error('Please set all delivery and pickup windows')
			return
		}

		try {
			const response = await fetch(
				`/api/orders/${order.id}/time-windows`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						deliveryWindowStart:
							timeWindows.deliveryWindowStart.toISOString(),
						deliveryWindowEnd:
							timeWindows.deliveryWindowEnd.toISOString(),
						pickupWindowStart:
							timeWindows.pickupWindowStart.toISOString(),
						pickupWindowEnd:
							timeWindows.pickupWindowEnd.toISOString(),
					}),
				}
			)
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to update time windows')
			}
			toast.success('Delivery schedule updated')
			setTimeWindowsOpen(false)
			window.location.reload()
		} catch (error: any) {
			toast.error(error.message)
		}
	}

	const handleConfirmPayment = async () => {
		if (!order) return

		// Validate required fields
		if (
			!paymentDetails.paymentMethod ||
			!paymentDetails.paymentReference ||
			!paymentDetails.paymentDate
		) {
			toast.error('Payment method, reference, and date are required')
			return
		}

		try {
			const response = await fetch(
				`/api/invoices/${order.id}/confirm-payment`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						paymentMethod: paymentDetails.paymentMethod,
						paymentReference: paymentDetails.paymentReference,
						paymentDate: paymentDetails.paymentDate.toISOString(),
						notes: paymentDetails.notes || undefined,
					}),
				}
			)

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to confirm payment')
			}

			toast.success('Payment confirmed successfully')
			setPaymentDialogOpen(false)
			setPaymentDetails({
				paymentMethod: '',
				paymentReference: '',
				paymentDate: new Date(),
				notes: '',
			})
			window.location.reload()
		} catch (error: any) {
			toast.error(error.message)
		}
	}

	if (isLoading) {
		return (
			<div className='p-8'>
				<Skeleton className='h-96 w-full' />
			</div>
		)
	}

	if (!order) {
		return (
			<div className='p-8 text-center'>
				<Package className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
				<p className='font-mono text-sm'>Order not found</p>
				<Link href='/admin/orders'>
					<Button variant='outline' className='mt-4'>
						Back
					</Button>
				</Link>
			</div>
		)
	}

	const currentStatusConfig =
		STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT
	const allowedNextStates = currentStatusConfig.nextStates || []

	return (
		<div className='min-h-screen bg-background'>
			{/* Sticky Header */}
			<div className='border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10'>
				<div className='container mx-auto px-6 py-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<Link href='/admin/orders'>
								<Button
									variant='ghost'
									size='sm'
									className='gap-2 font-mono'
								>
									<ArrowLeft className='h-4 w-4' />
									ORDERS
								</Button>
							</Link>
							<Separator orientation='vertical' className='h-6' />
							<div>
								<h1 className='text-lg font-bold font-mono'>
									{order.orderId}
								</h1>
								<p className='text-xs text-muted-foreground font-mono'>
									{order.company.name}
								</p>
							</div>
						</div>

						<div className='flex items-center gap-3'>
							<Badge
								className={`${currentStatusConfig.color} border font-mono text-xs px-3 py-1`}
							>
								{currentStatusConfig.label}
							</Badge>

							{allowedNextStates.length > 0 && (
								<Dialog
									open={statusDialogOpen}
									onOpenChange={setStatusDialogOpen}
								>
									<DialogTrigger asChild>
										<Button
											size='sm'
											className='gap-2 font-mono text-xs'
										>
											<PlayCircle className='h-3.5 w-3.5' />
											PROGRESS
										</Button>
									</DialogTrigger>
									<DialogContent className='sm:max-w-md'>
										<DialogHeader>
											<DialogTitle className='font-mono'>
												PROGRESS ORDER STATUS
											</DialogTitle>
											<DialogDescription className='font-mono text-xs'>
												Current:{' '}
												{currentStatusConfig.label} →
												Select next status
											</DialogDescription>
										</DialogHeader>

										<div className='space-y-4 py-4'>
											<div className='space-y-2'>
												<Label className='font-mono text-xs'>
													NEXT STATUS
												</Label>
												<select
													className='w-full border rounded px-3 py-2 bg-background font-mono text-sm'
													value={selectedNextStatus}
													onChange={e =>
														setSelectedNextStatus(
															e.target.value
														)
													}
												>
													<option value=''>
														Select...
													</option>
													{allowedNextStates.map(
														status => (
															<option
																key={status}
																value={status}
															>
																{STATUS_CONFIG[
																	status
																]?.label ||
																	status}
															</option>
														)
													)}
												</select>
											</div>

											<div className='space-y-2'>
												<Label className='font-mono text-xs'>
													NOTES (Optional)
												</Label>
												<Textarea
													placeholder='Transition notes...'
													value={statusNotes}
													onChange={e =>
														setStatusNotes(
															e.target.value
														)
													}
													className='font-mono text-sm'
													rows={3}
												/>
											</div>
										</div>

										<DialogFooter>
											<Button
												variant='outline'
												onClick={() =>
													setStatusDialogOpen(false)
												}
												className='font-mono text-xs'
											>
												CANCEL
											</Button>
											<Button
												onClick={
													handleStatusProgression
												}
												disabled={!selectedNextStatus}
												className='font-mono text-xs'
											>
												UPDATE STATUS
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className='container mx-auto px-6 py-8'>
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
					{/* Main Content */}
					<div className='lg:col-span-2 space-y-6'>
						{/* Feedback #3: Refurb Items Banner - Show for PRICING_REVIEW and PENDING_APPROVAL */}
						{(order.status === 'PRICING_REVIEW' ||
							order.status === 'PENDING_APPROVAL') &&
							(() => {
								const refurbItems = order.items?.filter(
									(item: any) =>
										item.assetDetails?.refurbDaysEstimate &&
										item.assetDetails.refurbDaysEstimate > 0
								)
								if (refurbItems && refurbItems.length > 0) {
									return (
										<Card className='p-4 bg-orange-500/5 border-orange-500/30'>
											<div className='flex items-start gap-3'>
												<AlertCircle className='h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5' />
												<div className='flex-1'>
													<p className='font-mono text-sm font-bold text-orange-700'>
														Items Requiring
														Refurbishment
													</p>
													<p className='font-mono text-xs text-muted-foreground mt-1 mb-3'>
														This order contains
														items that need
														refurbishment. Consider
														additional prep time in
														pricing.
													</p>
													<ul className='space-y-2'>
														{refurbItems.map(
															(item: any) => (
																<li
																	key={
																		item.id
																	}
																	className='font-mono text-xs p-2 bg-background/50 rounded border border-orange-500/20'
																>
																	<span className='font-medium'>
																		{
																			item.assetName
																		}
																	</span>
																	<span className='text-muted-foreground'>
																		{' '}
																		—{' '}
																		{
																			item
																				.assetDetails
																				.refurbDaysEstimate
																		}{' '}
																		days
																		refurb
																		needed
																	</span>
																</li>
															)
														)}
													</ul>
												</div>
											</div>
										</Card>
									)
								}
								return null
							})()}

						{/* State-Specific Alerts */}
						{order.status === 'QUOTED' && order.quoteSentAt && (
							<Card className='p-4 bg-amber-500/5 border-amber-500/30'>
								<div className='flex items-start gap-3'>
									<AlertCircle className='h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5' />
									<div>
										<p className='font-mono text-sm font-bold text-amber-700'>
											Awaiting Client Response
										</p>
										<p className='font-mono text-xs text-muted-foreground mt-1'>
											Quote sent{' '}
											{Math.floor(
												(Date.now() -
													new Date(
														order.quoteSentAt
													).getTime()) /
													(1000 * 60 * 60 * 24)
											)}{' '}
											days ago
											{Math.floor(
												(Date.now() -
													new Date(
														order.quoteSentAt
													).getTime()) /
													(1000 * 60 * 60 * 24)
											) >= 2 &&
												' - Consider following up with client'}
										</p>
									</div>
								</div>
							</Card>
						)}

						{order.status === 'CONFIRMED' &&
							!order.deliveryWindowStart && (
								<Card className='p-4 bg-orange-500/5 border-orange-500/30'>
									<div className='flex items-start gap-3'>
										<AlertCircle className='h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5' />
										<div>
											<p className='font-mono text-sm font-bold text-orange-700'>
												Action Required
											</p>
											<p className='font-mono text-xs text-muted-foreground mt-1'>
												Set delivery schedule before
												starting preparation
											</p>
										</div>
									</div>
								</Card>
							)}

						{order.status === 'AWAITING_RETURN' &&
							order.pickupWindowStart &&
							(() => {
								const hoursUntilPickup =
									(new Date(
										order.pickupWindowStart
									).getTime() -
										Date.now()) /
									(1000 * 60 * 60)
								if (
									hoursUntilPickup <= 48 &&
									hoursUntilPickup > 0
								) {
									return (
										<Card className='p-4 bg-rose-500/5 border-rose-500/30'>
											<div className='flex items-start gap-3'>
												<Clock className='h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5' />
												<div>
													<p className='font-mono text-sm font-bold text-rose-700'>
														Pickup Reminder Sent
													</p>
													<p className='font-mono text-xs text-muted-foreground mt-1'>
														Pickup scheduled in{' '}
														{Math.floor(
															hoursUntilPickup
														)}{' '}
														hours - All parties
														notified
													</p>
												</div>
											</div>
										</Card>
									)
								}
								return null
							})()}

						{/* Job Number Card */}
						{order.jobNumber !== undefined && (
							<Card className='border-2 border-primary/20 bg-primary/5'>
								<CardContent className='pt-6'>
									<div className='flex items-center justify-between'>
										<div className='flex-1'>
											<Label className='font-mono text-xs text-muted-foreground'>
												PMG JOB NUMBER
											</Label>
											{isEditingJobNumber ? (
												<Input
													value={jobNumber}
													onChange={e =>
														setJobNumber(
															e.target.value
														)
													}
													placeholder='JOB-XXXX'
													className='mt-2 font-mono'
												/>
											) : (
												<p className='mt-2 font-mono text-lg font-bold'>
													{jobNumber || '—'}
												</p>
											)}
										</div>
										<div className='flex items-center justify-center gap-2'>
											{isEditingJobNumber ? (
												<>
													<Button
														size='icon'
														variant='ghost'
														onClick={() =>
															setIsEditingJobNumber(
																false
															)
														}
													>
														<X className='h-4 w-4' />
													</Button>
													<Button
														size='icon'
														onClick={
															handleJobNumberSave
														}
													>
														<Save className='h-4 w-4' />
													</Button>
												</>
											) : (
												<Button
													size='icon'
													variant='ghost'
													onClick={() =>
														setIsEditingJobNumber(
															true
														)
													}
												>
													<Edit className='h-4 w-4' />
												</Button>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						)}
						{/* Payment Status Card - PMG Admin Only (Feedback #1: Financial status separate) */}
						{canConfirmPayment &&
							(order.invoiceNumber ||
								[
									'CONFIRMED',
									'IN_PREPARATION',
									'READY_FOR_DELIVERY',
									'IN_TRANSIT',
									'DELIVERED',
									'IN_USE',
									'AWAITING_RETURN',
									'CLOSED',
								].includes(order.status)) && (
								<Card className='border-2 border-indigo-500/20 bg-indigo-500/5'>
									<CardHeader>
										<CardTitle className='font-mono text-sm flex items-center gap-2'>
											<FileText className='h-4 w-4 text-indigo-600' />
											INVOICE & PAYMENT
										</CardTitle>
									</CardHeader>
									<CardContent className='space-y-3'>
										<div className='flex justify-between items-center'>
											<Label className='font-mono text-xs text-muted-foreground'>
												INVOICE NUMBER
											</Label>
											<p className='font-mono text-sm font-bold'>
												{order.invoiceNumber || (
													<span className='text-muted-foreground'>
														Pending...
													</span>
												)}
											</p>
										</div>
										{/* Amount with Breakdown - PMG Admin sees breakdown */}
										{canSeePMGMargin &&
										(order.a2BasePrice ||
											order.a2AdjustedPrice) &&
										order.finalTotalPrice ? (
											<div className='space-y-2'>
												<Label className='font-mono text-xs text-muted-foreground'>
													AMOUNT BREAKDOWN
												</Label>
												<div className='p-3 bg-muted/20 rounded border space-y-2 text-sm font-mono'>
													<div className='flex justify-between'>
														<span className='text-muted-foreground'>
															A2 Base
														</span>
														<span>
															{parseFloat(
																order.a2AdjustedPrice ||
																	order.a2BasePrice
															).toFixed(2)}{' '}
															AED
														</span>
													</div>
													{order.pmgMarginPercent && (
														<div className='flex justify-between text-muted-foreground'>
															<span>
																PMG Margin (
																{parseFloat(
																	order.pmgMarginPercent
																).toFixed(0)}
																%)
															</span>
															<span>
																+
																{order.pmgMarginAmount
																	? parseFloat(
																			order.pmgMarginAmount
																		).toFixed(
																			2
																		)
																	: '0.00'}{' '}
																AED
															</span>
														</div>
													)}
													<Separator />
													<div className='flex justify-between font-bold text-base'>
														<span>Total</span>
														<span className='text-primary'>
															{parseFloat(
																order.finalTotalPrice
															).toFixed(2)}{' '}
															AED
														</span>
													</div>
												</div>
												{order.a2AdjustedPrice &&
													order.a2AdjustmentReason && (
														<p className='text-xs text-muted-foreground font-mono italic'>
															A2 Adjustment:{' '}
															{
																order.a2AdjustmentReason
															}
														</p>
													)}
											</div>
										) : (
											<div className='flex justify-between items-center'>
												<Label className='font-mono text-xs text-muted-foreground'>
													AMOUNT
												</Label>
												<p className='font-mono text-lg font-bold text-primary'>
													{order.finalTotalPrice ? (
														`${parseFloat(order.finalTotalPrice).toFixed(2)} AED`
													) : (
														<span className='text-sm text-muted-foreground'>
															Pending Invoice
														</span>
													)}
												</p>
											</div>
										)}
										<Separator />
										<div className='flex justify-between items-center'>
											<Label className='font-mono text-xs text-muted-foreground'>
												PAYMENT STATUS
											</Label>
											<Badge
												className={`font-mono text-xs ${
													order.financialStatus ===
													'PAID'
														? 'bg-green-500/10 text-green-700 border-green-500/30'
														: order.financialStatus ===
															  'INVOICED'
															? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
															: 'bg-slate-500/10 text-slate-600 border-slate-500/20'
												}`}
											>
												{order.financialStatus ===
												'PAID'
													? 'PAID'
													: order.financialStatus ===
														  'INVOICED'
														? 'PENDING'
														: order.financialStatus ||
															'N/A'}
											</Badge>
										</div>
										{order.invoicePaidAt && (
											<>
												<div className='flex justify-between items-center'>
													<Label className='font-mono text-xs text-muted-foreground'>
														PAID ON
													</Label>
													<p className='font-mono text-xs'>
														{new Date(
															order.invoicePaidAt
														).toLocaleDateString()}
													</p>
												</div>
												{order.paymentMethod && (
													<div className='flex justify-between items-center'>
														<Label className='font-mono text-xs text-muted-foreground'>
															METHOD
														</Label>
														<p className='font-mono text-xs'>
															{
																order.paymentMethod
															}
														</p>
													</div>
												)}
												{order.paymentReference && (
													<div className='flex justify-between items-center'>
														<Label className='font-mono text-xs text-muted-foreground'>
															REFERENCE
														</Label>
														<p className='font-mono text-xs'>
															{
																order.paymentReference
															}
														</p>
													</div>
												)}
											</>
										)}
										{/* Payment Confirmation Section - PMG Admin Only */}
										{order.financialStatus === 'INVOICED' &&
											!order.invoicePaidAt &&
											canConfirmPayment && (
												<>
													<Separator />
													<div className='p-4 bg-amber-500/10 border border-amber-500/20 rounded-md space-y-3'>
														<div className='flex items-start gap-2'>
															<AlertCircle className='h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5' />
															<div className='flex-1'>
																<p className='text-xs font-mono font-bold text-amber-700'>
																	AWAITING
																	PAYMENT
																	CONFIRMATION
																</p>
																<p className='text-xs font-mono text-muted-foreground mt-1'>
																	Invoice sent
																	to client.
																	Confirm
																	payment when
																	received.
																</p>
															</div>
														</div>
														<Dialog
															open={
																paymentDialogOpen
															}
															onOpenChange={
																setPaymentDialogOpen
															}
														>
															<DialogTrigger
																asChild
															>
																<Button
																	size='sm'
																	className='w-full gap-2 font-mono text-xs bg-green-600 hover:bg-green-700'
																>
																	<CheckCircle className='h-3.5 w-3.5' />
																	CONFIRM
																	PAYMENT
																	RECEIVED
																</Button>
															</DialogTrigger>
															<DialogContent className='sm:max-w-md'>
																<DialogHeader>
																	<DialogTitle className='font-mono'>
																		CONFIRM
																		PAYMENT
																	</DialogTitle>
																	<DialogDescription className='font-mono text-xs'>
																		Record
																		external
																		payment
																		details
																		for
																		invoice{' '}
																		{
																			order.invoiceNumber
																		}
																	</DialogDescription>
																</DialogHeader>

																<div className='space-y-4 py-4'>
																	<div className='space-y-2'>
																		<Label className='font-mono text-xs'>
																			PAYMENT
																			METHOD
																			*
																		</Label>
																		<select
																			className='w-full border rounded px-3 py-2 bg-background font-mono text-sm'
																			value={
																				paymentDetails.paymentMethod
																			}
																			onChange={e =>
																				setPaymentDetails(
																					prev => ({
																						...prev,
																						paymentMethod:
																							e
																								.target
																								.value,
																					})
																				)
																			}
																		>
																			<option value=''>
																				Select
																				method...
																			</option>
																			<option value='Bank Transfer'>
																				Bank
																				Transfer
																			</option>
																			<option value='Wire Transfer'>
																				Wire
																				Transfer
																			</option>
																			<option value='Check'>
																				Check
																			</option>
																			<option value='Cash'>
																				Cash
																			</option>
																			<option value='Other'>
																				Other
																			</option>
																		</select>
																	</div>

																	<div className='space-y-2'>
																		<Label className='font-mono text-xs'>
																			PAYMENT
																			REFERENCE
																			*
																		</Label>
																		<Input
																			placeholder='Transaction ID, Check #, etc.'
																			value={
																				paymentDetails.paymentReference
																			}
																			onChange={e =>
																				setPaymentDetails(
																					prev => ({
																						...prev,
																						paymentReference:
																							e
																								.target
																								.value,
																					})
																				)
																			}
																			className='font-mono text-sm'
																		/>
																	</div>

																	<div className='space-y-2'>
																		<Label className='font-mono text-xs'>
																			PAYMENT
																			DATE
																			*
																		</Label>
																		<DateTimePicker
																			value={
																				paymentDetails.paymentDate
																			}
																			onChange={date =>
																				setPaymentDetails(
																					prev => ({
																						...prev,
																						paymentDate:
																							date ||
																							new Date(),
																					})
																				)
																			}
																			placeholder='Select payment date'
																		/>
																	</div>

																	<div className='space-y-2'>
																		<Label className='font-mono text-xs'>
																			NOTES
																			(Optional)
																		</Label>
																		<Textarea
																			placeholder='Additional payment notes...'
																			value={
																				paymentDetails.notes
																			}
																			onChange={e =>
																				setPaymentDetails(
																					prev => ({
																						...prev,
																						notes: e
																							.target
																							.value,
																					})
																				)
																			}
																			className='font-mono text-sm'
																			rows={
																				3
																			}
																		/>
																	</div>
																</div>

																<DialogFooter>
																	<Button
																		variant='outline'
																		onClick={() =>
																			setPaymentDialogOpen(
																				false
																			)
																		}
																		className='font-mono text-xs'
																	>
																		CANCEL
																	</Button>
																	<Button
																		onClick={
																			handleConfirmPayment
																		}
																		disabled={
																			!paymentDetails.paymentMethod ||
																			!paymentDetails.paymentReference
																		}
																		className='font-mono text-xs bg-green-600 hover:bg-green-700'
																	>
																		CONFIRM
																		PAYMENT
																	</Button>
																</DialogFooter>
															</DialogContent>
														</Dialog>
													</div>
												</>
											)}
									</CardContent>
								</Card>
							)}

						{/* Delivery Schedule Card - Show for CONFIRMED+ states (Feedback #1: Independent from payment) */}
						{[
							'CONFIRMED',
							'IN_PREPARATION',
							'READY_FOR_DELIVERY',
							'IN_TRANSIT',
							'DELIVERED',
							'IN_USE',
							'AWAITING_RETURN',
							'CLOSED',
						].includes(order.status) && (
							<Card className='border-2'>
								<CardHeader>
									<div className='flex items-center justify-between'>
										<CardTitle className='font-mono text-sm flex items-center gap-2'>
											<Truck className='h-4 w-4 text-secondary' />
											DELIVERY SCHEDULE
										</CardTitle>
										<Dialog
											open={timeWindowsOpen}
											onOpenChange={setTimeWindowsOpen}
										>
											<DialogTrigger asChild>
												<Button
													size='sm'
													variant='outline'
													className='font-mono text-xs'
												>
													<Edit className='h-3 w-3 mr-2' />
													EDIT
												</Button>
											</DialogTrigger>
											<DialogContent className='sm:max-w-lg'>
												<DialogHeader>
													<DialogTitle className='font-mono'>
														UPDATE DELIVERY SCHEDULE
													</DialogTitle>
													<DialogDescription className='font-mono text-xs'>
														Set time windows for
														delivery and pickup
														coordination
													</DialogDescription>
												</DialogHeader>

												<div className='space-y-6 py-4'>
													<div className='space-y-3'>
														<Label className='font-mono text-sm font-bold'>
															DELIVERY WINDOW
														</Label>
														<div className='grid grid-cols-2 gap-4'>
															<div className='space-y-2'>
																<Label className='font-mono text-xs text-muted-foreground'>
																	START
																</Label>
																<DateTimePicker
																	value={
																		timeWindows.deliveryWindowStart
																	}
																	onChange={date =>
																		setTimeWindows(
																			prev => ({
																				...prev,
																				deliveryWindowStart:
																					date,
																			})
																		)
																	}
																	placeholder='Select delivery start'
																/>
															</div>
															<div className='space-y-2'>
																<Label className='font-mono text-xs text-muted-foreground'>
																	END
																</Label>
																<DateTimePicker
																	value={
																		timeWindows.deliveryWindowEnd
																	}
																	onChange={date =>
																		setTimeWindows(
																			prev => ({
																				...prev,
																				deliveryWindowEnd:
																					date,
																			})
																		)
																	}
																	placeholder='Select delivery end'
																/>
															</div>
														</div>
													</div>

													<Separator />

													<div className='space-y-3'>
														<Label className='font-mono text-sm font-bold'>
															PICKUP WINDOW
														</Label>
														<div className='grid grid-cols-2 gap-4'>
															<div className='space-y-2'>
																<Label className='font-mono text-xs text-muted-foreground'>
																	START
																</Label>
																<DateTimePicker
																	value={
																		timeWindows.pickupWindowStart
																	}
																	onChange={date =>
																		setTimeWindows(
																			prev => ({
																				...prev,
																				pickupWindowStart:
																					date,
																			})
																		)
																	}
																	placeholder='Select pickup start'
																/>
															</div>
															<div className='space-y-2'>
																<Label className='font-mono text-xs text-muted-foreground'>
																	END
																</Label>
																<DateTimePicker
																	value={
																		timeWindows.pickupWindowEnd
																	}
																	onChange={date =>
																		setTimeWindows(
																			prev => ({
																				...prev,
																				pickupWindowEnd:
																					date,
																			})
																		)
																	}
																	placeholder='Select pickup end'
																/>
															</div>
														</div>
													</div>
												</div>

												<DialogFooter>
													<Button
														variant='outline'
														onClick={() =>
															setTimeWindowsOpen(
																false
															)
														}
														className='font-mono text-xs'
													>
														CANCEL
													</Button>
													<Button
														onClick={
															handleTimeWindowsSave
														}
														className='font-mono text-xs'
													>
														SAVE SCHEDULE
													</Button>
												</DialogFooter>
											</DialogContent>
										</Dialog>
									</div>
								</CardHeader>
								<CardContent className='space-y-3'>
									{order.deliveryWindowStart ? (
										<>
											<div className='p-3 bg-green-500/5 border border-green-500/20 rounded'>
												<Label className='font-mono text-[10px] text-muted-foreground'>
													DELIVERY
												</Label>
												<p className='font-mono text-xs mt-1'>
													{new Date(
														order.deliveryWindowStart
													).toLocaleString('en-US', {
														month: 'short',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
													})}
													{' → '}
													{new Date(
														order.deliveryWindowEnd
													).toLocaleTimeString(
														'en-US',
														{
															hour: '2-digit',
															minute: '2-digit',
														}
													)}
												</p>
											</div>
											<div className='p-3 bg-orange-500/5 border border-orange-500/20 rounded'>
												<Label className='font-mono text-[10px] text-muted-foreground'>
													PICKUP
												</Label>
												<p className='font-mono text-xs mt-1'>
													{new Date(
														order.pickupWindowStart
													).toLocaleString('en-US', {
														month: 'short',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
													})}
													{' → '}
													{new Date(
														order.pickupWindowEnd
													).toLocaleTimeString(
														'en-US',
														{
															hour: '2-digit',
															minute: '2-digit',
														}
													)}
												</p>
											</div>
										</>
									) : (
										<div className='p-8 text-center bg-muted/20 rounded border-2 border-dashed'>
											<Clock className='h-8 w-8 mx-auto mb-2 text-muted-foreground/50' />
											<p className='font-mono text-xs text-muted-foreground'>
												NO SCHEDULE SET
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						)}

						{/* Event & Venue */}
						<Card className='border-2'>
							<CardHeader>
								<CardTitle className='font-mono text-sm flex items-center gap-2'>
									<Calendar className='h-4 w-4 text-primary' />
									EVENT & VENUE
								</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='grid grid-cols-2 gap-4'>
									<div>
										<Label className='font-mono text-xs text-muted-foreground'>
											START
										</Label>
										<p className='font-mono text-sm mt-1'>
											{new Date(
												order.eventStartDate
											).toLocaleDateString()}
										</p>
									</div>
									<div>
										<Label className='font-mono text-xs text-muted-foreground'>
											END
										</Label>
										<p className='font-mono text-sm mt-1'>
											{new Date(
												order.eventEndDate
											).toLocaleDateString()}
										</p>
									</div>
								</div>
								<Separator />
								<div>
									<Label className='font-mono text-xs text-muted-foreground flex items-center gap-2'>
										<MapPin className='h-3 w-3' /> VENUE
									</Label>
									<p className='font-mono text-sm font-bold mt-1'>
										{order.venueName}
									</p>
									<p className='font-mono text-xs text-muted-foreground mt-0.5'>
										{order.venueCity}, {order.venueCountry}
									</p>
								</div>
								{order.specialInstructions && (
									<>
										<Separator />
										<div>
											<Label className='font-mono text-xs text-muted-foreground'>
												SPECIAL INSTRUCTIONS
											</Label>
											<p className='font-mono text-sm mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded'>
												{order.specialInstructions}
											</p>
										</div>
									</>
								)}
							</CardContent>
						</Card>

						{/* Contact */}
						<Card className='border-2'>
							<CardHeader>
								<CardTitle className='font-mono text-sm flex items-center gap-2'>
									<User className='h-4 w-4 text-primary' />
									CONTACT
								</CardTitle>
							</CardHeader>
							<CardContent className='space-y-2'>
								<p className='font-mono text-sm font-bold'>
									{order.contactName}
								</p>
								<p className='font-mono text-xs text-muted-foreground flex items-center gap-2'>
									<Mail className='h-3 w-3' />{' '}
									{order.contactEmail}
								</p>
								<p className='font-mono text-xs text-muted-foreground flex items-center gap-2'>
									<Phone className='h-3 w-3' />{' '}
									{order.contactPhone}
								</p>
							</CardContent>
						</Card>

						{/* Order Items */}
						<Card className='border-2'>
							<CardHeader>
								<CardTitle className='font-mono text-sm flex items-center gap-2'>
									<Boxes className='h-4 w-4 text-primary' />
									ITEMS ({order.items?.length || 0})
								</CardTitle>
							</CardHeader>
							<CardContent className='space-y-2'>
								{order.items?.map((item: any) => (
									<div
										key={item.id}
										className='p-3 bg-muted/30 rounded border'
									>
										<p className='font-mono text-sm font-medium'>
											{item.assetName}
										</p>
										<p className='font-mono text-xs text-muted-foreground mt-1'>
											QTY: {item.quantity} | VOL:{' '}
											{item.totalVolume}m³ | WT:{' '}
											{item.totalWeight}kg
										</p>
										{item.handlingTags?.length > 0 && (
											<div className='flex gap-1 mt-2'>
												{item.handlingTags.map(
													(tag: string) => (
														<Badge
															key={tag}
															variant='outline'
															className='text-[10px] font-mono bg-amber-500/10 border-amber-500/20'
														>
															{tag}
														</Badge>
													)
												)}
											</div>
										)}
									</div>
								))}
							</CardContent>
						</Card>

						{/* Scanning Activity - Show for IN_PREPARATION+ states */}
						{[
							'IN_PREPARATION',
							'READY_FOR_DELIVERY',
							'IN_TRANSIT',
							'DELIVERED',
							'IN_USE',
							'AWAITING_RETURN',
							'CLOSED',
						].includes(order.status) && (
							<Card className='border-2'>
								<CardHeader>
									<CardTitle className='font-mono text-sm flex items-center gap-2'>
										<ScanLine className='h-4 w-4 text-primary' />
										SCANNING ACTIVITY
									</CardTitle>
								</CardHeader>
								<CardContent>
									<ScanActivityTimeline orderId={order.id} />
								</CardContent>
							</Card>
						)}
					</div>

					{/* Status History Timeline */}
					<div className='lg:col-span-1'>
						<Card className='border-2 sticky top-24'>
							<CardHeader>
								<CardTitle className='font-mono text-sm flex items-center gap-2'>
									<Clock className='h-4 w-4 text-primary' />
									HISTORY
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='space-y-1 relative'>
									{order.statusHistory?.map(
										(entry: any, index: number) => {
											const statusConfig = STATUS_CONFIG[
												entry.status as keyof typeof STATUS_CONFIG
											] || {
												label: entry.status,
												color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
												nextStates: [],
											}
											const isLatest = index === 0

											return (
												<div
													key={entry.id}
													className='relative pl-6 pb-4 last:pb-0'
												>
													{index <
														order.statusHistory
															?.length -
															1 && (
														<div className='absolute left-[7px] top-5 bottom-0 w-px bg-border' />
													)}
													<div
														className={`absolute left-0 top-0.5 h-4 w-4 rounded-full border-2 ${
															isLatest
																? 'bg-primary border-primary'
																: 'bg-muted border-border'
														}`}
													/>
													<div>
														<Badge
															className={`${statusConfig.color} border font-mono text-[10px] px-2 py-0.5`}
														>
															{statusConfig.label}
														</Badge>
														<p className='font-mono text-[10px] text-muted-foreground mt-1'>
															{new Date(
																entry.timestamp
															).toLocaleString(
																'en-US',
																{
																	month: 'short',
																	day: 'numeric',
																	hour: '2-digit',
																	minute: '2-digit',
																}
															)}
														</p>
														<p className='font-mono text-[10px] mt-0.5'>
															{entry.updatedByUser
																?.name ||
																'System'}
														</p>
														{entry.notes && (
															<p className='font-mono text-[10px] text-muted-foreground italic mt-2 p-2 bg-muted/20 rounded border'>
																{entry.notes}
															</p>
														)}
													</div>
												</div>
											)
										}
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
