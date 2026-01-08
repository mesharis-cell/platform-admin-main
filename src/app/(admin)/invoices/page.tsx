'use client';

/**
 * Phase 9: PMG Invoice & Payment Tracking Dashboard
 * Industrial-technical payment management interface with invoice operations
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	FileText,
	DollarSign,
	CheckCircle2,
	Clock,
	Download,
	Filter,
	Search,
	Calendar,
	Building2,
	AlertCircle,
	TrendingUp,
	Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices, useConfirmPayment, useDownloadInvoice } from '@/hooks/use-invoices';
import { useCompanies } from '@/hooks/use-companies';
import { toast } from 'sonner';
import { InvoiceListParams } from '@/types/order';
import { AdminHeader } from '@/components/admin-header';
import { usePlatform } from '@/contexts/platform-context';

export default function InvoicesPage() {
	// Filters
	const [filters, setFilters] = useState<InvoiceListParams>({
		page: 1,
		limit: 20,
		sortBy: 'created_at',
		sortOrder: 'desc',
	});

	const [selectedCompany, setSelectedCompany] = useState<string>('');
	const [paymentStatus, setPaymentStatus] = useState<string>('all');
	const { platform } = usePlatform();

	// Modals
	const [confirmPaymentDialogOpen, setConfirmPaymentDialogOpen] = useState(false);
	const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
	const [paymentMethod, setPaymentMethod] = useState('');
	const [paymentReference, setPaymentReference] = useState('');
	const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
	const [paymentNotes, setPaymentNotes] = useState('');

	// Hooks
	const { data: companies } = useCompanies({});
	const { data: invoicesData, isLoading } = useInvoices({
		...filters,
		company: selectedCompany || undefined,
		isPaid: paymentStatus,
	});
	const confirmPayment = useConfirmPayment();
	const downloadInvoice = useDownloadInvoice();

	const handleApplyFilters = () => {
		setFilters((prev) => ({
			...prev,
			company: selectedCompany || undefined,
			isPaid: paymentStatus,
			page: 1,
		}));
	};

	const handleClearFilters = () => {
		setSelectedCompany('');
		setPaymentStatus('all');
		setFilters({
			page: 1,
			limit: 20,
			sortBy: 'created_at',
			sortOrder: 'desc',
		});
	};

	const handleOpenConfirmPayment = (invoice: any) => {
		setSelectedInvoice(invoice);
		setPaymentMethod('');
		setPaymentReference('');
		setPaymentDate(new Date().toISOString().split('T')[0]);
		setPaymentNotes('');
		setConfirmPaymentDialogOpen(true);
	};

	const handleConfirmPayment = async () => {
		if (!selectedInvoice) return;

		if (!paymentMethod || !paymentReference || !paymentDate) {
			toast.error('Payment method, reference, and date are required');
			return;
		}

		try {
			await confirmPayment.mutateAsync({
				orderId: selectedInvoice.order.id,
				data: {
					payment_method: paymentMethod,
					payment_reference: paymentReference,
					payment_date: paymentDate,
					notes: paymentNotes || undefined,
				},
			});

			toast.success('Payment confirmed successfully');
			setConfirmPaymentDialogOpen(false);
			setSelectedInvoice(null);
		} catch (error: any) {
			toast.error(error.message || 'Failed to confirm payment');
		}
	};

	const handleDownloadInvoice = async (invoiceNumber: string) => {
		if (!invoiceNumber) return

		try {
			const pdfBlob = await downloadInvoice.mutateAsync({ invoiceNumber, platformId: platform.platform_id });
			const url = URL.createObjectURL(pdfBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `invoice-${invoiceNumber}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (error: any) {
			toast.error(error.message || 'Failed to download Invoice');
		}
	}

	// Calculate stats
	const stats = invoicesData?.data
		? {
			totalInvoices: invoicesData?.meta?.total,
			paidInvoices: invoicesData.data.filter((inv) => inv.invoice_paid_at).length,
			unpaidInvoices: invoicesData.data.filter((inv) => !inv.invoice_paid_at).length,
			totalRevenue: invoicesData.data
				.filter((inv) => inv.invoice_paid_at)
				.reduce((sum, inv) => sum + parseFloat(inv.order.final_pricing.total_price.toString()), 0),
		}
		: null;

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={Receipt}
				title="INVOICE MANAGEMENT"
				description="Generate · Track · Payments"
				stats={stats ? { label: 'TOTAL INVOICES', value: stats.totalInvoices } : undefined}
			/>

			<div className="container mx-auto px-4 py-8 max-w-7xl">

				{/* Stats Grid */}
				{stats && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1, duration: 0.4 }}
						className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
					>
						<Card className="p-6 border-2 hover:border-primary/50 transition-colors">
							<div className="flex items-center gap-3 mb-2">
								<FileText className="w-5 h-5 text-primary" />
								<span className="text-sm font-mono text-muted-foreground">TOTAL</span>
							</div>
							<div className="text-3xl font-bold font-mono">{stats.totalInvoices}</div>
							<div className="text-xs font-mono text-muted-foreground mt-1">Invoices</div>
						</Card>

						<Card className="p-6 border-2 hover:border-green-500/50 transition-colors">
							<div className="flex items-center gap-3 mb-2">
								<CheckCircle2 className="w-5 h-5 text-green-600" />
								<span className="text-sm font-mono text-muted-foreground">PAID</span>
							</div>
							<div className="text-3xl font-bold font-mono text-green-600">
								{stats.paidInvoices}
							</div>
							<div className="text-xs font-mono text-muted-foreground mt-1">
								{stats.totalInvoices > 0
									? Math.round((stats.paidInvoices / stats.totalInvoices) * 100)
									: 0}
								% collected
							</div>
						</Card>

						<Card className="p-6 border-2 hover:border-amber-500/50 transition-colors">
							<div className="flex items-center gap-3 mb-2">
								<Clock className="w-5 h-5 text-amber-600" />
								<span className="text-sm font-mono text-muted-foreground">PENDING</span>
							</div>
							<div className="text-3xl font-bold font-mono text-amber-600">
								{stats.unpaidInvoices}
							</div>
							<div className="text-xs font-mono text-muted-foreground mt-1">
								Awaiting payment
							</div>
						</Card>

						<Card className="p-6 border-2 hover:border-secondary/50 transition-colors">
							<div className="flex items-center gap-3 mb-2">
								<TrendingUp className="w-5 h-5 text-secondary" />
								<span className="text-sm font-mono text-muted-foreground">REVENUE</span>
							</div>
							<div className="text-3xl font-bold font-mono text-secondary">
								{stats.totalRevenue.toFixed(0)}
							</div>
							<div className="text-xs font-mono text-muted-foreground mt-1">AED collected</div>
						</Card>
					</motion.div>
				)}

				{/* Filters */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2, duration: 0.4 }}
				>
					<Card className="p-6 border-2 mb-6">
						<div className="flex items-center gap-3 mb-4">
							<Filter className="w-5 h-5 text-primary" />
							<h3 className="text-lg font-bold font-mono">FILTERS</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<Label className="font-mono text-xs mb-2">COMPANY</Label>
								<Select value={selectedCompany} onValueChange={setSelectedCompany}>
									<SelectTrigger className="font-mono">
										<SelectValue placeholder="All Companies" />
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

							<div>
								<Label className="font-mono text-xs mb-2">PAYMENT STATUS</Label>
								<Select value={paymentStatus} onValueChange={setPaymentStatus}>
									<SelectTrigger className="font-mono">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Statuses</SelectItem>
										<SelectItem value="paid">Paid</SelectItem>
										<SelectItem value="unpaid">Unpaid</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-end gap-2">
								<Button onClick={handleApplyFilters} className="flex-1 font-mono">
									<Filter className="w-4 h-4 mr-2" />
									APPLY
								</Button>
								<Button onClick={handleClearFilters} variant="outline" className="font-mono">
									CLEAR
								</Button>
							</div>
						</div>
					</Card>
				</motion.div>

				{/* Invoice List */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3, duration: 0.4 }}
				>
					{isLoading ? (
						<div className="space-y-4">
							{[...Array(5)].map((_, i) => (
								<Skeleton key={i} className="h-32 w-full" />
							))}
						</div>
					) : invoicesData && invoicesData.data.length > 0 ? (
						<div className="space-y-4">
							<AnimatePresence mode="popLayout">
								{invoicesData.data.map((invoice, index) => (
									<motion.div
										key={invoice.id}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 20 }}
										transition={{ delay: index * 0.05 }}
										layout
									>
										<Card className="p-6 border-2 hover:border-primary/50 transition-all duration-200">
											<div className="flex items-start justify-between gap-6">
												{/* Left: Invoice Info */}
												<div className="flex-1 space-y-3">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center border-2 border-primary/20">
															<FileText className="w-5 h-5 text-primary" />
														</div>
														<div>
															<div className="font-mono font-bold text-lg">
																{invoice.invoice_id}
															</div>
															<div className="text-sm text-muted-foreground font-mono">
																Order: {invoice?.order?.order_id}
															</div>
														</div>
														{invoice.invoice_paid_at ? (
															<Badge className="bg-green-500/10 text-green-600 border-green-500/30 font-mono">
																<CheckCircle2 className="w-3 h-3 mr-1" />
																PAID
															</Badge>
														) : (
															<Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-mono">
																<Clock className="w-3 h-3 mr-1" />
																PENDING
															</Badge>
														)}
													</div>

													<div className="grid grid-cols-3 gap-4 pl-13">
														<div>
															<div className="text-xs text-muted-foreground font-mono">COMPANY</div>
															<div className="text-sm font-mono flex items-center gap-1.5 mt-1">
																<Building2 className="w-3.5 h-3.5 text-primary" />
																{invoice.company.name}
															</div>
														</div>
														<div>
															<div className="text-xs text-muted-foreground font-mono">CONTACT</div>
															<div className="text-sm font-mono mt-1">{invoice?.order?.contact_name}</div>
														</div>
														<div>
															<div className="text-xs text-muted-foreground font-mono">
																INVOICE DATE
															</div>
															<div className="text-sm font-mono flex items-center gap-1.5 mt-1">
																<Calendar className="w-3.5 h-3.5 text-secondary" />
																{new Date(invoice.created_at).toLocaleDateString()}
															</div>
														</div>
													</div>

													{invoice.invoice_paid_at && (
														<div className="pl-13 pt-2 border-t border-border">
															<div className="flex items-center gap-6 text-sm font-mono">
																<div>
																	<span className="text-muted-foreground">Paid on:</span>{' '}
																	<span className="text-green-600 font-bold">
																		{new Date(invoice.invoice_paid_at!).toLocaleDateString()}
																	</span>
																</div>
																{invoice.payment_method && (
																	<div>
																		<span className="text-muted-foreground">Method:</span>{' '}
																		<span>{invoice.payment_method}</span>
																	</div>
																)}
															</div>
														</div>
													)}
												</div>

												{/* Right: Amount & Actions */}
												<div className="flex flex-col items-end gap-3">
													<div className="text-right">
														<div className="text-xs text-muted-foreground font-mono">AMOUNT</div>
														<div className="text-3xl font-bold font-mono text-primary">
															{parseFloat(invoice.order.final_pricing.total_price.toString()).toFixed(2)}
														</div>
														<div className="text-xs text-muted-foreground font-mono">AED</div>
													</div>

													<div className="flex gap-2">
														<Button
															onClick={() => handleDownloadInvoice(invoice.invoice_id)}
															variant="outline"
															size="sm"
															className="font-mono"
														>
															<Download className="w-4 h-4" />
														</Button>

														{!invoice.invoice_paid_at && (
															<Button
																onClick={() => handleOpenConfirmPayment(invoice)}
																size="sm"
																className="font-mono"
															>
																<DollarSign className="w-4 h-4 mr-2" />
																CONFIRM PAYMENT
															</Button>
														)}
													</div>
												</div>
											</div>
										</Card>
									</motion.div>
								))}
							</AnimatePresence>

							{/* Pagination */}
							{Math.ceil(invoicesData?.meta?.total / invoicesData?.meta?.limit) > 1 && (
								<div className="flex items-center justify-center gap-2 mt-8">
									<Button
										onClick={() =>
											setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page! - 1) }))
										}
										disabled={filters.page === 1}
										variant="outline"
										size="sm"
										className="font-mono"
									>
										PREV
									</Button>
									<div className="px-4 py-2 font-mono text-sm">
										Page {filters.page} of {Math.ceil(invoicesData?.meta?.total / invoicesData?.meta?.limit)}
									</div>
									<Button
										onClick={() =>
											setFilters((prev) => ({
												...prev,
												page: Math.min(Math.ceil(invoicesData?.meta?.total / invoicesData?.meta?.limit), prev.page! + 1),
											}))
										}
										disabled={filters.page === Math.ceil(invoicesData?.meta?.total / invoicesData?.meta?.limit)}
										variant="outline"
										size="sm"
										className="font-mono"
									>
										NEXT
									</Button>
								</div>
							)}
						</div>
					) : (
						<Card className="p-12 text-center border-2 border-dashed">
							<AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
							<h3 className="text-xl font-bold font-mono mb-2">NO INVOICES FOUND</h3>
							<p className="text-muted-foreground font-mono text-sm">
								No invoices match your current filters
							</p>
						</Card>
					)}
				</motion.div>
			</div>

			{/* Confirm Payment Dialog */}
			<Dialog open={confirmPaymentDialogOpen} onOpenChange={setConfirmPaymentDialogOpen}>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle className="font-mono">CONFIRM PAYMENT</DialogTitle>
					</DialogHeader>

					{selectedInvoice && (
						<div className="space-y-4">
							<div className="p-4 bg-muted/50 rounded-lg border-2">
								<div className="grid grid-cols-2 gap-3 text-sm font-mono">
									<div>
										<span className="text-muted-foreground">Invoice:</span>{' '}
										<span className="font-bold">{selectedInvoice.invoiceNumber}</span>
									</div>
									<div>
										<span className="text-muted-foreground">Order:</span>{' '}
										<span className="font-bold">{selectedInvoice.orderIdReadable}</span>
									</div>
									<div>
										<span className="text-muted-foreground">Company:</span>{' '}
										<span>{selectedInvoice.company.name}</span>
									</div>
									<div>
										<span className="text-muted-foreground">Amount:</span>{' '}
										<span className="font-bold text-primary">
											{parseFloat(selectedInvoice.finalTotalPrice).toFixed(2)} AED
										</span>
									</div>
								</div>
							</div>

							<div>
								<Label className="font-mono text-xs mb-2">PAYMENT METHOD *</Label>
								<Select value={paymentMethod} onValueChange={setPaymentMethod}>
									<SelectTrigger className="font-mono">
										<SelectValue placeholder="Select payment method" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
										<SelectItem value="Check">Check</SelectItem>
										<SelectItem value="Wire Transfer">Wire Transfer</SelectItem>
										<SelectItem value="Credit Card">Credit Card</SelectItem>
										<SelectItem value="Other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label className="font-mono text-xs mb-2">PAYMENT REFERENCE *</Label>
								<Input
									value={paymentReference}
									onChange={(e) => setPaymentReference(e.target.value)}
									placeholder="Transaction ID, check number, etc."
									className="font-mono"
								/>
							</div>

							<div>
								<Label className="font-mono text-xs mb-2">PAYMENT DATE *</Label>
								<Input
									type="date"
									value={paymentDate}
									onChange={(e) => setPaymentDate(e.target.value)}
									max={new Date().toISOString().split('T')[0]}
									className="font-mono"
								/>
							</div>

							<div>
								<Label className="font-mono text-xs mb-2">NOTES (OPTIONAL)</Label>
								<textarea
									value={paymentNotes}
									onChange={(e) => setPaymentNotes(e.target.value)}
									placeholder="Internal notes about this payment..."
									rows={3}
									className="w-full px-3 py-2 font-mono text-sm border-2 rounded-md bg-background"
								/>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button
							onClick={() => setConfirmPaymentDialogOpen(false)}
							variant="outline"
							className="font-mono"
						>
							CANCEL
						</Button>
						<Button
							onClick={handleConfirmPayment}
							disabled={confirmPayment.isPending}
							className="font-mono"
						>
							{confirmPayment.isPending ? 'CONFIRMING...' : 'CONFIRM PAYMENT'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
