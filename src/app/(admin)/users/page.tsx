"use client";

import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useCompanies } from "@/hooks/use-companies";
import {
	useCreateUser,
	useUpdateUser,
	useUsers
} from "@/hooks/use-users";
import { cn } from "@/lib/utils";
import { PERMISSION_GROUPS, PERMISSION_TEMPLATES, PermissionTemplate, User } from "@/types/auth";
import {
	AlertCircle,
	Ban,
	CheckCircle,
	Edit,
	Filter,
	Package,
	Search,
	UserPlus,
	Users
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";



export default function UsersManagementPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [filterTemplate, setFilterTemplate] = useState<string>("all");
	const [filterActive, setFilterActive] = useState<string>("all");

	// Create user dialog state
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [newUser, setNewUser] = useState({
		name: "",
		email: "",
		password: "",
		userType: "" as "admin" | "logistic" | "client" | "",
		permissionTemplate: "" as PermissionTemplate | "CUSTOM" | "",
		customPermissions: [] as string[],
		selectedCompany: null as string | null,
	});

	// Edit user dialog state
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [editFormData, setEditFormData] = useState({
		name: "",
		permissionTemplate: "" as PermissionTemplate | "CUSTOM" | "",
		customPermissions: [] as string[],
		selectedCompany: null as string | null,
	});

	// Build query params
	const queryParams = useMemo(() => {
		const params: Record<string, string> = {};
		if (filterTemplate !== "all")
			params.permission_template = filterTemplate;
		if (filterActive !== "all")
			params.is_active = filterActive === "active" ? "true" : "false";
		if (searchQuery) params.search_term = searchQuery;
		return params;
	}, [filterTemplate, filterActive, searchQuery]);

	// Fetch data
	const { data: usersData, isLoading: loading } = useUsers(queryParams);
	const users = usersData?.data || [];
	const { data: companiesData } = useCompanies({});
	const companies = companiesData?.data || [];

	// Mutations
	const createMutation = useCreateUser();
	const updateMutation = useUpdateUser();

	// Toggle permission
	const togglePermission = (permission: string) => {
		setNewUser(prev => ({
			...prev,
			customPermissions: prev.customPermissions.includes(permission)
				? prev.customPermissions.filter(p => p !== permission)
				: [...prev.customPermissions, permission],
		}));
	};

	// Apply company (for create)
	const handleCompanyChange = (companyId: string) => {
		setNewUser(prev => ({
			...prev,
			selectedCompany: companyId,
		}));
	};

	// Apply company (for edit)
	const handleCompanyChangeEdit = (companyId: string) => {
		setEditFormData(prev => ({
			...prev,
			selectedCompany: companyId,
		}));
	};

	// Toggle permission (for edit)
	const togglePermissionEdit = (permission: string) => {
		setEditFormData(prev => ({
			...prev,
			customPermissions: prev.customPermissions.includes(permission)
				? prev.customPermissions.filter(p => p !== permission)
				: [...prev.customPermissions, permission],
		}));
	};

	// Helper to resolve wildcards to specific permissions
	const resolvePermissions = (templatePerms: string[]) => {
		const allPermissions = Object.values(PERMISSION_GROUPS).flat();
		return allPermissions.filter(p =>
			templatePerms.includes(p) ||
			templatePerms.includes("*") ||
			templatePerms.some(tp => tp.endsWith("*") && p.startsWith(tp.replace("*", "")))
		);
	};

	// Apply template (for create)
	const handleTemplateChange = (value: string) => {
		setNewUser(prev => {
			let newCustomPermissions = prev.customPermissions;

			if (value === "CUSTOM") {
				// Populate with default permissions for the role
				const baseTemplate = prev.userType === "admin" ? "PLATFORM_ADMIN"
					: prev.userType === "logistic" ? "LOGISTICS_STAFF"
						: "CLIENT_USER";
				const templatePerms = PERMISSION_TEMPLATES[baseTemplate as PermissionTemplate].permissions;
				newCustomPermissions = resolvePermissions(templatePerms);
			} else if (value !== "") {
				// Load template permissions
				newCustomPermissions = PERMISSION_TEMPLATES[value as PermissionTemplate]?.permissions || [];
			}

			return {
				...prev,
				permissionTemplate: value as PermissionTemplate | "CUSTOM",
				customPermissions: newCustomPermissions,
			};
		});
	};

	// Apply template (for edit)
	const handleTemplateChangeEdit = (value: string) => {
		setEditFormData(prev => {
			let newCustomPermissions = prev.customPermissions;

			if (value === "CUSTOM") {
				// Populate with default permissions for the role
				const role = editingUser?.role;
				const baseTemplate = role === "ADMIN" ? "PLATFORM_ADMIN"
					: role === "LOGISTICS" ? "LOGISTICS_STAFF"
						: "CLIENT_USER";

				// Handle case where role might match multiple or mapped differently if needed, but for now simple map
				const templatePerms = PERMISSION_TEMPLATES[baseTemplate as PermissionTemplate]?.permissions || [];
				newCustomPermissions = resolvePermissions(templatePerms);
			} else if (value !== "") {
				// Load template permissions
				newCustomPermissions = PERMISSION_TEMPLATES[value as PermissionTemplate]?.permissions || [];
			}

			return {
				...prev,
				permissionTemplate: value as PermissionTemplate | "CUSTOM",
				customPermissions: newCustomPermissions,
			};
		});
	};

	// Open edit dialog
	const handleOpenEdit = (user: User) => {
		setEditingUser(user);

		// Determine if custom or template
		const isCustom = !user.permission_template ||
			!PERMISSION_TEMPLATES[user.permission_template as PermissionTemplate] ||
			JSON.stringify(user.permissions.sort()) !== JSON.stringify(PERMISSION_TEMPLATES[user.permission_template as PermissionTemplate].permissions.sort());

		setEditFormData({
			name: user.name,
			permissionTemplate: isCustom ? "CUSTOM" : (user.permission_template as PermissionTemplate),
			customPermissions: user.permissions,
			selectedCompany: user.company?.id || null,
		});
		setIsEditDialogOpen(true);
	};

	// Create user
	const handleCreateUser = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!newUser.userType) {
			toast.error("Please select user type (Admin, Logistic, or Client)");
			return;
		}

		if (newUser.userType === "admin" || newUser.userType === "logistic") {
			if (newUser.permissionTemplate === "CUSTOM" && newUser.customPermissions.length === 0) {
				toast.error("Please select at least one permission for custom user");
				return;
			}
		}

		if (newUser.userType === "client") {
			if (!newUser.selectedCompany) {
				toast.error("CLIENT_USER must belong to a company");
				return;
			}
		}

		try {
			// Build payload
			const payload: any = {
				name: newUser.name,
				email: newUser.email,
				password: newUser.password,
				role: newUser.userType === 'admin' ? 'ADMIN' : newUser.userType === 'logistic' ? 'LOGISTICS' : 'CLIENT',
				is_active: true,
			};

			// If using template
			if (newUser.permissionTemplate !== "CUSTOM") {
				payload.permission_template = newUser.permissionTemplate;
				// For companies: Use form selection
				payload.company_id = (newUser.userType === "admin" || newUser.userType === "logistic") ? null : newUser.selectedCompany;
			} else {
				// Custom permissions
				payload.permission_template = null;
				payload.permissions = newUser.customPermissions;
				payload.company_id = (newUser.userType === "admin" || newUser.userType === "logistic") ? null : newUser.selectedCompany;
			}

			await createMutation.mutateAsync(payload);
			toast.success("User created successfully");
			setIsCreateDialogOpen(false);
			// Reset form
			setNewUser({
				name: "",
				email: "",
				password: "",
				userType: "",
				permissionTemplate: "",
				customPermissions: [],
				selectedCompany: null,
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to create user");
		}
	};

	// Update user
	const handleUpdateUser = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!editingUser) return;

		// Validation
		if (!editFormData.permissionTemplate) {
			toast.error("Please select a permission template or custom");
			return;
		}

		if (editFormData.permissionTemplate === "CUSTOM" && editFormData.customPermissions.length === 0) {
			toast.error("Please select at least one permission for custom user");
			return;
		}



		try {
			// Build payload
			const payload: any = {
				name: editFormData.name,
				company_id: editFormData.selectedCompany,
			};

			// If using template
			if (editFormData.permissionTemplate !== "CUSTOM") {
				payload.permission_template = editFormData.permissionTemplate;
			} else {
				// Custom permissions
				payload.permission_template = null;
				payload.permissions = editFormData.customPermissions;
			}

			await updateMutation.mutateAsync({ userId: editingUser.id, data: payload });
			toast.success("User updated successfully");
			setIsEditDialogOpen(false);
			setEditingUser(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to update user");
		}
	};

	// Deactivate user
	const handleDeactivate = async (userId: string) => {
		try {
			await updateMutation.mutateAsync({ userId, data: { is_active: false } });
			toast.success("User deactivated successfully");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to deactivate user");
		}
	};

	// Reactivate user
	const handleReactivate = async (userId: string) => {
		try {
			await updateMutation.mutateAsync({ userId, data: { is_active: true } });
			toast.success("User reactivated successfully");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to reactivate user");
		}
	};

	console.log('editFormData.........', editFormData);

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={Users}
				title="USER MANAGEMENT"
				description="Create · Permissions · Access Control"
				stats={usersData ? { label: 'TOTAL USERS', value: usersData.meta.total } : undefined}
			/>

			{/* Main Content */}
			<main className="container mx-auto px-6 py-8">
				{/* Controls Bar */}
				<div className="flex flex-col lg:flex-row gap-4 mb-8">
					{/* Search */}
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 font-mono"
						/>
					</div>

					{/* Filters */}
					<div className="flex gap-2">
						<Select value={filterTemplate} onValueChange={setFilterTemplate}>
							<SelectTrigger className="w-[180px] font-mono">
								<SelectValue placeholder="Filter by template" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Templates</SelectItem>
								<SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
								<SelectItem value="LOGISTICS_STAFF">Logistics Staff</SelectItem>
								<SelectItem value="CLIENT_USER">Client User</SelectItem>
							</SelectContent>
						</Select>

						<Select value={filterActive} onValueChange={setFilterActive}>
							<SelectTrigger className="w-[150px] font-mono">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Create User Button */}
					<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
						<DialogTrigger asChild>
							<Button className="font-mono uppercase tracking-wider gap-2">
								<UserPlus className="h-4 w-4" />
								Create User
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-3xl max-h-[90vh]">
							<DialogHeader>
								<DialogTitle className="font-mono uppercase">
									Create New User
								</DialogTitle>
								<DialogDescription className="font-mono text-xs">
									Configure user account, permissions, and company access
								</DialogDescription>
							</DialogHeader>

							<ScrollArea className="max-h-[calc(90vh-120px)]">
								<form onSubmit={handleCreateUser} className="space-y-6 px-1">
									{/* Basic Information */}
									<div className="space-y-4">
										<h3 className="font-semibold text-sm font-mono uppercase flex items-center gap-2">
											<UserPlus className="h-4 w-4" />
											Basic Information
										</h3>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label htmlFor="name" className="font-mono uppercase text-xs">
													Full Name *
												</Label>
												<Input
													id="name"
													value={newUser.name}
													onChange={(e) =>
														setNewUser({ ...newUser, name: e.target.value })
													}
													required
													className="font-mono"
													placeholder="John Doe"
												/>
											</div>
											<div>
												<Label htmlFor="email" className="font-mono uppercase text-xs">
													Email Address *
												</Label>
												<Input
													id="email"
													type="email"
													value={newUser.email}
													onChange={(e) =>
														setNewUser({ ...newUser, email: e.target.value })
													}
													required
													className="font-mono"
													placeholder="user@company.com"
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="password" className="font-mono uppercase text-xs">
												Temporary Password *
											</Label>
											<Input
												id="password"
												type="password"
												value={newUser.password}
												onChange={(e) =>
													setNewUser({ ...newUser, password: e.target.value })
												}
												required
												minLength={8}
												className="font-mono"
												placeholder="Min 8 characters"
											/>
											<p className="text-xs text-muted-foreground mt-1 font-mono">
												User should change this password after first login
											</p>
										</div>
									</div>

									<Separator />

									{/* User Type Selector */}
									<div className="space-y-4">
										<h3 className="font-semibold text-sm font-mono uppercase flex items-center gap-2">
											<Filter className="h-4 w-4" />
											User Type
										</h3>

										<div className="grid grid-cols-3 gap-4">
											<button
												type="button"
												onClick={() => {
													setNewUser(prev => ({
														...prev,
														userType: "admin",
														// Default for Admin
														permissionTemplate: "PLATFORM_ADMIN",
														selectedCompany: null,
													}));
												}}
												className={cn(
													"p-4 border-2 rounded-lg text-left transition-all",
													newUser.userType === "admin"
														? "border-primary bg-primary/5"
														: "border-border hover:border-primary/50"
												)}
											>
												<div className="font-mono font-bold text-sm mb-1">ADMIN USER</div>
												<div className="text-xs text-muted-foreground">
													PMG Admin or A2 Staff with wildcard access
												</div>
											</button>
											<button
												type="button"
												onClick={() => {
													setNewUser(prev => ({
														...prev,
														userType: "logistic",
														// Default for Logistic
														permissionTemplate: "LOGISTICS_STAFF",
														selectedCompany: null,
													}));
												}}
												className={cn(
													"p-4 border-2 rounded-lg text-left transition-all",
													newUser.userType === "logistic"
														? "border-primary bg-primary/5"
														: "border-border hover:border-primary/50"
												)}
											>
												<div className="font-mono font-bold text-sm mb-1">LOGISTICS USER</div>
												<div className="text-xs text-muted-foreground">
													Warehouse & Inventory Staff
												</div>
											</button>
											<button
												type="button"
												onClick={() => {
													setNewUser(prev => ({
														...prev,
														userType: "client",
														permissionTemplate: "CLIENT_USER",
														selectedCompany: null,
													}));
												}}
												className={cn(
													"p-4 border-2 rounded-lg text-left transition-all",
													newUser.userType === "client"
														? "border-primary bg-primary/5"
														: "border-border hover:border-primary/50"
												)}
											>
												<div className="font-mono font-bold text-sm mb-1">CLIENT USER</div>
												<div className="text-xs text-muted-foreground">
													Company-specific user with limited access
												</div>
											</button>
										</div>
									</div>

									{newUser.userType && (
										<>
											<Separator />
											{/* Permission Configuration Section */}
											<div className="space-y-4">
												<h3 className="font-semibold text-sm font-mono uppercase flex items-center gap-2">
													<Filter className="h-4 w-4" />
													Permission Configuration
												</h3>

												<div>
													<Label htmlFor="template" className="font-mono uppercase text-xs">
														Permission Template *
													</Label>
													<Select
														key={newUser.userType}
														value={newUser.permissionTemplate}
														onValueChange={handleTemplateChange}
													>
														<SelectTrigger className="font-mono">
															<SelectValue placeholder="Select template or custom" />
														</SelectTrigger>
														<SelectContent>
															{newUser.userType === "admin" && (
																<SelectItem value="PLATFORM_ADMIN">
																	Platform Admin (Full Platform Access)
																</SelectItem>
															)}
															{newUser.userType === "logistic" && (
																<SelectItem value="LOGISTICS_STAFF">
																	Logistics Staff (Inventory & Fulfillment)
																</SelectItem>
															)}
															{newUser.userType === "client" && (
																<SelectItem value="CLIENT_USER">
																	Client User (Catalog & Ordering)
																</SelectItem>
															)}
															<SelectItem value="CUSTOM">
																Custom (Select Individual Permissions)
															</SelectItem>
														</SelectContent>
													</Select>
												</div>

												{/* Custom Permissions Selector - Only show for CUSTOM */}
												{newUser.permissionTemplate === "CUSTOM" && (
													<div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
														<div className="flex items-center justify-between">
															<Label className="font-mono uppercase text-xs">
																Select Individual Permissions *
															</Label>
															<Badge variant="outline" className="font-mono text-xs">
																{newUser.customPermissions.length} selected
															</Badge>
														</div>

														<ScrollArea className="h-[300px] pr-4">
															<div className="space-y-4">
																{Object.entries(PERMISSION_GROUPS).map(([category, permissions]) => {
																	// Filter permissions based on user role's base template
																	const baseTemplate = newUser.userType === "admin" ? "PLATFORM_ADMIN"
																		: newUser.userType === "logistic" ? "LOGISTICS_STAFF"
																			: "CLIENT_USER";

																	const allowedPermissions = PERMISSION_TEMPLATES[baseTemplate as PermissionTemplate].permissions;

																	// Only show permissions available in the base template
																	const availablePermissions = permissions.filter(p => allowedPermissions.includes(p) || allowedPermissions.includes("*") || allowedPermissions.some(ap => ap.endsWith("*") && p.startsWith(ap.replace("*", ""))));

																	if (availablePermissions.length === 0) return null;

																	return (
																		<div key={category} className="space-y-2">
																			<h4 className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">
																				{category}
																			</h4>
																			<div className="grid grid-cols-2 gap-2 ml-2">
																				{availablePermissions.map(permission => (
																					<div key={permission} className="flex items-center space-x-2">
																						<Checkbox
																							id={permission}
																							checked={newUser.customPermissions.includes(permission)}
																							onCheckedChange={() => togglePermission(permission)}
																						/>
																						<Label
																							htmlFor={permission}
																							className="text-xs font-mono cursor-pointer"
																						>
																							{permission}
																						</Label>
																					</div>
																				))}
																			</div>
																		</div>
																	);
																})}
															</div>
														</ScrollArea>

														{newUser.customPermissions.length === 0 && (
															<div className="flex items-center gap-2 text-amber-600 text-xs font-mono">
																<AlertCircle className="h-4 w-4" />
																No permissions selected - user won't be able to access anything
															</div>
														)}
													</div>
												)}
											</div>


											{/* Separator between sections */}
											<Separator />

											{/* Summary */}
											{/* Company Access - Both Admin and Client */}
											<div className="space-y-4">
												<h3 className="font-semibold text-sm font-mono uppercase flex items-center gap-2">
													<Package className="h-4 w-4" />
													Company Access Scope
												</h3>

												{(newUser.userType === "admin" || newUser.userType === "logistic") ? (
													<>
														<div className="flex items-center space-x-2">
															<Checkbox
																id="allCompanies"
																checked={true}
																disabled={true}
															/>
															<Label htmlFor="allCompanies" className="font-mono text-sm cursor-pointer">
																All Companies (*) - Full Platform Access
															</Label>
														</div>
														<p className="text-xs text-muted-foreground font-mono">
															{newUser.userType === "admin" ? "Admin" : "Logistic"} users have access to all companies by default
														</p>
													</>
												) : (
													<>
														<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
															<div className="flex items-center gap-2 text-yellow-700">
																<AlertCircle className="h-4 w-4" />
																<p className="text-xs font-mono font-semibold">
																	CLIENT_USER must belong to a company
																</p>
															</div>
														</div>
														<div className="space-y-2 border border-border rounded-lg p-4 bg-muted/30">
															<Label className="font-mono uppercase text-xs">
																Select Company *
															</Label>
															<div className="space-y-2">
																{companies.map(company => (
																	<div key={company.id} className="flex items-center space-x-2">
																		<input
																			type="radio"
																			id={`company-${company.id}`}
																			name="client-company"
																			checked={newUser.selectedCompany === company.id}
																			onChange={() => handleCompanyChange(company.id)}
																			className="h-4 w-4"
																		/>
																		<Label
																			htmlFor={`company-${company.id}`}
																			className="text-sm font-mono cursor-pointer flex-1"
																		>
																			{company.name}
																		</Label>
																	</div>
																))}
															</div>

															{companies.length === 0 && (
																<p className="text-xs text-muted-foreground font-mono italic">
																	No companies available. Create companies first.
																</p>
															)}

															{!newUser.selectedCompany && companies.length > 0 && (
																<div className="flex items-center gap-2 text-amber-600 text-xs font-mono mt-2">
																	<AlertCircle className="h-4 w-4" />
																	Please select a company
																</div>
															)}
														</div>
													</>
												)}
											</div>

											<Separator />

											{/* Summary */}
											<div className="bg-muted/50 rounded-lg p-4 border border-border">
												<h4 className="font-mono text-xs font-semibold uppercase mb-3">Configuration Summary</h4>
												<div className="space-y-2 text-xs font-mono">
													<div className="flex justify-between">
														<span className="text-muted-foreground">User Type:</span>
														<span className="font-semibold">{newUser.userType ? newUser.userType.toUpperCase() : "Not selected"}</span>
													</div>
													<div className="flex justify-between">
														<span className="text-muted-foreground">Template:</span>
														<span className="font-semibold">{newUser.permissionTemplate || "None"}</span>
													</div>
													<div className="flex justify-between">
														<span className="text-muted-foreground">Permissions:</span>
														<span className="font-semibold">
															{newUser.permissionTemplate === "CUSTOM"
																? `${newUser.customPermissions.length} custom`
																: newUser.permissionTemplate
																	? `${PERMISSION_TEMPLATES[newUser.permissionTemplate as PermissionTemplate]?.permissions.length} from template`
																	: "0"}
														</span>
													</div>
													<div className="flex justify-between">
														<span className="text-muted-foreground">Company Access:</span>
														<span className="font-semibold">
															{(newUser.userType === "admin" || newUser.userType === "logistic")
																? "All Companies (*)"
																: newUser.selectedCompany
																	? companies.find(c => c.id === newUser.selectedCompany)?.name || "Unknown"
																	: "None"}
														</span>
													</div>
												</div>
											</div>

											{/* Actions */}
											<div className="flex gap-2 pt-4">
												<Button
													type="button"
													variant="outline"
													onClick={() => setIsCreateDialogOpen(false)}
													disabled={createMutation.isPending}
													className="flex-1 font-mono"
												>
													Cancel
												</Button>
												<Button
													type="submit"
													disabled={createMutation.isPending}
													className="flex-1 font-mono uppercase tracking-wider"
												>
													{createMutation.isPending ? "Creating..." : "Create User"}
												</Button>
											</div>
										</>)}
								</form>
							</ScrollArea>
						</DialogContent>
					</Dialog>

					{/* Edit User Dialog */}
					<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
						<DialogContent className="max-w-3xl max-h-[90vh]">
							<DialogHeader>
								<DialogTitle className="font-mono uppercase">
									Edit User: {editingUser?.name}
								</DialogTitle>
								<DialogDescription className="font-mono text-xs">
									Update permissions and company access for {editingUser?.email}
								</DialogDescription>
							</DialogHeader>

							<ScrollArea className="max-h-[calc(90vh-120px)]">
								<form onSubmit={handleUpdateUser} className="space-y-6 px-1">
									{/* Basic Information */}
									<div className="space-y-4">
										<h3 className="font-semibold text-sm font-mono uppercase flex items-center gap-2">
											<UserPlus className="h-4 w-4" />
											Basic Information
										</h3>

										<div>
											<Label htmlFor="edit-name" className="font-mono uppercase text-xs">
												Full Name
											</Label>
											<Input
												id="edit-name"
												value={editFormData.name}
												onChange={(e) =>
													setEditFormData({ ...editFormData, name: e.target.value })
												}
												required
												className="font-mono"
											/>
										</div>

										<div>
											<Label className="font-mono uppercase text-xs text-muted-foreground">
												Email Address (Cannot be changed)
											</Label>
											<Input
												value={editingUser?.email || ""}
												disabled
												className="font-mono bg-muted"
											/>
										</div>
									</div>

									<Separator />

									{/* Permission Template */}
									<div className="space-y-4">
										<h3 className="font-semibold text-sm font-mono uppercase flex items-center gap-2">
											<Filter className="h-4 w-4" />
											Permission Configuration
										</h3>

										<div>
											<Label htmlFor="edit-template" className="font-mono uppercase text-xs">
												Permission Template *
											</Label>
											<Select
												value={editFormData.permissionTemplate}
												onValueChange={handleTemplateChangeEdit}
											>
												<SelectTrigger className="font-mono">
													<SelectValue placeholder="Select template or custom" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="PLATFORM_ADMIN">
														Platform Admin (Full Platform Access)
													</SelectItem>
													<SelectItem value="LOGISTICS_STAFF">
														Logistics Staff (Inventory & Fulfillment)
													</SelectItem>
													<SelectItem value="CLIENT_USER">
														Client User (Catalog & Ordering)
													</SelectItem>
													<SelectItem value="CUSTOM">
														Custom (Select Individual Permissions)
													</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{/* Show template preview */}



										{/* Custom Permissions Selector */}
										{editFormData.permissionTemplate === "CUSTOM" && (
											<div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
												<div className="flex items-center justify-between">
													<Label className="font-mono uppercase text-xs">
														Select Individual Permissions *
													</Label>
													<Badge variant="outline" className="font-mono text-xs">
														{editFormData.customPermissions.length} selected
													</Badge>
												</div>

												<ScrollArea className="h-[300px] pr-4">
													<div className="space-y-4">
														{Object.entries(PERMISSION_GROUPS).map(([category, permissions]) => {
															// Filter permissions based on user role
															const baseTemplate = editingUser?.role === "ADMIN" ? "PLATFORM_ADMIN"
																: editingUser?.role === "LOGISTICS" ? "LOGISTICS_STAFF"
																	: "CLIENT_USER";

															// Safe check if template exists
															const allowedPermissions = PERMISSION_TEMPLATES[baseTemplate as PermissionTemplate]?.permissions || [];

															// Only show permissions available in the base template
															const availablePermissions = permissions.filter(p => allowedPermissions.includes(p) || allowedPermissions.includes("*") || allowedPermissions.some(ap => ap.endsWith("*") && p.startsWith(ap.replace("*", ""))));

															if (availablePermissions.length === 0) return null;

															return (
																<div key={category} className="space-y-2">
																	<h4 className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">
																		{category}
																	</h4>
																	<div className="grid grid-cols-2 gap-2 ml-2">
																		{availablePermissions.map(permission => (
																			<div key={permission} className="flex items-center space-x-2">
																				<Checkbox
																					id={`edit-${permission}`}
																					checked={editFormData.customPermissions.includes(permission)}
																					onCheckedChange={() => togglePermissionEdit(permission)}
																				/>
																				<Label
																					htmlFor={`edit-${permission}`}
																					className="text-xs font-mono cursor-pointer"
																				>
																					{permission}
																				</Label>
																			</div>
																		))}
																	</div>
																</div>
															);
														})}
													</div>
												</ScrollArea>

												{editFormData.customPermissions.length === 0 && (
													<div className="flex items-center gap-2 text-amber-600 text-xs font-mono">
														<AlertCircle className="h-4 w-4" />
														No permissions selected - user won't be able to access anything
													</div>
												)}
											</div>
										)}
									</div>

									<Separator />

									{/* Company Access */}
									<div className="space-y-4">
										<h3 className="font-semibold text-sm font-mono uppercase flex items-center gap-2">
											<Package className="h-4 w-4" />
											Company Access Scope
										</h3>

										{/* Admin logic - always global */}
										{(editFormData.permissionTemplate === "PLATFORM_ADMIN" || editFormData.permissionTemplate === "LOGISTICS_STAFF") && (
											<div className="bg-muted/50 rounded-lg p-3 border border-border">
												<div className="flex items-center gap-2">
													<CheckCircle className="h-4 w-4 text-primary" />
													<span className="text-sm font-mono">
														Global Access (All Companies)
													</span>
												</div>
												<p className="text-xs text-muted-foreground font-mono mt-1 ml-6">
													Admin users have access to all companies by default
												</p>
											</div>
										)}

										{/* Client/Custom logic - specific company */}
										{(editFormData.permissionTemplate === "CLIENT_USER" || editFormData.permissionTemplate === "CUSTOM") && (
											<div className="space-y-2 border border-border rounded-lg p-4 bg-muted/30">
												<Label className="font-mono uppercase text-xs">
													Select Specific Company *
												</Label>
												<div className="grid grid-cols-2 gap-2">
													{companies.map(company => (
														<div key={company.id} className="flex items-center space-x-2">
															<input
																type="radio"
																id={`edit-company-${company.id}`}
																name="edit-client-company"
																checked={editFormData.selectedCompany === company.id}
																onChange={() => handleCompanyChangeEdit(company.id)}
																className="h-4 w-4"
															/>
															<Label
																htmlFor={`edit-company-${company.id}`}
																className="text-xs font-mono cursor-pointer"
															>
																{company.name}
															</Label>
														</div>
													))}
												</div>

												{!editFormData.selectedCompany && companies.length > 0 && (
													<div className="flex items-center gap-2 text-amber-600 text-xs font-mono mt-2">
														<AlertCircle className="h-4 w-4" />
														Please select a company
													</div>
												)}
											</div>
										)}
									</div>

									<Separator />

									{/* Summary */}
									<div className="bg-muted/50 rounded-lg p-4 border border-border">
										<h4 className="font-mono text-xs font-semibold uppercase mb-3">Configuration Summary</h4>
										<div className="space-y-2 text-xs font-mono">
											<div className="flex justify-between">
												<span className="text-muted-foreground">User:</span>
												<span className="font-semibold">{editingUser?.email}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-muted-foreground">Template:</span>
												<span className="font-semibold">{editFormData.permissionTemplate || "None"}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-muted-foreground">Permissions:</span>
												<span className="font-semibold">
													{editFormData.permissionTemplate === "CUSTOM"
														? `${editFormData.customPermissions.length} custom`
														: editFormData.permissionTemplate
															? `${PERMISSION_TEMPLATES[editFormData.permissionTemplate as PermissionTemplate]?.permissions.length} from template`
															: "0"}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-muted-foreground">Company Access:</span>
												<span className="font-semibold">
													{editFormData.selectedCompany
														? companies.find(c => c.id === editFormData.selectedCompany)?.name || "Unknown"
														: "All Companies (*)"}
												</span>
											</div>
										</div>
									</div>

									{/* Actions */}
									<div className="flex gap-2 pt-4">
										<Button
											type="button"
											variant="outline"
											onClick={() => setIsEditDialogOpen(false)}
											disabled={updateMutation.isPending}
											className="flex-1 font-mono"
										>
											Cancel
										</Button>
										<Button
											type="submit"
											disabled={updateMutation.isPending}
											className="flex-1 font-mono uppercase tracking-wider"
										>
											{updateMutation.isPending ? "Saving..." : "Save Changes"}
										</Button>
									</div>
								</form>
							</ScrollArea>
						</DialogContent>
					</Dialog>
				</div >

				{/* Users Table */}
				< div className="bg-card border border-border rounded-xl overflow-hidden" >
					<Table>
						<TableHeader>
							<TableRow className="border-border/50">
								<TableHead className="font-mono uppercase text-xs">
									User
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Template
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Permissions
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Company
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Status
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Last Login
								</TableHead>
								<TableHead className="font-mono uppercase text-xs text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-12">
										<p className="text-muted-foreground font-mono">
											Loading users...
										</p>
									</TableCell>
								</TableRow>
							) : users.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-12">
										<p className="text-muted-foreground font-mono">
											No users found
										</p>
									</TableCell>
								</TableRow>
							) : (
								users.map((user) => (
									<TableRow key={user.id} className="border-border/50">
										<TableCell>
											<div>
												<p className="font-mono font-semibold">{user.name}</p>
												<p className="text-xs text-muted-foreground font-mono">
													{user.email}
												</p>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline" className="font-mono text-xs border-border/50 text-muted-foreground bg-muted/10">
												{user.permission_template || "Custom"}
											</Badge>
										</TableCell>
										<TableCell>
											<span className="text-xs font-mono text-muted-foreground">
												{user.permissions.length} permissions
											</span>
										</TableCell>
										<TableCell>
											<span className="font-mono text-xs">
												{user.company
													? user.company.name
													: "-"}
											</span>
										</TableCell>
										<TableCell>
											{user.is_active ? (
												<Badge
													variant="outline"
													className="font-mono text-xs border-primary/30 text-primary"
												>
													Active
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="font-mono text-xs border-destructive/30 text-destructive"
												>
													Inactive
												</Badge>
											)}
										</TableCell>
										<TableCell>
											<span className="text-xs text-muted-foreground font-mono">
												{user.last_login_at
													? new Date(user.last_login_at).toLocaleDateString()
													: "Never"}
											</span>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => handleOpenEdit(user)}
													className="font-mono text-xs"
												>
													<Edit className="h-3 w-3 mr-1" />
													Edit
												</Button>
												{user.is_active ? (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => handleDeactivate(user.id)}
														className="font-mono text-xs"
													>
														<Ban className="h-3 w-3 mr-1" />
														Deactivate
													</Button>
												) : (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => handleReactivate(user.id)}
														className="font-mono text-xs"
													>
														<CheckCircle className="h-3 w-3 mr-1" />
														Reactivate
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div >

				{/* Summary */}
				< div className="mt-6 flex items-center justify-between text-xs text-muted-foreground font-mono" >
					<p>Total users: {users.length}</p>
					<p>
						Active: {users.filter((u) => u.is_active).length} • Inactive:{" "}
						{users.filter((u) => !u.is_active).length}
					</p>
				</div >
			</main >
		</div >
	);
}
