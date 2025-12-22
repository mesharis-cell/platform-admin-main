"use client";

/**
 * Items Needing Attention Dashboard (Phase 12)
 * Industrial Quality Control Station Aesthetic
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useItemsNeedingAttention } from "@/hooks/use-conditions";
import { useCompanies } from "@/hooks/use-companies";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useZones } from "@/hooks/use-zones";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	AlertTriangle,
	AlertCircle,
	Package,
	MapPin,
	Building2,
	Warehouse,
	ChevronRight,
	Filter,
	Layers,
} from "lucide-react";
import type { Condition } from "@/types/asset";
import { AdminHeader } from "@/components/admin-header";

export default function ItemsNeedingAttentionPage() {
	const [conditionFilter, setConditionFilter] = useState<
		"RED" | "ORANGE" | undefined
	>(undefined);
	const [companyFilter, setCompanyFilter] = useState<string | undefined>(
		undefined
	);
	const [warehouseFilter, setWarehouseFilter] = useState<string | undefined>(
		undefined
	);
	const [zoneFilter, setZoneFilter] = useState<string | undefined>(undefined);
	const [page, setPage] = useState(1);

	const { data, isLoading } = useItemsNeedingAttention({
		condition: conditionFilter,
		company: companyFilter,
		warehouse: warehouseFilter,
		zone: zoneFilter,
		page,
		limit: 20,
	});

	const { data: companiesData } = useCompanies({ limit: "100" });
	const { data: warehousesData } = useWarehouses({ limit: "100" });
	const { data: zonesData } = useZones({ limit: "100" });

	const getConditionBadge = (condition: Condition) => {
		if (condition === "RED") {
			return (
				<Badge
					variant="destructive"
					className="gap-1 font-mono text-xs uppercase tracking-wider"
				>
					<AlertTriangle className="h-3 w-3" />
					Critical
				</Badge>
			);
		}
		return (
			<Badge
				variant="outline"
				className="gap-1 border-orange-500/50 bg-orange-500/10 font-mono text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400"
			>
				<AlertCircle className="h-3 w-3" />
				Flagged
			</Badge>
		);
	};

	const getStatusBadge = (status: "AVAILABLE" | "IN_MAINTENANCE") => {
		if (status === "IN_MAINTENANCE") {
			return (
				<Badge
					variant="secondary"
					className="font-mono text-xs uppercase tracking-wider"
				>
					In Maintenance
				</Badge>
			);
		}
		return (
			<Badge
				variant="outline"
				className="font-mono text-xs uppercase tracking-wider"
			>
				Available
			</Badge>
		);
	};

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={AlertCircle}
				title="CONDITION MANAGEMENT"
				description="Inspect · Maintain · Track Status"
				stats={data ? { label: 'NEEDS ATTENTION', value: (data.summary.redCount + data.summary.orangeCount) } : undefined}
			/>

			<div className="p-6 font-mono">
			<div className="mb-8 space-y-4">

				{/* Stats Grid - Industrial Metrics */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card className="border-l-4 border-l-destructive bg-gradient-to-br from-destructive/5 to-background">
						<CardHeader className="pb-3">
							<CardDescription className="text-xs uppercase tracking-wider">
								Critical / Damaged
							</CardDescription>
							<CardTitle className="flex items-baseline gap-2">
								<span className="font-mono text-4xl font-bold tabular-nums">
									{isLoading ? (
										<Skeleton className="h-10 w-16" />
									) : (
										data?.summary.redCount || 0
									)}
								</span>
								<span className="text-sm font-normal text-muted-foreground">
									items
								</span>
							</CardTitle>
						</CardHeader>
					</Card>

					<Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-500/5 to-background">
						<CardHeader className="pb-3">
							<CardDescription className="text-xs uppercase tracking-wider">
								Flagged / Review
							</CardDescription>
							<CardTitle className="flex items-baseline gap-2">
								<span className="font-mono text-4xl font-bold tabular-nums">
									{isLoading ? (
										<Skeleton className="h-10 w-16" />
									) : (
										data?.summary.orangeCount || 0
									)}
								</span>
								<span className="text-sm font-normal text-muted-foreground">
									items
								</span>
							</CardTitle>
						</CardHeader>
					</Card>

					<Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-background">
						<CardHeader className="pb-3">
							<CardDescription className="text-xs uppercase tracking-wider">
								Total Attention
							</CardDescription>
							<CardTitle className="flex items-baseline gap-2">
								<span className="font-mono text-4xl font-bold tabular-nums">
									{isLoading ? (
										<Skeleton className="h-10 w-16" />
									) : (
										(data?.summary.redCount || 0) +
										(data?.summary.orangeCount || 0)
									)}
								</span>
								<span className="text-sm font-normal text-muted-foreground">
									items
								</span>
							</CardTitle>
						</CardHeader>
					</Card>
				</div>

				{/* Filters - Industrial Control Panel */}
				<Card className="border-2">
					<CardHeader>
						<div className="flex items-center gap-2">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<CardTitle className="text-sm uppercase tracking-wider">
								Filter Controls
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-4">
							<div className="space-y-2">
								<label className="text-xs uppercase tracking-wider text-muted-foreground">
									Condition
								</label>
								<Select
									value={conditionFilter || "all"}
									onValueChange={(value) =>
										setConditionFilter(
											value === "all" ? undefined : (value as "RED" | "ORANGE")
										)
									}
								>
									<SelectTrigger className="font-mono">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Conditions</SelectItem>
										<SelectItem value="RED">Critical (Red)</SelectItem>
										<SelectItem value="ORANGE">Flagged (Orange)</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<label className="text-xs uppercase tracking-wider text-muted-foreground">
									Company
								</label>
								<Select
									value={companyFilter || "all"}
									onValueChange={(value) =>
										setCompanyFilter(value === "all" ? undefined : value)
									}
								>
									<SelectTrigger className="font-mono">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Companies</SelectItem>
										{companiesData?.companies.map((company) => (
											<SelectItem key={company.id} value={company.id}>
												{company.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<label className="text-xs uppercase tracking-wider text-muted-foreground">
									Warehouse
								</label>
								<Select
									value={warehouseFilter || "all"}
									onValueChange={(value) =>
										setWarehouseFilter(value === "all" ? undefined : value)
									}
								>
									<SelectTrigger className="font-mono">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Warehouses</SelectItem>
										{warehousesData?.warehouses.map((warehouse) => (
											<SelectItem key={warehouse.id} value={warehouse.id}>
												{warehouse.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<label className="text-xs uppercase tracking-wider text-muted-foreground">
									Zone
								</label>
								<Select
									value={zoneFilter || "all"}
									onValueChange={(value) =>
										setZoneFilter(value === "all" ? undefined : value)
									}
								>
									<SelectTrigger className="font-mono">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Zones</SelectItem>
										{zonesData?.zones.map((zone) => (
											<SelectItem key={zone.id} value={zone.id}>
												{zone.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Items List - Industrial Asset Cards */}
			<div className="space-y-4">
				{isLoading ? (
					Array.from({ length: 5 }).map((_, i) => (
						<Card key={i} className="border-l-4">
							<CardContent className="p-6">
								<div className="flex gap-6">
									<Skeleton className="h-24 w-24 shrink-0" />
									<div className="flex-1 space-y-3">
										<Skeleton className="h-6 w-3/4" />
										<Skeleton className="h-4 w-1/2" />
										<Skeleton className="h-4 w-2/3" />
									</div>
								</div>
							</CardContent>
						</Card>
					))
				) : data?.items.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							<Package className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
							<h3 className="mb-2 text-lg font-semibold">No Items Found</h3>
							<p className="text-sm text-muted-foreground">
								No assets requiring attention with the current filters.
							</p>
						</CardContent>
					</Card>
				) : (
					data?.items.map((item) => (
						<Link
							key={item.id}
							href={`/admin/assets/${item.id}`}
							className="block"
						>
							<Card
								className={`group border-l-4 transition-all hover:shadow-lg ${
									item.condition === "RED"
										? "border-l-destructive hover:border-l-destructive/80"
										: "border-l-orange-500 hover:border-l-orange-400"
								}`}
							>
								<CardContent className="p-6">
									<div className="flex gap-6">
										{/* Asset Image Placeholder */}
										<div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border-2 bg-muted">
											<div className="flex h-full w-full items-center justify-center">
												<Package className="h-8 w-8 text-muted-foreground" />
											</div>
										</div>

										{/* Asset Details */}
										<div className="flex-1 space-y-3">
											<div className="flex items-start justify-between">
												<div>
													<div className="mb-1 flex items-center gap-2">
														{getConditionBadge(item.condition)}
														{getStatusBadge(item.status)}
													</div>
													<h3 className="font-mono text-lg font-semibold group-hover:text-primary">
														{item.name}
													</h3>
													<p className="font-mono text-sm text-muted-foreground">
														QR: {item.qrCode}
													</p>
												</div>
												<ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
											</div>

											{/* Location Grid */}
											<div className="grid gap-2 md:grid-cols-3">
												<div className="flex items-center gap-2 text-sm">
													<Building2 className="h-4 w-4 text-muted-foreground" />
													<span className="text-muted-foreground">
														{item.company.name}
													</span>
												</div>
												<div className="flex items-center gap-2 text-sm">
													<Warehouse className="h-4 w-4 text-muted-foreground" />
													<span className="text-muted-foreground">
														{item.warehouse.name}
													</span>
												</div>
												<div className="flex items-center gap-2 text-sm">
													<MapPin className="h-4 w-4 text-muted-foreground" />
													<span className="text-muted-foreground">
														{item.zone.name}
													</span>
												</div>
											</div>

											{/* Last Update Info */}
											{item.lastConditionUpdate.notes && (
												<div className="rounded-md border-l-2 border-l-primary/50 bg-muted/50 p-3">
													<p className="text-xs uppercase tracking-wider text-muted-foreground">
														Latest Note
													</p>
													<p className="mt-1 text-sm">
														{item.lastConditionUpdate.notes}
													</p>
													<p className="mt-2 text-xs text-muted-foreground">
														{new Date(
															item.lastConditionUpdate.timestamp
														).toLocaleString()}
													</p>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						</Link>
					))
				)}
			</div>

			{/* Pagination */}
			{data && data.pagination.totalPages > 1 && (
				<div className="mt-8 flex items-center justify-between">
					<p className="font-mono text-sm text-muted-foreground">
						Page {page} of {data.pagination.totalPages} • Total:{" "}
						{data.pagination.total} items
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="font-mono"
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setPage((p) => Math.min(data.pagination.totalPages, p + 1))
							}
							disabled={page === data.pagination.totalPages}
							className="font-mono"
						>
							Next
						</Button>
					</div>
				</div>
			)}
			</div>
		</div>
	);
}
