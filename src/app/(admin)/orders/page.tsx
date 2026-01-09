'use client';

/**
 * Phase 7: Admin Order List Page
 * Professional order management interface with filtering, search, and export
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAdminOrders, useExportOrders } from '@/hooks/use-orders';
import { useCompanies } from '@/hooks/use-companies';
import { useBrands } from '@/hooks/use-brands';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Package, Calendar, MapPin, User, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { AdminHeader } from '@/components/admin-header';

// Order status display configuration
const ORDER_STATUS_CONFIG = {
	DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-300' },
	SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 border-blue-300' },
	PRICING_REVIEW: { label: 'Pricing Review', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
	PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-orange-100 text-orange-700 border-orange-300' },
	QUOTED: { label: 'Quoted', color: 'bg-purple-100 text-purple-700 border-purple-300' },
	DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-700 border-red-300' },
	CONFIRMED: { label: 'Confirmed', color: 'bg-teal-100 text-teal-700 border-teal-300' },
	IN_PREPARATION: { label: 'In Preparation', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
	READY_FOR_DELIVERY: { label: 'Ready', color: 'bg-sky-100 text-sky-700 border-sky-300' },
	IN_TRANSIT: { label: 'In Transit', color: 'bg-violet-100 text-violet-700 border-violet-300' },
	DELIVERED: { label: 'Delivered', color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300' },
	IN_USE: { label: 'In Use', color: 'bg-pink-100 text-pink-700 border-pink-300' },
	AWAITING_RETURN: { label: 'Awaiting Return', color: 'bg-rose-100 text-rose-700 border-rose-300' },
	CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-700 border-slate-300' },
};

export default function AdminOrdersPage() {
	// Filters state
	const [page, setPage] = useState(1);
	const [limit] = useState(20);
	const [company, setCompany] = useState<string>('');
	const [brand, setBrand] = useState<string>('');
	const [status, setStatus] = useState<string>('');
	const [search, setSearch] = useState<string>('');
	const [searchInput, setSearchInput] = useState<string>('');
	const [sortBy, setSortBy] = useState<string>('created_at');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

	// Data fetching
	const { data, isLoading, error } = useAdminOrders({
		page,
		limit,
		company: company || undefined,
		brand: brand || undefined,
		order_status: status || undefined,
		search: search || undefined,
		sortBy,
		sortOrder,
	});

	const { data: companiesData } = useCompanies({ limit: '100' });
	const { data: brandsData } = useBrands({ limit: '100' });
	const exportOrders = useExportOrders();

	// Handle search
	const handleSearch = () => {
		setSearch(searchInput);
		setPage(1);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	// Handle export
	const handleExport = async () => {
		try {
			const csvBlob = await exportOrders.mutateAsync({
				company: company || undefined,
				brand: brand || undefined,
				status: status || undefined,
				search: search || undefined,
				sortBy,
				sortOrder,
			});

			const url = URL.createObjectURL(csvBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
			link.click();
			URL.revokeObjectURL(url);

			toast.success('Orders exported successfully');
		} catch (error) {
			toast.error('Failed to export orders');
		}
	};

	// Clear filters
	const clearFilters = () => {
		setCompany('');
		setBrand('');
		setStatus('');
		setSearch('');
		setSearchInput('');
		setPage(1);
	};

	const activeFiltersCount =
		(company ? 1 : 0) + (brand ? 1 : 0) + (status ? 1 : 0) + (search ? 1 : 0);

	return (
		<div className="min-h-screen bg-linear-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
			{/* Header */}
			<AdminHeader
				icon={ShoppingCart}
				title="ORDERS DASHBOARD"
				description="Manage · Track · Fulfill"
				stats={data ? { label: 'TOTAL ORDERS', value: data?.meta.total } : undefined}
				actions={
					<Button
						onClick={handleExport}
						disabled={exportOrders.isPending}
						variant="outline"
						className="gap-2 font-medium font-mono"
					>
						<Download className="h-4 w-4" />
						{exportOrders.isPending ? 'EXPORTING...' : 'EXPORT CSV'}
					</Button>
				}
			/>

			<div className="container mx-auto px-6 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Filters Sidebar */}
					<Card className="lg:col-span-1 h-fit border-slate-200 shadow-sm">
						<CardHeader className="border-b border-slate-100">
							<div className="flex items-center justify-between">
								<CardTitle className="text-base font-semibold flex items-center gap-2">
									<Filter className="h-4 w-4" />
									Filters
								</CardTitle>
								{activeFiltersCount > 0 && (
									<Button onClick={clearFilters} variant="ghost" size="sm" className="h-7 text-xs">
										Clear ({activeFiltersCount})
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent className="space-y-4 pt-6">
							{/* Search */}
							<div className="space-y-2">
								<label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
									Search Orders
								</label>
								<div className="flex gap-2">
									<Input
										placeholder="Order ID, client, venue..."
										value={searchInput}
										onChange={(e) => setSearchInput(e.target.value)}
										onKeyPress={handleKeyPress}
										className="flex-1"
									/>
									<Button onClick={handleSearch} size="icon" variant="secondary">
										<Search className="h-4 w-4" />
									</Button>
								</div>
							</div>

							{/* Company Filter */}
							<div className="space-y-2">
								<label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
									Company
								</label>
								<Select value={company} onValueChange={(val) => { setCompany(val === 'all' ? '' : val); setPage(1); }}>
									<SelectTrigger>
										<SelectValue placeholder="All Companies" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Companies</SelectItem>
										{companiesData?.data?.map((c) => (
											<SelectItem key={c.id} value={c.id}>
												{c.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Brand Filter */}
							<div className="space-y-2">
								<label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
									Brand
								</label>
								<Select value={brand} onValueChange={(val) => { setBrand(val === 'all' ? '' : val); setPage(1); }}>
									<SelectTrigger>
										<SelectValue placeholder="All Brands" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Brands</SelectItem>
										{brandsData?.data?.map((b) => (
											<SelectItem key={b.id} value={b.id}>
												{b.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Status Filter */}
							<div className="space-y-2">
								<label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
									Status
								</label>
								<Select value={status} onValueChange={(val) => { setStatus(val === 'all' ? '' : val); setPage(1); }}>
									<SelectTrigger>
										<SelectValue placeholder="All Statuses" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Statuses</SelectItem>
										{Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
											<SelectItem key={key} value={key}>
												{config.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Sort Options */}
							<div className="space-y-2 pt-4 border-t border-slate-100">
								<label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
									Sort By
								</label>
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="created_at">Date Created</SelectItem>
										<SelectItem value="updated_at">Date Updated</SelectItem>
										<SelectItem value="event_start_date">Event Date</SelectItem>
										<SelectItem value="order_id">Order ID</SelectItem>
										<SelectItem value="order_status">Status</SelectItem>
										<SelectItem value="financial_status">Financial Status</SelectItem>
									</SelectContent>
								</Select>
								<Select value={sortOrder} onValueChange={(val) => setSortOrder(val as 'asc' | 'desc')}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="desc">Newest First</SelectItem>
										<SelectItem value="asc">Oldest First</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					{/* Orders Table */}
					<div className="lg:col-span-3 space-y-4">
						{/* Summary Stats */}
						{data?.data && (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<Card className="border-slate-200 shadow-sm">
									<CardContent className="pt-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
													Total Orders
												</p>
												<p className="text-2xl font-bold text-slate-900 mt-1">
													{data?.meta.total}
												</p>
											</div>
											<Package className="h-8 w-8 text-slate-400" />
										</div>
									</CardContent>
								</Card>
								<Card className="border-slate-200 shadow-sm">
									<CardContent className="pt-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
													Current Page
												</p>
												<p className="text-2xl font-bold text-slate-900 mt-1">
													{page} of {Math.ceil(data?.meta.total / data?.meta.limit)}
												</p>
											</div>
											<Calendar className="h-8 w-8 text-slate-400" />
										</div>
									</CardContent>
								</Card>
								<Card className="border-slate-200 shadow-sm">
									<CardContent className="pt-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
													Showing
												</p>
												<p className="text-2xl font-bold text-slate-900 mt-1">
													{data?.data?.length} orders
												</p>
											</div>
											<MapPin className="h-8 w-8 text-slate-400" />
										</div>
									</CardContent>
								</Card>
							</div>
						)}

						{/* Orders Table Card */}
						<Card className="border-slate-200 shadow-sm">
							<CardContent className="p-0">
								{isLoading ? (
									<div className="p-8 space-y-4">
										{[...Array(5)].map((_, i) => (
											<Skeleton key={i} className="h-16 w-full" />
										))}
									</div>
								) : error ? (
									<div className="p-8 text-center text-red-600">
										<p>Failed to load orders. Please try again.</p>
									</div>
								) : !isLoading && data?.data?.length === 0 ? (
									<div className="p-12 text-center">
										<Package className="h-12 w-12 mx-auto text-slate-400 mb-4" />
										<p className="text-slate-600 font-medium">No orders found</p>
										<p className="text-sm text-slate-500 mt-1">
											Try adjusting your filters or create a new order
										</p>
									</div>
								) : (
									<>
										<Table>
											<TableHeader>
												<TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
													<TableHead className="font-semibold">Order ID</TableHead>
													<TableHead className="font-semibold">Company</TableHead>
													<TableHead className="font-semibold">Contact</TableHead>
													<TableHead className="font-semibold">Event Date</TableHead>
													<TableHead className="font-semibold">Venue</TableHead>
													<TableHead className="font-semibold">Items</TableHead>
													<TableHead className="font-semibold">Status</TableHead>
													<TableHead className="font-semibold text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{!isLoading && data?.data && data?.data?.map((order) => (
													<TableRow key={order.id} className="group hover:bg-slate-50/50">
														<TableCell className="font-mono text-xs font-medium">
															{order?.order_id}
														</TableCell>
														<TableCell>
															<div>
																<p className="font-medium text-slate-900 text-sm">
																	{order?.company?.name}
																</p>
																{order.brand && (
																	<p className="text-xs text-slate-500">{order.brand.name}</p>
																)}
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-start gap-2">
																<User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
																<div>
																	<p className="text-sm font-medium text-slate-900">
																		{order.contact_name}
																	</p>
																	<p className="text-xs text-slate-500">{order.contact_email}</p>
																</div>
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																<Calendar className="h-4 w-4 text-slate-400" />
																<span className="text-sm">
																	{new Date(order.event_start_date).toLocaleDateString()}
																</span>
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-start gap-2">
																<MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
																<div>
																	<p className="text-sm font-medium text-slate-900">
																		{order.venue_name}
																	</p>
																	<p className="text-xs text-slate-500">
																		{order.venue_city}, {order.venue_country}
																	</p>
																</div>
															</div>
														</TableCell>
														<TableCell>
															<div className="space-y-1">
																<p className="text-sm font-semibold text-slate-900">
																	{order.item_count} items
																</p>
																{order.item_preview.length > 0 && (
																	<p className="text-xs text-slate-500 line-clamp-1">
																		{order.item_preview.join(', ')}
																	</p>
																)}
															</div>
														</TableCell>
														<TableCell>
															<Badge
																variant="outline"
																className={`${ORDER_STATUS_CONFIG[order.order_status as keyof typeof ORDER_STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-700 border-gray-300'} font-medium border whitespace-nowrap`}
															>
																{ORDER_STATUS_CONFIG[order.order_status as keyof typeof ORDER_STATUS_CONFIG]?.label || order.order_status}
															</Badge>
														</TableCell>
														<TableCell className="text-right">
															<Link href={`/orders/${order.id}`}>
																<Button
																	variant="ghost"
																	size="sm"
																	className="opacity-0 group-hover:opacity-100 transition-opacity"
																>
																	View Details
																</Button>
															</Link>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>

										{/* Pagination */}
										{(data?.meta.total / data?.meta.limit) > 1 && (
											<div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/30">
												<p className="text-sm text-slate-600">
													Showing {(page - 1) * limit + 1} to{' '}
													{Math.min(page * limit, data?.meta.total)} of{' '}
													{data?.meta.total} orders
												</p>
												<div className="flex gap-2">
													<Button
														onClick={() => setPage((p) => Math.max(1, p - 1))}
														disabled={page === 1}
														variant="outline"
														size="sm"
														className="gap-1"
													>
														<ChevronLeft className="h-4 w-4" />
														Previous
													</Button>
													<Button
														onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
														disabled={page === data.pagination.totalPages}
														variant="outline"
														size="sm"
														className="gap-1"
													>
														Next
														<ChevronRight className="h-4 w-4" />
													</Button>
												</div>
											</div>
										)}
									</>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
