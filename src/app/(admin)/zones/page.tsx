"use client";

import { useState, useMemo, useEffect } from "react";
import {
	useZones,
	useCreateZone,
	useUpdateZone,
	useDeleteZone,
} from "@/hooks/use-zones";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useCompanies } from "@/hooks/use-companies";
import {
	Plus,
	Trash2,
	Pencil,
	Box,
	Warehouse,
	Building2,
	MoreVertical,
	Filter,
	Grid3x3,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type {
	Zone,
	ZoneListResponse,
	Warehouse as WarehouseType,
	WarehouseListResponse,
	Company,
	CompanyListResponse,
} from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function ZonesPage() {
	const [warehouseFilter, setWarehouseFilter] = useState("all");
	const [companyFilter, setCompanyFilter] = useState("all");
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingZone, setEditingZone] = useState<Zone | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<Zone | null>(null);

	const [formData, setFormData] = useState({
		warehouse_id: "",
		company_id: "",
		name: "",
		description: "",
		capacity: undefined,
	});

	// Fetch reference data
	const { data: warehousesData } = useWarehouses({ limit: "100" });
	const { data: companiesData } = useCompanies({ limit: "100" });
	const warehouses = warehousesData?.data || [];
	const companies = companiesData?.data || [];

	// Build query params for zones
	const queryParams = useMemo(() => {
		const params: Record<string, string> = {
			limit: "100",
			page: "1",
		};
		if (warehouseFilter && warehouseFilter !== "all") params.warehouse_id = warehouseFilter;
		if (companyFilter && companyFilter !== "all") params.company_id = companyFilter;
		if (includeDeleted) params.include_inactive = "true";
		return params;
	}, [warehouseFilter, companyFilter, includeDeleted]);

	// Fetch zones
	const { data, isLoading: loading } = useZones(queryParams);
	const zones = data?.data || [];
	const total = data?.meta?.total || 0;

	// Mutations
	const createMutation = useCreateZone();
	const updateMutation = useUpdateZone();
	const deleteMutation = useDeleteZone();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const payload = {
				...formData,
				capacity: Number(formData.capacity),
			};

			if (editingZone) {
				await updateMutation.mutateAsync({
					id: editingZone.id,
					data: payload,
				});
				toast.success("Zone updated", {
					description: `${formData.name} has been updated.`,
				});
			} else {
				await createMutation.mutateAsync(payload);
				toast.success("Zone created", {
					description: `${formData.name} has been created.`,
				});
			}

			setIsCreateOpen(false);
			setEditingZone(null);
			resetForm();
		} catch (error) {
			let errorMessage = "Unknown error";
			if (error instanceof Error) {
				// Check if it's an Axios error with a response
				const axiosError = error as { response?: { data?: { message?: string } } };
				errorMessage = axiosError.response?.data?.message || error.message;
			}
			toast.error("Operation failed", {
				description: errorMessage,
			});
		}
	};

	const handleDelete = async () => {
		if (!confirmDelete) return;

		try {
			await deleteMutation.mutateAsync(confirmDelete.id);
			toast.success("Zone deleted", {
				description: `${confirmDelete.name} has been deleted.`,
			});
			setConfirmDelete(null);
		} catch (error) {
			toast.error("Delete failed", {
				description:
					error instanceof Error ? error.message : "Unknown error",
			});
			setConfirmDelete(null);
		}
	};

	const resetForm = () => {
		setFormData({
			warehouse_id: "",
			company_id: "",
			name: "",
			description: "",
			capacity: undefined,
		});
	};

	const openEditDialog = (zone: Zone) => {
		setEditingZone(zone);
		setFormData({
			warehouse_id: zone.warehouse.id,
			company_id: zone.company.id,
			name: zone.name,
			description: zone.description || "",
			capacity: zone.capacity || undefined,
		});
		setIsCreateOpen(true);
	};

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={Grid3x3}
				title="ZONE MANAGEMENT"
				description="Storage Areas · Company Assignment · Organization"
				stats={{ label: 'ALLOCATED ZONES', value: total }}
				actions={
					<Dialog
						open={isCreateOpen}
						onOpenChange={(open) => {
							setIsCreateOpen(open);
							if (!open) {
								setEditingZone(null);
								resetForm();
							}
						}}
					>
						<DialogTrigger asChild>
							<Button className="gap-2 font-mono">
								<Plus className="h-4 w-4" />
								NEW ZONE
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle className="font-mono">
									{editingZone ? "EDIT ZONE" : "CREATE NEW ZONE"}
								</DialogTitle>
								<DialogDescription className="font-mono text-xs">
									{editingZone
										? "Update zone details and assignments"
										: "Allocate company-exclusive area within warehouse"}
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="grid grid-cols-2 gap-4">

									{/* Warehouse Selection */}
									<div className="space-y-2">
										<Label
											htmlFor="warehouse"
											className="font-mono text-xs flex items-center gap-2"
										>
											<Warehouse className="h-3 w-3" />
											WAREHOUSE *
										</Label>
										<Select
											value={formData.warehouse_id}
											onValueChange={(value) =>
												setFormData({
													...formData,
													warehouse_id: value,
												})
											}
											required
										>
											<SelectTrigger className="font-mono">
												<SelectValue placeholder="Select warehouse" />
											</SelectTrigger>
											<SelectContent>
												{warehouses.map((wh) => (
													<SelectItem
														key={wh.id}
														value={wh.id}
														className="font-mono"
													>
														{wh.name} · {wh.city}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{/* Company Selection */}
									<div className="space-y-2">
										<Label
											htmlFor="company"
											className="font-mono text-xs flex items-center gap-2"
										>
											<Building2 className="h-3 w-3" />
											COMPANY *
										</Label>
										<Select
											value={formData.company_id}
											onValueChange={(value) =>
												setFormData({
													...formData,
													company_id: value,
												})
											}
											required
										>
											<SelectTrigger className="font-mono">
												<SelectValue placeholder="Select company" />
											</SelectTrigger>
											<SelectContent>
												{companies.map((co) => (
													<SelectItem
														key={co.id}
														value={co.id}
														className="font-mono"
													>
														{co.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* Zone Name */}
								<div className="space-y-2">
									<Label htmlFor="name" className="font-mono text-xs">
										ZONE NAME *
									</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) =>
											setFormData({
												...formData,
												name: e.target.value,
											})
										}
										placeholder="e.g., Zone A"
										required
										className="font-mono"
									/>
									<p className="text-xs text-muted-foreground font-mono">
										Must be unique per warehouse-company combination
									</p>
								</div>

								{/* Zone Capacity */}
								<div className="space-y-2">
									<Label
										htmlFor="capacity"
										className="font-mono text-xs"
									>
										CAPACITY
									</Label>
									<Input
										id="capacity"
										type="number"
										required
										min={1}
										value={formData.capacity}
										onChange={(e) =>
											setFormData({
												...formData,
												capacity: e.target.value,
											})
										}
										placeholder="e.g., 200"
										className="font-mono"
									/>
								</div>

								{/* Zone Description */}
								<div className="space-y-2">
									<Label
										htmlFor="description"
										className="font-mono text-xs"
									>
										DESCRIPTION
									</Label>
									<Input
										id="description"
										value={formData.description}
										onChange={(e) =>
											setFormData({
												...formData,
												description: e.target.value,
											})
										}
										placeholder="Optional zone description"
										className="font-mono"
									/>
								</div>

								<div className="flex justify-end gap-3 pt-4 border-t">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setIsCreateOpen(false);
											setEditingZone(null);
											resetForm();
										}}
										disabled={createMutation.isPending || updateMutation.isPending}
										className="font-mono"
									>
										CANCEL
									</Button>
									<Button
										type="submit"
										disabled={createMutation.isPending || updateMutation.isPending}
										className="font-mono"
									>
										{createMutation.isPending || updateMutation.isPending
											? "PROCESSING..."
											: editingZone
												? "UPDATE"
												: "CREATE"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				}
			/>

			{/* Control Panel with Relationship Filters */}
			<div className="border-b border-border bg-card px-8 py-4">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
						<Filter className="h-4 w-4" />
						FILTERS:
					</div>

					<Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
						<SelectTrigger className="w-[250px] font-mono text-sm">
							<SelectValue placeholder="All Warehouses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all" className="font-mono">
								All Warehouses
							</SelectItem>
							{warehouses.map((wh) => (
								<SelectItem
									key={wh.id}
									value={wh.id}
									className="font-mono"
								>
									{wh.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={companyFilter} onValueChange={setCompanyFilter}>
						<SelectTrigger className="w-[250px] font-mono text-sm">
							<SelectValue placeholder="All Companies" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all" className="font-mono">
								All Companies
							</SelectItem>
							{companies.map((co) => (
								<SelectItem key={co.id} value={co.id} className="font-mono">
									{co.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button
						variant={includeDeleted ? "default" : "outline"}
						size="sm"
						onClick={() => setIncludeDeleted(!includeDeleted)}
						className="gap-2 font-mono text-xs ml-auto"
					>
						<Trash2 className="h-3.5 w-3.5" />
						{includeDeleted ? "HIDE DELETED" : "SHOW DELETED"}
					</Button>
				</div>
			</div>

			{/* Data Table */}
			<div className="px-8 py-6">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="text-sm font-mono text-muted-foreground animate-pulse">
							LOADING ZONES...
						</div>
					</div>
				) : zones.length === 0 ? (
					<div className="text-center py-12 space-y-3">
						<Box className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
						<p className="font-mono text-sm text-muted-foreground">
							NO ZONES FOUND
						</p>
						<Button
							onClick={() => setIsCreateOpen(true)}
							variant="outline"
							className="font-mono text-xs"
						>
							<Plus className="h-3.5 w-3.5 mr-2" />
							CREATE FIRST ZONE
						</Button>
					</div>
				) : (
					<div className="border border-border rounded-lg overflow-hidden bg-card">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="font-mono text-xs font-bold">
										ZONE
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										WAREHOUSE
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										ASSIGNED COMPANY
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										CAPACITY
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										DESCRIPTION
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										STATUS
									</TableHead>
									<TableHead className="w-12"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{zones.map((zone, index) => (
									<TableRow
										key={zone.id}
										className="group hover:bg-muted/30 transition-colors"
										style={{
											animationDelay: `${index * 50}ms`,
										}}
									>
										<TableCell className="font-mono font-medium">
											<div className="flex items-center gap-2">
												<div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
													<Box className="h-4 w-4 text-primary" />
												</div>
												<div>
													<div className="font-bold">{zone.name}</div>
													<div className="text-xs text-muted-foreground">
														ID: {zone.id.slice(0, 8)}...
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell className="font-mono">
											<div className="flex items-center gap-2">
												<Warehouse className="h-3.5 w-3.5 text-secondary" />
												<span className="text-sm">
													{zone.warehouse?.name || "-"}
												</span>
											</div>
										</TableCell>
										<TableCell className="font-mono">
											<div className="flex items-center gap-2">
												<Building2 className="h-3.5 w-3.5 text-primary" />
												<span className="text-sm font-medium">
													{zone.company?.name || "-"}
												</span>
											</div>
										</TableCell>
										<TableCell className="font-mono">
											<span className="text-sm font-medium">
												{zone.capacity || "—"}
											</span>
										</TableCell>
										<TableCell className="font-mono text-sm text-muted-foreground max-w-xs">
											{zone.description || "—"}
										</TableCell>
										<TableCell>
											{zone.is_active ? (
												<Badge
													variant="secondary"
													className="font-mono text-xs"
												>
													DELETED
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="font-mono text-xs border-primary/30 text-primary"
												>
													ACTIVE
												</Badge>
											)}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
													>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => openEditDialog(zone)}
														className="font-mono text-xs"
													>
														<Pencil className="h-3.5 w-3.5 mr-2" />
														Edit Zone
													</DropdownMenuItem>
													{!zone.is_active && (
														<DropdownMenuItem
															onClick={() => setConfirmDelete(zone)}
															className="font-mono text-xs text-destructive"
														>
															<Trash2 className="h-3.5 w-3.5 mr-2" />
															Delete Zone
														</DropdownMenuItem>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			<div className="fixed bottom-4 right-4 font-mono text-xs text-muted-foreground/40">
				ZONE: ADMIN-ZONES · SEC-LEVEL: PMG-ADMIN
			</div>

			{/* Confirm Delete Dialog */}
			<ConfirmDialog
				open={!!confirmDelete}
				onOpenChange={(open) => !open && setConfirmDelete(null)}
				onConfirm={handleDelete}
				title="Delete Zone"
				description={`Are you sure you want to delete ${confirmDelete?.name}? This will soft-delete the zone. Assets must be relocated first.`}
				confirmText="Delete"
				cancelText="Cancel"
				variant="destructive"
			/>
		</div>
	);
}
