"use client";

import { useState, useMemo } from "react";
import {
	useWarehouses,
	useCreateWarehouse,
	useUpdateWarehouse,
	useArchiveWarehouse,
} from "@/hooks/use-warehouses";
import {
	Plus,
	Search,
	Archive,
	Pencil,
	Warehouse,
	MapPin,
	Globe,
	MoreVertical,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin-header";
import type {
	Warehouse as WarehouseType,
	WarehouseListResponse,
} from "@/types";

export default function WarehousesPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [countryFilter, setCountryFilter] = useState("");
	const [cityFilter, setCityFilter] = useState("");
	const [includeArchived, setIncludeArchived] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingWarehouse, setEditingWarehouse] =
		useState<WarehouseType | null>(null);
	const [confirmArchive, setConfirmArchive] = useState<WarehouseType | null>(null);

	const [formData, setFormData] = useState({
		name: "",
		country: "",
		city: "",
		address: "",
		coordinates: {
			lat: undefined,
			lng: undefined,
		}
	});

	// Build query params
	const queryParams = useMemo(() => {
		const params: Record<string, string> = {
			limit: "100",
			page: "1",
		};
		if (searchQuery) params.search_term = searchQuery;
		if (countryFilter) params.country = countryFilter;
		if (cityFilter) params.city = cityFilter;
		if (includeArchived) params.include_inactive = "true";
		return params;
	}, [searchQuery, countryFilter, cityFilter, includeArchived]);

	// Fetch warehouses
	const { data, isLoading: loading } = useWarehouses(queryParams);
	const warehouses = data?.data || [];
	const total = data?.meta?.total || 0;

	// Mutations
	const createMutation = useCreateWarehouse();
	const updateMutation = useUpdateWarehouse();
	const archiveMutation = useArchiveWarehouse();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			if (editingWarehouse) {
				await updateMutation.mutateAsync({
					id: editingWarehouse.id,
					data: formData,
				});
				toast.success("Warehouse updated", {
					description: `${formData.name} in ${formData.city}, ${formData.country} has been updated.`,
				});
			} else {
				await createMutation.mutateAsync(formData);
				toast.success("Warehouse created", {
					description: `${formData.name} in ${formData.city}, ${formData.country} has been added.`,
				});
			}

			setIsCreateOpen(false);
			setEditingWarehouse(null);
			resetForm();
		} catch (error) {
			toast.error("Operation failed", {
				description:
					error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	const handleArchive = async () => {
		if (!confirmArchive) return;

		try {
			await archiveMutation.mutateAsync(confirmArchive.id);
			toast.success("Warehouse archived", {
				description: `${confirmArchive.name} has been archived.`,
			});
			setConfirmArchive(null);
		} catch (error) {
			toast.error("Archive failed");
			setConfirmArchive(null);
		}
	};

	const resetForm = () => {
		setFormData({
			name: "",
			country: "",
			city: "",
			address: "",
			coordinates: {
				lat: undefined,
				lng: undefined,
			}
		});
	};

	const openEditDialog = (warehouse: WarehouseType) => {
		setEditingWarehouse(warehouse);
		setFormData({
			name: warehouse.name,
			country: warehouse.country,
			city: warehouse.city,
			address: warehouse.address,
			coordinates: {
				lat: warehouse.coordinates?.lat || undefined,
				lng: warehouse.coordinates?.lng || undefined,
			}
		});
		setIsCreateOpen(true);
	};

	// Get unique countries and cities for filters
	const uniqueCountries = Array.from(
		new Set(warehouses.map((w) => w.country)),
	).sort();
	const uniqueCities = Array.from(
		new Set(warehouses.map((w) => w.city)),
	).sort();

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={Warehouse}
				title="WAREHOUSE REGISTRY"
				description="Physical Locations · Capacity · Operations"
				stats={{ label: 'ACTIVE FACILITIES', value: total }}
				actions={
					<Dialog
						open={isCreateOpen}
						onOpenChange={(open) => {
							setIsCreateOpen(open);
							if (!open) {
								setEditingWarehouse(null);
								resetForm();
							}
						}}
					>
						<DialogTrigger asChild>
							<Button className="gap-2 font-mono">
								<Plus className="h-4 w-4" />
								NEW FACILITY
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle className="font-mono">
									{editingWarehouse
										? "EDIT WAREHOUSE"
										: "CREATE NEW WAREHOUSE"}
								</DialogTitle>
								<DialogDescription className="font-mono text-xs">
									{editingWarehouse
										? "Update warehouse facility details"
										: "Add new storage location to network"}
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="space-y-2">
									<Label htmlFor="name" className="font-mono text-xs">
										FACILITY NAME *
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
										placeholder="e.g., Dubai Main Warehouse"
										required
										className="font-mono"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label
											htmlFor="country"
											className="font-mono text-xs flex items-center gap-2"
										>
											<Globe className="h-3 w-3" />
											COUNTRY *
										</Label>
										<Input
											id="country"
											value={formData.country}
											onChange={(e) =>
												setFormData({
													...formData,
													country: e.target.value,
												})
											}
											placeholder="United Arab Emirates"
											required
											className="font-mono"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="city"
											className="font-mono text-xs flex items-center gap-2"
										>
											<MapPin className="h-3 w-3" />
											CITY *
										</Label>
										<Input
											id="city"
											value={formData.city}
											onChange={(e) =>
												setFormData({
													...formData,
													city: e.target.value,
												})
											}
											placeholder="Dubai"
											required
											className="font-mono"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="address"
										className="font-mono text-xs"
									>
										FULL ADDRESS *
									</Label>
									<Input
										id="address"
										value={formData.address}
										onChange={(e) =>
											setFormData({
												...formData,
												address: e.target.value,
											})
										}
										placeholder="Building 123, Street Name, Area, Dubai, UAE"
										required
										className="font-mono"
									/>
								</div>

								<div className="flex items-center gap-4">
									<div className="w-full space-y-2">
										<Label
											htmlFor="latitude"
											className="font-mono text-xs"
										>
											LATITUDE
										</Label>
										<Input
											id="latitude"
											type="number"
											value={formData.coordinates?.lat?.toString()}
											onChange={(e) =>
												setFormData({
													...formData,
													coordinates: {
														lat: Number(e.target.value),
														lng: formData.coordinates?.lng || undefined,
													}
												})
											}
											className="font-mono"
										/>
									</div>

									<div className="w-full space-y-2">
										<Label
											htmlFor="longitude"
											className="font-mono text-xs"
										>
											LONGITUDE
										</Label>
										<Input
											id="longitude"
											type="number"
											value={formData.coordinates?.lng?.toString()}
											onChange={(e) =>
												setFormData({
													...formData,
													coordinates: {
														lat: Number(formData.coordinates?.lat),
														lng: Number(e.target.value),
													}
												})
											}
											className="font-mono"
										/>
									</div>
								</div>

								<div className="flex justify-end gap-3 pt-4 border-t">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setIsCreateOpen(false);
											setEditingWarehouse(null);
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
											: editingWarehouse
												? "UPDATE"
												: "CREATE"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				}
			/>

			{/* Control Panel with Geographic Filters */}
			<div className="border-b border-border bg-card px-8 py-4">
				<div className="flex items-center gap-4">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search warehouses..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 font-mono text-sm"
						/>
					</div>

					{uniqueCountries.length > 0 && (
						<select
							value={countryFilter}
							onChange={(e) => setCountryFilter(e.target.value)}
							className="h-9 px-3 rounded-md border border-input bg-background font-mono text-sm"
						>
							<option value="">All Countries</option>
							{uniqueCountries.map((country) => (
								<option key={country} value={country}>
									{country}
								</option>
							))}
						</select>
					)}

					{uniqueCities.length > 0 && (
						<select
							value={cityFilter}
							onChange={(e) => setCityFilter(e.target.value)}
							className="h-9 px-3 rounded-md border border-input bg-background font-mono text-sm"
						>
							<option value="">All Cities</option>
							{uniqueCities.map((city) => (
								<option key={city} value={city}>
									{city}
								</option>
							))}
						</select>
					)}

					<Button
						variant={includeArchived ? "default" : "outline"}
						size="sm"
						onClick={() => setIncludeArchived(!includeArchived)}
						className="gap-2 font-mono text-xs"
					>
						<Archive className="h-3.5 w-3.5" />
						{includeArchived ? "HIDE ARCHIVED" : "SHOW ARCHIVED"}
					</Button>
				</div>
			</div>

			{/* Data Table */}
			<div className="px-8 py-6">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="text-sm font-mono text-muted-foreground animate-pulse">
							LOADING NETWORK...
						</div>
					</div>
				) : warehouses.length === 0 ? (
					<div className="text-center py-12 space-y-3">
						<Warehouse className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
						<p className="font-mono text-sm text-muted-foreground">
							NO WAREHOUSES FOUND
						</p>
						<Button
							onClick={() => setIsCreateOpen(true)}
							variant="outline"
							className="font-mono text-xs"
						>
							<Plus className="h-3.5 w-3.5 mr-2" />
							CREATE FIRST WAREHOUSE
						</Button>
					</div>
				) : (
					<div className="border border-border rounded-lg overflow-hidden bg-card">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead className="font-mono text-xs font-bold">
										FACILITY
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										LOCATION
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										COORDINATES
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										ADDRESS
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										STATUS
									</TableHead>
									<TableHead className="w-12"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{warehouses.map((warehouse, index) => (
									<TableRow
										key={warehouse.id}
										className="group hover:bg-muted/30 transition-colors"
										style={{
											animationDelay: `${index * 50}ms`,
										}}
									>
										<TableCell className="font-mono font-medium">
											<div className="flex items-center gap-2">
												<div className="h-8 w-8 rounded bg-secondary/10 flex items-center justify-center">
													<Warehouse className="h-4 w-4 text-secondary" />
												</div>
												<div>
													<div className="font-bold">
														{warehouse.name}
													</div>
													<div className="text-xs text-muted-foreground">
														ID: {warehouse.id.slice(0, 8)}...
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell className="font-mono">
											<div className="space-y-1">
												<div className="flex items-center gap-2 text-sm">
													<Globe className="h-3.5 w-3.5 text-muted-foreground" />
													<span className="font-medium">
														{warehouse.country}
													</span>
												</div>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<MapPin className="h-3 w-3" />
													{warehouse.city}
												</div>
											</div>
										</TableCell>

										{/* Coordinates */}
										<TableCell className="font-mono">
											<div className="space-y-1">
												<div className="flex items-center gap-2 text-sm">
													{warehouse.coordinates?.lat ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : null}
													<span className="font-medium">
														{warehouse.coordinates?.lat}
													</span>
												</div>
												<div className="flex items-center gap-2 text-sm">
													{warehouse.coordinates?.lng ? <MapPin className="h-3.5 w-3.5" /> : null}
													{warehouse.coordinates?.lng}
												</div>
											</div>
										</TableCell>

										<TableCell className="font-mono text-sm text-muted-foreground max-w-md">
											{warehouse.address}
										</TableCell>
										<TableCell>
											{!warehouse?.is_active ? (
												<Badge
													variant="secondary"
													className="font-mono text-xs"
												>
													ARCHIVED
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="font-mono text-xs border-secondary/30 text-secondary"
												>
													OPERATIONAL
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
														onClick={() =>
															openEditDialog(warehouse)
														}
														className="font-mono text-xs"
													>
														<Pencil className="h-3.5 w-3.5 mr-2" />
														Edit Warehouse
													</DropdownMenuItem>
													{warehouse.is_active && (
														<DropdownMenuItem
															onClick={() =>
																setConfirmArchive(warehouse)
															}
															className="font-mono text-xs text-destructive"
														>
															<Archive className="h-3.5 w-3.5 mr-2" />
															Archive Warehouse
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
				ZONE: ADMIN-WAREHOUSES · SEC-LEVEL: PMG-ADMIN
			</div>

			{/* Confirm Archive Dialog */}
			<ConfirmDialog
				open={!!confirmArchive}
				onOpenChange={(open) => !open && setConfirmArchive(null)}
				onConfirm={handleArchive}
				title="Archive Warehouse"
				description={`Are you sure you want to archive ${confirmArchive?.name}? This will soft-delete the warehouse.`}
				confirmText="Archive"
				cancelText="Cancel"
				variant="destructive"
			/>
		</div>
	);
}
