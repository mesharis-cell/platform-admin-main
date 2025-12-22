"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Plus,
	Edit,
	Trash2,
	Power,
	PowerOff,
	Search,
	Filter,
	DollarSign,
	MapPin,
	Package,
} from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin-header";
import {
	usePricingTiers,
	useCreatePricingTier,
	useUpdatePricingTier,
	useTogglePricingTier,
	useDeletePricingTier,
} from "@/hooks/use-pricing-tiers";
import type {
	CreatePricingTierRequest,
	UpdatePricingTierRequest,
	PricingTier,
} from "@/types/pricing";

export default function PricingTiersPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [countryFilter, setCountryFilter] = useState<string>("all");
	const [activeFilter, setActiveFilter] = useState<string>("all");
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<PricingTier | null>(null);

	// React Query hooks
	const { data: tiersResponse, isLoading } = usePricingTiers({
		sortBy: "country",
		sortOrder: "asc",
	});
	const createTier = useCreatePricingTier();
	const updateTier = useUpdatePricingTier();
	const toggleTier = useTogglePricingTier();
	const deleteTier = useDeletePricingTier();

	const tiers = tiersResponse?.data || [];

	// Filter tiers
	const filteredTiers = tiers.filter((tier) => {
		const matchesSearch =
			searchQuery === "" ||
			tier.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
			tier.country.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesCountry =
			countryFilter === "all" || tier.country === countryFilter;

		const matchesActive =
			activeFilter === "all" ||
			(activeFilter === "active" && tier.isActive) ||
			(activeFilter === "inactive" && !tier.isActive);

		return matchesSearch && matchesCountry && matchesActive;
	});

	// Get unique countries for filter
	const uniqueCountries = Array.from(new Set(tiers.map((t) => t.country)));

	// Separate form states for create vs edit modes
	const [createFormData, setCreateFormData] = useState<CreatePricingTierRequest>({
		country: "",
		city: "",
		volumeMin: 0,
		volumeMax: 0,
		basePrice: 0,
		isActive: true,
	});

	const [editFormData, setEditFormData] = useState<UpdatePricingTierRequest>({
		volumeMin: 0,
		volumeMax: 0,
		basePrice: 0,
		isActive: true,
	});

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			await createTier.mutateAsync(createFormData);
			toast.success("Pricing tier created successfully");
			setCreateDialogOpen(false);
			// Reset create form
			setCreateFormData({
				country: "",
				city: "",
				volumeMin: 0,
				volumeMax: 0,
				basePrice: 0,
				isActive: true,
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create tier"
			);
		}
	};

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedTier) return;

		try {
			await updateTier.mutateAsync({
				id: selectedTier.id,
				data: editFormData,
			});
			toast.success("Pricing tier updated successfully");
			setEditDialogOpen(false);
			setSelectedTier(null);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update tier"
			);
		}
	};

	const handleToggle = async (id: string, isActive: boolean) => {
		try {
			await toggleTier.mutateAsync({ id, isActive: !isActive });
			toast.success(
				isActive
					? "Pricing tier deactivated"
					: "Pricing tier activated"
			);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to toggle tier"
			);
		}
	};

	const handleDelete = async () => {
		if (!confirmDelete) return;

		try {
			await deleteTier.mutateAsync(confirmDelete.id);
			toast.success("Pricing tier deleted successfully");
			setConfirmDelete(null);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete tier"
			);
			setConfirmDelete(null);
		}
	};

	const openEditDialog = (tier: PricingTier) => {
		setSelectedTier(tier);
		// Populate edit form with editable fields only (country and city are read-only)
		setEditFormData({
			volumeMin: tier.volumeMin,
			volumeMax: tier.volumeMax,
			basePrice: tier.basePrice,
			isActive: tier.isActive,
		});
		setEditDialogOpen(true);
	};

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center space-y-3">
					<div className="animate-pulse text-muted-foreground font-mono text-sm tracking-wider">
						LOADING PRICING CONFIGURATION
					</div>
					<div className="flex gap-2 justify-center">
						<div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
						<div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
						<div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={DollarSign}
				title="PRICING TIER CONFIG"
				description="Volume-Based · Location-Based · Rate Management"
				stats={{ label: 'TOTAL TIERS', value: tiers.length }}
				actions={
					<Dialog
						open={createDialogOpen}
						onOpenChange={setCreateDialogOpen}
					>
						<DialogTrigger asChild>
							<Button className="gap-2 font-mono">
								<Plus className="h-4 w-4" />
								NEW TIER
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-lg">
							<DialogHeader>
								<DialogTitle className="font-mono tracking-wide">
									CREATE PRICING TIER
								</DialogTitle>
								<DialogDescription className="font-mono text-xs">
									Define volume range and base price for specific location
								</DialogDescription>
							</DialogHeader>

							<form onSubmit={handleCreate} className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label
											htmlFor="country"
											className="font-mono text-xs tracking-wider"
										>
											COUNTRY
										</Label>
										<Input
											id="country"
											value={createFormData.country}
											onChange={(e) =>
												setCreateFormData({
													...createFormData,
													country: e.target.value,
												})
											}
											className="font-mono"
											placeholder="United Arab Emirates"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="city"
											className="font-mono text-xs tracking-wider"
										>
											CITY
										</Label>
										<Input
											id="city"
											value={createFormData.city}
											onChange={(e) =>
												setCreateFormData({
													...createFormData,
													city: e.target.value,
												})
											}
											className="font-mono"
											placeholder="Dubai"
											required
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label
											htmlFor="volumeMin"
											className="font-mono text-xs tracking-wider"
										>
											VOLUME MIN (m³)
										</Label>
										<Input
											id="volumeMin"
											type="number"
											step="0.001"
											value={createFormData.volumeMin}
											onChange={(e) =>
												setCreateFormData({
													...createFormData,
													volumeMin: parseFloat(e.target.value),
												})
											}
											className="font-mono tabular-nums"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="volumeMax"
											className="font-mono text-xs tracking-wider"
										>
											VOLUME MAX (m³)
										</Label>
										<Input
											id="volumeMax"
											type="number"
											step="0.001"
											value={createFormData.volumeMax}
											onChange={(e) =>
												setCreateFormData({
													...createFormData,
													volumeMax: parseFloat(e.target.value),
												})
											}
											className="font-mono tabular-nums"
											required
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="basePrice"
										className="font-mono text-xs tracking-wider"
									>
										BASE PRICE (AED)
									</Label>
									<Input
										id="basePrice"
										type="number"
										step="0.01"
										value={createFormData.basePrice}
										onChange={(e) =>
											setCreateFormData({
												...createFormData,
												basePrice: parseFloat(e.target.value),
											})
										}
										className="font-mono tabular-nums text-lg"
										required
									/>
								</div>

								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setCreateDialogOpen(false)}
										className="font-mono"
									>
										CANCEL
									</Button>
									<Button
										type="submit"
										disabled={createTier.isPending}
										className="font-mono"
									>
										{createTier.isPending ? "CREATING..." : "CREATE TIER"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				}
			/>

			<div className="max-w-[1600px] mx-auto p-6">
				{/* Filters Section */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 border border-border p-4 rounded-lg">
					<div className="space-y-2">
						<Label className="font-mono text-xs tracking-wider text-muted-foreground">
							<Search className="h-3 w-3 inline mr-1" />
							SEARCH
						</Label>
						<Input
							placeholder="Search city or country..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="font-mono bg-background"
						/>
					</div>

					<div className="space-y-2">
						<Label className="font-mono text-xs tracking-wider text-muted-foreground">
							<MapPin className="h-3 w-3 inline mr-1" />
							COUNTRY
						</Label>
						<Select value={countryFilter} onValueChange={setCountryFilter}>
							<SelectTrigger className="font-mono bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all" className="font-mono">
									All Countries
								</SelectItem>
								{uniqueCountries.map((country) => (
									<SelectItem
										key={country}
										value={country}
										className="font-mono"
									>
										{country}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="font-mono text-xs tracking-wider text-muted-foreground">
							<Filter className="h-3 w-3 inline mr-1" />
							STATUS
						</Label>
						<Select value={activeFilter} onValueChange={setActiveFilter}>
							<SelectTrigger className="font-mono bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all" className="font-mono">
									All Tiers
								</SelectItem>
								<SelectItem value="active" className="font-mono">
									Active Only
								</SelectItem>
								<SelectItem value="inactive" className="font-mono">
									Inactive Only
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="font-mono text-xs tracking-wider text-muted-foreground">
							RESULTS
						</Label>
						<div className="h-10 px-3 flex items-center bg-background border border-border rounded-md">
							<span className="font-mono text-sm tabular-nums">
								{filteredTiers.length} tier{filteredTiers.length !== 1 && "s"}
							</span>
						</div>
					</div>
				</div>

				{/* Pricing Tiers Table */}
				<div className="border-2 border-border rounded-lg overflow-hidden bg-card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b-2 border-border bg-muted/50">
									<th className="px-6 py-4 text-left font-mono text-xs tracking-wider text-muted-foreground font-semibold">
										LOCATION
									</th>
									<th className="px-6 py-4 text-left font-mono text-xs tracking-wider text-muted-foreground font-semibold">
										VOLUME RANGE
									</th>
									<th className="px-6 py-4 text-left font-mono text-xs tracking-wider text-muted-foreground font-semibold">
										BASE PRICE
									</th>
									<th className="px-6 py-4 text-center font-mono text-xs tracking-wider text-muted-foreground font-semibold">
										STATUS
									</th>
									<th className="px-6 py-4 text-right font-mono text-xs tracking-wider text-muted-foreground font-semibold">
										ACTIONS
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{filteredTiers.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-6 py-16 text-center text-muted-foreground font-mono text-sm"
										>
											No pricing tiers found. Create your first tier to get
											started.
										</td>
									</tr>
								) : (
									filteredTiers.map((tier, index) => (
										<tr
											key={tier.id}
											className="hover:bg-muted/30 transition-colors group"
											style={{
												animation: `fadeIn 0.4s ease-out ${index * 0.05}s backwards`,
											}}
										>
											<td className="px-6 py-4">
												<div className="space-y-1">
													<div className="font-mono font-semibold text-sm">
														{tier.city}
													</div>
													<div className="font-mono text-xs text-muted-foreground">
														{tier.country}
													</div>
												</div>
											</td>
											<td className="px-6 py-4">
												<div className="flex items-center gap-2 font-mono text-sm tabular-nums">
													<Package className="h-4 w-4 text-muted-foreground" />
													<span>
														{tier.volumeMin.toFixed(3)} - {tier.volumeMax.toFixed(3)}
													</span>
													<span className="text-muted-foreground">m³</span>
												</div>
											</td>
											<td className="px-6 py-4">
												<div className="flex items-center gap-2">
													<DollarSign className="h-4 w-4 text-primary" />
													<span className="font-mono font-bold text-lg tabular-nums">
														{tier.basePrice.toLocaleString("en-US", {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</span>
													<span className="text-muted-foreground font-mono text-xs">
														AED
													</span>
												</div>
											</td>
											<td className="px-6 py-4 text-center">
												<Badge
													variant={tier.isActive ? "default" : "secondary"}
													className="font-mono text-xs tracking-wider"
												>
													{tier.isActive ? "ACTIVE" : "INACTIVE"}
												</Badge>
											</td>
											<td className="px-6 py-4">
												<div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleToggle(tier.id, tier.isActive)}
														className="gap-1 font-mono text-xs"
													>
														{tier.isActive ? (
															<>
																<PowerOff className="h-3 w-3" />
																DISABLE
															</>
														) : (
															<>
																<Power className="h-3 w-3" />
																ENABLE
															</>
														)}
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => openEditDialog(tier)}
														className="gap-1 font-mono text-xs"
													>
														<Edit className="h-3 w-3" />
														EDIT
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setConfirmDelete(tier)}
														className="gap-1 font-mono text-xs text-destructive hover:text-destructive"
													>
														<Trash2 className="h-3 w-3" />
														DELETE
													</Button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Edit Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle className="font-mono tracking-wide">
							UPDATE PRICING TIER
						</DialogTitle>
						<DialogDescription className="font-mono text-xs">
							{selectedTier?.city}, {selectedTier?.country}
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleUpdate} className="space-y-4">
						{/* Country and City - Read-only display */}
						<div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 border border-border rounded-lg">
							<div className="space-y-1">
								<Label className="font-mono text-xs tracking-wider text-muted-foreground">
									COUNTRY (Read-only)
								</Label>
								<div className="font-mono text-sm font-semibold">
									{selectedTier?.country}
								</div>
							</div>
							<div className="space-y-1">
								<Label className="font-mono text-xs tracking-wider text-muted-foreground">
									CITY (Read-only)
								</Label>
								<div className="font-mono text-sm font-semibold">
									{selectedTier?.city}
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label
									htmlFor="edit-volumeMin"
									className="font-mono text-xs tracking-wider"
								>
									VOLUME MIN (m³)
								</Label>
								<Input
									id="edit-volumeMin"
									type="number"
									step="0.001"
									value={editFormData.volumeMin}
									onChange={(e) =>
										setEditFormData({
											...editFormData,
											volumeMin: parseFloat(e.target.value),
										})
									}
									className="font-mono tabular-nums"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="edit-volumeMax"
									className="font-mono text-xs tracking-wider"
								>
									VOLUME MAX (m³)
								</Label>
								<Input
									id="edit-volumeMax"
									type="number"
									step="0.001"
									value={editFormData.volumeMax}
									onChange={(e) =>
										setEditFormData({
											...editFormData,
											volumeMax: parseFloat(e.target.value),
										})
									}
									className="font-mono tabular-nums"
									required
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="edit-basePrice"
								className="font-mono text-xs tracking-wider"
							>
								BASE PRICE (AED)
							</Label>
							<Input
								id="edit-basePrice"
								type="number"
								step="0.01"
								value={editFormData.basePrice}
								onChange={(e) =>
									setEditFormData({
										...editFormData,
										basePrice: parseFloat(e.target.value),
									})
								}
								className="font-mono tabular-nums text-lg"
								required
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditDialogOpen(false)}
								className="font-mono"
							>
								CANCEL
							</Button>
							<Button
								type="submit"
								disabled={updateTier.isPending}
								className="font-mono"
							>
								{updateTier.isPending ? "UPDATING..." : "UPDATE TIER"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Add keyframe animation */}
			<style jsx global>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateX(-10px);
					}
					to {
						opacity: 1;
						transform: translateX(0);
					}
				}
			`}</style>
		</div>
	);
}
