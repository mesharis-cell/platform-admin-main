'use client';

/**
 * Phase 8: A2 Pricing Review Interface
 * A2 Staff reviews orders in PRICING_REVIEW status and approves standard pricing or adjusts pricing
 */

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Calendar, MapPin, Package, DollarSign } from 'lucide-react';
import { usePricingReviewOrders, useA2ApproveStandard, useAdjustPricing, useAdminOrders } from '@/hooks/use-orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AdminHeader } from '@/components/admin-header';

export default function PricingReviewPage() {
	const { data, isLoading, error } = useAdminOrders({ order_status: 'PRICING_REVIEW' });
	const approveStandard = useA2ApproveStandard();
	const adjustPricing = useAdjustPricing();

	const [selectedOrder, setSelectedOrder] = useState<any>(null);
	const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
	const [adjustedPrice, setAdjustedPrice] = useState<string>('');
	const [adjustmentReason, setAdjustmentReason] = useState<string>('');
	const [notes, setNotes] = useState<string>('');

	const handleApproveStandard = async (order: any) => {
		try {
			await approveStandard.mutateAsync({ orderId: order.id, notes: notes || undefined });
			toast.success('Standard pricing approved. Quote sent to client.');
			setSelectedOrder(null);
			setNotes('');
		} catch (error: any) {
			toast.error(error.message || 'Failed to approve standard pricing');
		}
	};

	const handleOpenAdjust = (order: any) => {
		setSelectedOrder(order);
		setAdjustDialogOpen(true);
		setAdjustedPrice('');
		setAdjustmentReason('');
	};

	const handleAdjust = async () => {
		if (!selectedOrder) return;

		const priceNum = parseFloat(adjustedPrice);
		if (isNaN(priceNum) || priceNum <= 0) {
			toast.error('Please enter a valid adjusted price');
			return;
		}

		if (adjustmentReason.trim().length < 10) {
			toast.error('Adjustment reason must be at least 10 characters');
			return;
		}

		try {
			await adjustPricing.mutateAsync({
				orderId: selectedOrder.id,
				adjustedPrice: priceNum,
				adjustmentReason: adjustmentReason.trim(),
			});
			toast.success('Pricing adjusted. Sent to PMG for approval.');
			setAdjustDialogOpen(false);
			setSelectedOrder(null);
			setAdjustedPrice('');
			setAdjustmentReason('');
		} catch (error: any) {
			toast.error(error.message || 'Failed to adjust pricing');
		}
	};

	if (error) {
		return (
			<div className="min-h-screen bg-background">
				<div className="border-b border-border bg-card">
					<div className="container mx-auto px-4 py-4">
						<Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
							<ChevronLeft className="h-4 w-4" />
							Back to Orders
						</Link>
						<h1 className="text-2xl font-bold">Pricing Review</h1>
					</div>
				</div>
				<div className="container mx-auto px-4 py-8">
					<Card>
						<CardContent className="p-6">
							<p className="text-destructive">Error loading orders: {(error as Error).message}</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={DollarSign}
				title="PRICING REVIEW QUEUE"
				description="A2 Review · Standard Pricing · Adjustments"
				stats={data ? { label: 'PENDING REVIEW', value: data?.data?.length } : undefined}
				actions={
					<Link href="/orders">
						<Button variant="outline" className="gap-2 font-mono">
							<ChevronLeft className="h-4 w-4" />
							BACK TO ORDERS
						</Button>
					</Link>
				}
			/>

			{/* Content */}
			<div className="container mx-auto px-4 py-8">
				{isLoading ? (
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<Card key={i}>
								<CardContent className="p-6">
									<Skeleton className="h-6 w-1/3 mb-2" />
									<Skeleton className="h-4 w-2/3" />
								</CardContent>
							</Card>
						))}
					</div>
				) : !data || data?.data?.length === 0 ? (
					<Card>
						<CardContent className="p-12 text-center">
							<Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<h3 className="text-lg font-semibold mb-2">No Orders for Review</h3>
							<p className="text-sm text-muted-foreground">
								There are currently no orders waiting for pricing review.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-4">
						{data?.data?.map((order: any) => (
							<Card key={order.id} className="hover:border-primary/50 transition-colors">
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="text-lg font-mono">{order?.order_id}</CardTitle>
											<p className="text-sm text-muted-foreground mt-1">{order?.company?.name}</p>
										</div>
										<Badge>{order?.order_status}</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									{/* Order Details */}
									<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
										<div>
											<div className="flex items-center gap-2 text-muted-foreground mb-1">
												<Calendar className="h-4 w-4" />
												<span>Event Date</span>
											</div>
											<p className="font-medium">{new Date(order.event_start_date).toLocaleDateString()}</p>
										</div>
										<div>
											<div className="flex items-center gap-2 text-muted-foreground mb-1">
												<MapPin className="h-4 w-4" />
												<span>Venue</span>
											</div>
											<p className="font-medium">
												{order?.venue_location?.country},
												{order?.venue_location?.city},
												{order?.venue_location?.state}
											</p>
										</div>
										<div>
											<div className="flex items-center gap-2 text-muted-foreground mb-1">
												<Package className="h-4 w-4" />
												<span>Volume</span>
											</div>
											<p className="font-medium">{order?.calculated_totals.volume} m³</p>
										</div>
										<div>
											<div className="flex items-center gap-2 text-muted-foreground mb-1">
												<DollarSign className="h-4 w-4" />
												<span>Base Price</span>
											</div>
											<p className="font-medium font-mono">
												{order.logistics_pricing?.base_price
													? `${(Number(order.logistics_pricing.base_price) + Number(order.platform_pricing.margin_amount)).toFixed(2)} AED`
													: <span className="text-amber-600 text-xs">No Tier Matched</span>
												}
											</p>
										</div>
									</div>

									{/* Pricing Details - A2 Staff Only Sees Base Price */}
									{order.logistics_pricing?.base_price ? (
										<div className="border border-border rounded-md p-4 bg-muted/50">
											<h4 className="font-semibold text-sm mb-3">Calculated Price</h4>
											<div className="flex items-baseline justify-between">
												<span className="text-sm text-muted-foreground font-mono">Base Price</span>
												<span className="text-2xl font-bold font-mono text-primary">
													{Number(order.logistics_pricing.base_price)} AED
												</span>
											</div>
											<div className="flex items-baseline justify-between">
												<span className="text-sm text-muted-foreground font-mono">Margin Amount</span>
												<span className="text-2xl font-bold font-mono text-primary">
													<span className="text-sm mr-2">({order.platform_pricing.margin_percent}%)</span>
													{Number(order.platform_pricing.margin_amount)} AED
												</span>
											</div>
											{order?.pricing_tier && (
												<p className="text-xs text-muted-foreground mt-3 font-mono">
													Based on tier: {order.pricing_tier.city}, {order.pricing_tier.country} ({order.calculated_totals.volume} m³)
												</p>
											)}
										</div>
									) : (
										<div className="border border-amber-500/30 rounded-md p-4 bg-amber-500/5">
											<h4 className="font-semibold text-sm mb-2 text-amber-700 dark:text-amber-400">No Standard Pricing Available</h4>
											<p className="text-xs text-muted-foreground">
												No pricing tier found for {order.venue_location.city}, {order.venue_location.country} with volume {order.calculated_volume} m³.
												You must manually adjust pricing for this order.
											</p>
										</div>
									)}

									{/* Actions */}
									<div className="flex gap-3 pt-2">
										{order.logistics_pricing?.base_price && (
											<Button
												onClick={() => {
													setSelectedOrder(order);
													setNotes('');
												}}
												disabled={approveStandard.isPending || adjustPricing.isPending}
												className="font-mono"
											>
												Approve Base Price
											</Button>
										)}
										<Button
											variant="outline"
											onClick={() => handleOpenAdjust(order)}
											disabled={approveStandard.isPending || adjustPricing.isPending}
											className="font-mono"
										>
											{order.logistics_pricing?.base_price ? 'Adjust Price' : 'Set Custom Price'}
										</Button>
										<Button variant="ghost" asChild>
											<Link href={`/orders/${order.order_id}`}>View Full Details</Link>
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Approve Standard Dialog */}
			<Dialog open={!!selectedOrder && !adjustDialogOpen} onOpenChange={(open) => !open && setSelectedOrder(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Approve Standard Pricing</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							You are about to approve the standard tier pricing for order{' '}
							<span className="font-mono font-semibold">{selectedOrder?.orderId}</span>. The quote will be sent directly
							to the client.
						</p>
						{selectedOrder?.standardPricing && (
							<div className="border border-border rounded-md p-3 bg-muted/50">
								<div className="text-sm font-mono">
									<div className="flex justify-between">
										<span>A2 Base Price</span>
										<span className="font-bold">{selectedOrder.standardPricing.a2BasePrice.toFixed(2)} AED</span>
									</div>
									<p className="text-xs text-muted-foreground mt-2">
										PMG will add their margin during approval. You are only approving the A2 base price.
									</p>
								</div>
							</div>
						)}
						<div>
							<Label htmlFor="notes">Notes (Optional)</Label>
							<Textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Add any internal notes..."
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSelectedOrder(null)} disabled={approveStandard.isPending}>
							Cancel
						</Button>
						<Button onClick={() => handleApproveStandard(selectedOrder)} disabled={approveStandard.isPending}>
							{approveStandard.isPending ? 'Approving...' : 'Approve & Send Quote'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Adjust Pricing Dialog */}
			<Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Adjust Pricing</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Adjust the pricing for order <span className="font-mono font-semibold">{selectedOrder?.order_id}</span>.
							This will send the adjusted pricing to PMG for final approval.
						</p>
						{selectedOrder?.logistics_pricing?.base_price && (
							<div className="border border-border rounded-md p-3 bg-muted/50">
								<p className="text-xs text-muted-foreground mb-2">Standard Base Price (for reference)</p>
								<div className="text-sm font-mono space-y-2">
									<div className="flex justify-between">
										<span>Base Price</span>
										<span className="font-bold">{Number(selectedOrder?.logistics_pricing?.base_price).toFixed(2)} AED</span>
									</div>
									<div className="flex justify-between">
										<span>Margin Amount</span>
										<span className="font-bold">{Number(selectedOrder?.platform_pricing?.margin_amount).toFixed(2)} AED</span>
									</div>
								</div>
							</div>
						)}
						<div>
							<Label htmlFor="adjustedPrice">
								Adjusted Base Price <span className="text-destructive">*</span>
							</Label>
							<Input
								id="adjustedPrice"
								type="number"
								step="0.01"
								min="0"
								value={adjustedPrice}
								onChange={(e) => setAdjustedPrice(e.target.value)}
								placeholder="Enter adjusted price..."
							/>
						</div>
						<div>
							<Label htmlFor="adjustmentReason">
								Reason for Adjustment <span className="text-destructive">*</span>
							</Label>
							<Textarea
								id="adjustmentReason"
								value={adjustmentReason}
								onChange={(e) => setAdjustmentReason(e.target.value)}
								placeholder="e.g., Oversized items need special truck handling..."
								rows={4}
							/>
							<p className="text-xs text-muted-foreground mt-1">Minimum 10 characters required</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={adjustPricing.isPending}>
							Cancel
						</Button>
						<Button onClick={handleAdjust} disabled={adjustPricing.isPending}>
							{adjustPricing.isPending ? 'Submitting...' : 'Submit for PMG Approval'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
