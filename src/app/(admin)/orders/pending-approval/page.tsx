'use client'

/**
 * Phase 8: PMG Pricing Approval Interface
 * PMG Admin reviews A2 adjusted pricing and approves final pricing
 */

import { useState } from 'react'
import Link from 'next/link'
import {
	ChevronLeft,
	Calendar,
	MapPin,
	Package,
	DollarSign,
	AlertCircle,
	User,
} from 'lucide-react'
import {
	useAdminOrders,
	usePendingApprovalOrders,
	usePMGApprovePricing,
} from '@/hooks/use-orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin-header'

export default function PendingApprovalPage() {
	const { data, isLoading, error } = useAdminOrders({ order_status: 'PENDING_APPROVAL' });
	const approvePricing = usePMGApprovePricing()
	const [selectedOrder, setSelectedOrder] = useState<any>(null)
	const [basePrice, setBasePrice] = useState<string>('')
	const [pmgMarginPercent, setPmgMarginPercent] = useState<string>('')
	const [pmgReviewNotes, setPmgReviewNotes] = useState<string>('')

	const handleOpenApprove = (order: any) => {
		setSelectedOrder(order)
		setBasePrice(order.logistics_pricing?.adjusted_price || order.logistics_pricing?.base_price || '')
		// Default PMG margin from company settings or 20%
		setPmgMarginPercent(order.platform_pricing?.margin_percent || '20')
		setPmgReviewNotes('')
	}
	const handleApprove = async () => {
		if (!selectedOrder) return

		const basePriceNum = parseFloat(basePrice)
		const marginNum = parseFloat(pmgMarginPercent)

		if (isNaN(basePriceNum) || basePriceNum <= 0) {
			toast.error('Please enter a valid base price')
			return
		}

		if (isNaN(marginNum) || marginNum < 0 || marginNum > 100) {
			toast.error('Platform margin must be between 0 and 100%')
			return
		}

		try {
			await approvePricing.mutateAsync({
				orderId: selectedOrder.id,
				a2BasePrice: basePriceNum,
				pmgMarginPercent: marginNum,
				pmgReviewNotes: pmgReviewNotes.trim() || undefined,
			})
			toast.success('Pricing approved. Quote sent to client.')
			setSelectedOrder(null)
			setBasePrice('')
			setPmgMarginPercent('')
			setPmgReviewNotes('')
		} catch (error: any) {
			toast.error(error.message || 'Failed to approve pricing')
		}
	}

	const calculateFinalPrice = () => {
		const base = parseFloat(basePrice)
		const margin = parseFloat(pmgMarginPercent)
		if (isNaN(base) || isNaN(margin)) return 0
		return base * (1 + margin / 100)
	}

	const calculateMarginAmount = () => {
		const base = parseFloat(basePrice)
		const margin = parseFloat(pmgMarginPercent)
		if (isNaN(base) || isNaN(margin)) return 0
		return base * (margin / 100)
	}

	if (error) {
		return (
			<div className='min-h-screen bg-background'>
				<div className='border-b border-border bg-card'>
					<div className='container mx-auto px-4 py-4'>
						<Link
							href='/admin/orders'
							className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4'
						>
							<ChevronLeft className='h-4 w-4' />
							Back to Orders
						</Link>
						<h1 className='text-2xl font-bold'>Pending Approval</h1>
					</div>
				</div>
				<div className='container mx-auto px-4 py-8'>
					<Card>
						<CardContent className='p-6'>
							<p className='text-destructive'>
								Error loading orders: {(error as Error).message}
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background'>
			<AdminHeader
				icon={AlertCircle}
				title='PENDING APPROVAL QUEUE'
				description='Platform Review · Margin Control · Final Approval'
				stats={
					data
						? {
							label: 'AWAITING APPROVAL',
							value: data?.data?.length,
						}
						: undefined
				}
				actions={
					<Link href='/admin/orders'>
						<Button variant='outline' className='gap-2 font-mono'>
							<ChevronLeft className='h-4 w-4' />
							BACK TO ORDERS
						</Button>
					</Link>
				}
			/>

			{/* Content */}
			<div className='container mx-auto px-4 py-8'>
				{isLoading ? (
					<div className='space-y-4'>
						{[1, 2, 3].map(i => (
							<Card key={i}>
								<CardContent className='p-6'>
									<Skeleton className='h-6 w-1/3 mb-2' />
									<Skeleton className='h-4 w-2/3' />
								</CardContent>
							</Card>
						))}
					</div>
				) : !data || data?.data.length === 0 ? (
					<Card>
						<CardContent className='p-12 text-center'>
							<Package className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
							<h3 className='text-lg font-semibold mb-2'>
								No Orders Pending Approval
							</h3>
							<p className='text-sm text-muted-foreground'>
								There are currently no orders waiting for Platform
								pricing approval.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className='space-y-4'>
						{data?.data?.map((order: any) => (
							<Card
								key={order.id}
								className='hover:border-primary/50 transition-colors'
							>
								<CardHeader className='pb-3'>
									<div className='flex items-center justify-between'>
										<div>
											<CardTitle className='text-lg font-mono'>
												{order.order_id}
											</CardTitle>
											<p className='text-sm text-muted-foreground mt-1'>
												{order?.company?.name}
											</p>
										</div>
										<Badge variant='destructive'>
											{order.order_status}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className='space-y-4'>
									{/* Order Details */}
									<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
										<div>
											<div className='flex items-center gap-2 text-muted-foreground mb-1'>
												<Calendar className='h-4 w-4' />
												<span>Event Date</span>
											</div>
											<p className='font-medium'>
												{new Date(order?.event_start_date).toLocaleDateString()}
											</p>
										</div>
										<div>
											<div className='flex items-center gap-2 text-muted-foreground mb-1'>
												<MapPin className='h-4 w-4' />
												<span>Venue</span>
											</div>
											<p className='font-medium'>
												{order?.venue_location?.country},
												{order?.venue_location?.city},
												{order?.venue_location?.state}
											</p>
										</div>
										<div>
											<div className='flex items-center gap-2 text-muted-foreground mb-1'>
												<Package className='h-4 w-4' />
												<span>Volume</span>
											</div>
											<p className='font-medium'>
												{order?.calculated_totals?.volume} m³
											</p>
										</div>
										<div>
											<div className='flex items-center gap-2 text-muted-foreground mb-1'>
												<User className='h-4 w-4' />
												<span>Adjusted By</span>
											</div>
											<p className='font-medium'>
												{order?.logistics_pricing?.adjusted_by ||
													'Unknown'}
											</p>
										</div>
									</div>

									{/* A2 Adjustment Details */}
									<div className='border border-amber-500/50 rounded-md p-4 bg-amber-500/5'>
										<div className='flex items-start gap-2 mb-3'>
											<AlertCircle className='h-5 w-5 text-amber-500 mt-0.5' />
											<div>
												<h4 className='font-semibold text-sm'>
													Pricing Adjustment
												</h4>
												<p className='text-sm text-muted-foreground mt-1'>
													Adjusted on{' '}
													{new Date(
														order?.logistics_pricing?.adjusted_at
													).toLocaleString()}
												</p>
											</div>
										</div>
										<div className='mb-6'>
											<p className='text-xs text-muted-foreground mb-1'>
												Adjustment Reason:
											</p>
											<p className='text-sm'>
												{order?.logistics_pricing?.adjustment_reason}
											</p>
										</div>
										<div className='space-y-2 text-sm font-mono'>
											{order?.logistics_pricing?.base_price && (
												<div className='flex justify-between'>
													<span>Base Price</span>
													<span className='font-semibold'>
														{Number(order?.logistics_pricing?.base_price).toFixed(2)} AED
													</span>
												</div>
											)}
											<div className='flex justify-between'>
												<span>Adjusted Base Price</span>
												<span className='font-semibold'>
													{Number(order?.logistics_pricing?.adjusted_price).toFixed(2)} AED
												</span>
											</div>
											<div className='flex justify-between'>
												<p>
													<span>Margin Amount</span>
													<span className="text-sm mr-2"> ({order?.platform_pricing?.margin_percent}%)</span>
												</p>
												<span className='font-semibold'>
													{Number(order?.platform_pricing?.margin_amount).toFixed(2)} AED
												</span>
											</div>
										</div>
									</div>

									{/* Actions */}
									<div className='flex gap-3 pt-2'>
										<Button
											onClick={() => handleOpenApprove(order)}
											disabled={approvePricing.isPending}
										>
											Review & Approve Pricing
										</Button>
										<Button variant='ghost' asChild>
											<Link
												href={`/orders/${order.order_id}`}
											>
												View Full Details
											</Link>
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Approve Pricing Dialog */}
			<Dialog
				open={!!selectedOrder}
				onOpenChange={open => !open && setSelectedOrder(null)}
			>
				<DialogContent className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>Approve Final Pricing</DialogTitle>
					</DialogHeader>
					<div className='space-y-4'>
						<p className='text-sm text-muted-foreground'>
							Review and adjust the final pricing for order{' '}
							<span className='font-mono font-semibold'>
								{selectedOrder?.order_id}
							</span>
							. You can modify the A2 base price and Platform margin
							before approving.
						</p>

						{/* A2 Adjustment Context */}
						{selectedOrder?.logistics_pricing?.adjustment_reason && (
							<div className='border border-primary-500/50 rounded-md p-3 bg-primary-500/5'>
								<p className='text-xs text-muted-foreground mb-1'>
									Adjustment Reason:
								</p>
								<p className='text-sm'>
									{selectedOrder.logistics_pricing?.adjustment_reason}
								</p>
							</div>
						)}

						{/* Pricing Form */}
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='basePrice'>
									Base Price{' '}
									<span className='text-destructive'>*</span>
								</Label>
								<Input
									id='basePrice'
									type='number'
									step='0.01'
									min='0'
									value={basePrice}
									onChange={e => setBasePrice(e.target.value)}
									placeholder='Enter base price...'
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Can be modified after offline discussion
									with A2
								</p>
							</div>
							<div>
								<Label htmlFor='pmgMarginPercent'>
									Platform Margin %{' '}
									<span className='text-destructive'>*</span>
								</Label>
								<Input
									id='pmgMarginPercent'
									type='number'
									step='0.01'
									min='0'
									max='100'
									value={pmgMarginPercent}
									onChange={e => setPmgMarginPercent(e.target.value)}
									placeholder='Enter margin %...'
								/>
							</div>
						</div>

						{/* Calculated Pricing */}
						<div className='border border-border rounded-md p-4 bg-muted/50'>
							<h4 className='font-semibold text-sm mb-3'>
								Final Pricing Calculation
							</h4>
							<div className='space-y-2 text-sm font-mono'>
								<div className='flex justify-between'>
									<span>Base Price</span>
									<span>
										{parseFloat(basePrice || '0').toFixed(2)}
									</span>
								</div>
								<div className='flex justify-between text-muted-foreground'>
									<span>
										Platform Margin (
										{parseFloat(
											pmgMarginPercent || '0'
										).toFixed(2)}
										%)
									</span>
									<span>
										+{calculateMarginAmount().toFixed(2)}
									</span>
								</div>
								<div className='flex justify-between border-t border-border pt-2 font-semibold text-base'>
									<span>Total to Client</span>
									<span>
										{calculateFinalPrice().toFixed(2)}
									</span>
								</div>
							</div>
						</div>

						{/* Review Notes */}
						<div>
							<Label htmlFor='pmgReviewNotes'>
								Platform Review Notes (Optional)
							</Label>
							<Textarea
								id='pmgReviewNotes'
								value={pmgReviewNotes}
								onChange={e =>
									setPmgReviewNotes(e.target.value)
								}
								placeholder='Add internal notes about this pricing decision...'
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setSelectedOrder(null)}
							disabled={approvePricing.isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleApprove}
							disabled={approvePricing.isPending}
						>
							{approvePricing.isPending
								? 'Approving...'
								: 'Approve & Send Quote'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
