"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    useCompanies,
    useCreateCompany,
    useArchiveCompany,
    useUnarchiveCompany,
} from "@/hooks/use-companies";
import {
    Plus,
    Archive,
    Pencil,
    Percent,
    Building2,
    Mail,
    Phone,
    MoreVertical,
    Upload,
    X,
    ImageIcon,
    Undo2,
} from "lucide-react";
import { DataTable, DataTableSearch, DataTableRow } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { TableCell } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Company } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUploadImage } from "@/hooks/use-assets";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { AdminHeader } from "@/components/admin-header";

export default function CompaniesPage() {
    const { user } = useToken();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [includeArchived, setIncludeArchived] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [confirmArchive, setConfirmArchive] = useState<Company | null>(null);
    const [confirmUnarchive, setConfirmUnarchive] = useState<Company | null>(null);
    const canCreateCompany = hasPermission(user, ADMIN_ACTION_PERMISSIONS.companiesCreate);
    const canUpdateCompany = hasPermission(user, ADMIN_ACTION_PERMISSIONS.companiesUpdate);
    const canArchiveCompany = hasPermission(user, ADMIN_ACTION_PERMISSIONS.companiesArchive);
    const canReadWarehouseOpsRate =
        hasPermission(user, ADMIN_ACTION_PERMISSIONS.warehouseOpsRatesRead) ||
        hasPermission(user, ADMIN_ACTION_PERMISSIONS.warehouseOpsRatesUpdate);
    const canUpdateWarehouseOpsRate = hasPermission(
        user,
        ADMIN_ACTION_PERMISSIONS.warehouseOpsRatesUpdate
    );
    const canManageCompanies = canUpdateCompany || canArchiveCompany;

    // Create form state. NOTE: lead-time overrides (minimum_lead_hours,
    // sp_minimum_lead_hours) are not exposed on the create form — they
    // live on the edit page and default to platform values otherwise. Don't
    // seed them here as `null`; the API schema is `.number().optional()`
    // and rejects `null`, surfacing as "Lead time override should be a
    // number" on submit.
    const [formData, setFormData] = useState({
        name: "",
        domain: "",
        settings: {
            branding: {
                title: "",
                logo_url: undefined as string | undefined,
                primary_color: "",
                secondary_color: "",
            },
        },
        platform_margin_percent: 0.3,
        warehouse_ops_rate: null as number | null,
        vat_percent_override: null as number | null,
        contact_email: undefined as string | undefined,
        contact_phone: "",
    });

    // Logo upload state
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>("");

    // Build query params
    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            limit: "100",
            page: "1",
        };
        if (searchQuery) params.search_term = searchQuery;
        if (includeArchived) params.include_deleted = "true";
        return params;
    }, [searchQuery, includeArchived]);

    // Fetch companies
    const { data, isLoading: loading } = useCompanies(queryParams);
    const companies = data?.data || [];
    const total = data?.meta.total || 0;

    // Mutations
    const createMutation = useCreateCompany();
    const archiveMutation = useArchiveCompany();
    const unarchiveMutation = useUnarchiveCompany();
    const uploadMutation = useUploadImage();

    // Handle logo selection
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = [
            "image/png",
            "image/jpg",
            "image/jpeg",
            "image/webp",
            "image/svg+xml",
        ];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Invalid file type. Please upload PNG, JPG, WebP, or SVG");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size exceeds 5MB limit");
            return;
        }

        setSelectedLogo(file);
        const previewUrl = URL.createObjectURL(file);
        setLogoPreview(previewUrl);
    };

    // Handle logo removal
    const handleRemoveLogo = () => {
        setSelectedLogo(null);
        setLogoPreview("");
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                branding: {
                    ...formData.settings.branding,
                    logo_url: undefined,
                },
            },
        });

        if (logoPreview && logoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(logoPreview);
        }
    };

    // Handle create
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let logoUrl = formData.settings.branding.logo_url;
            if (selectedLogo) {
                const uploadResult = await uploadMutation.mutateAsync({
                    files: [selectedLogo],
                    profile: "logo",
                });
                logoUrl = uploadResult.data?.imageUrls?.[0];
            }

            // Schema: warehouse_ops_rate is `.number().min(0).optional()` —
            // accepts undefined but NOT null. The input wires `null` when
            // cleared, so coerce to undefined before sending. (vat_percent_
            // override is `.nullable().optional()` server-side, so null is
            // legal there.)
            const sanitizedWarehouseOpsRate = canUpdateWarehouseOpsRate
                ? (formData.warehouse_ops_rate ?? undefined)
                : undefined;

            const payload = {
                ...formData,
                warehouse_ops_rate: sanitizedWarehouseOpsRate,
                settings: {
                    ...formData.settings,
                    branding: {
                        ...formData.settings.branding,
                        logo_url: logoUrl || undefined,
                    },
                },
            };

            await createMutation.mutateAsync(payload);
            toast.success("Company created", {
                description: `${formData.name} has been added to the system.`,
            });

            setIsCreateOpen(false);
            resetForm();
        } catch (error) {
            let errorMessage = "Unknown error";
            if (error instanceof Error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                errorMessage = axiosError.response?.data?.message || error.message;
            }
            toast.error("Operation failed", {
                description: errorMessage,
            });
        }
    };

    // Handle archive
    const handleArchive = async () => {
        if (!confirmArchive) return;

        try {
            await archiveMutation.mutateAsync(confirmArchive.id);
            toast.success("Company archived", {
                description: `${confirmArchive.name} has been archived.`,
            });
            setConfirmArchive(null);
        } catch (error) {
            toast.error("Archive failed");
            setConfirmArchive(null);
        }
    };

    // Handle unarchive
    const handleUnarchive = async () => {
        if (!confirmUnarchive) return;

        try {
            await unarchiveMutation.mutateAsync(confirmUnarchive.id);
            toast.success("Company restored", {
                description: `${confirmUnarchive.name} has been restored.`,
            });
            setConfirmUnarchive(null);
        } catch (error) {
            toast.error("Restore failed");
            setConfirmUnarchive(null);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            domain: "",
            settings: {
                branding: {
                    title: "",
                    logo_url: undefined,
                    primary_color: "",
                    secondary_color: "",
                },
            },
            platform_margin_percent: 0.3,
            warehouse_ops_rate: null,
            vat_percent_override: null,
            contact_email: undefined,
            contact_phone: "",
        });
        setSelectedLogo(null);
        setLogoPreview("");
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Building2}
                title="COMPANY REGISTRY"
                description="Client Companies · Configuration · Overrides"
                stats={{ label: "TOTAL COMPANIES", value: total }}
                actions={
                    canCreateCompany ? (
                        <Button className="gap-2 font-mono" onClick={() => setIsCreateOpen(true)}>
                            <Plus className="h-4 w-4" />
                            NEW COMPANY
                        </Button>
                    ) : undefined
                }
            />

            {/* Create Company Dialog */}
            <Dialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) resetForm();
                }}
            >
                <DialogContent className="max-w-2xl max-h-[calc(100vh-10rem)] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-mono">CREATE NEW COMPANY</DialogTitle>
                        <DialogDescription className="font-mono text-xs">
                            Add new tenant entity to the system
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Company Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="font-mono text-xs">
                                COMPANY NAME *
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
                                placeholder="e.g., Client Company"
                                required
                                className="font-mono"
                            />
                        </div>

                        {/* Initial Primary Domain */}
                        <div className="space-y-2">
                            <Label htmlFor="domain" className="font-mono text-xs">
                                INITIAL PRIMARY DOMAIN *
                            </Label>
                            <Input
                                id="domain"
                                value={formData.domain}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        domain: e.target.value,
                                    })
                                }
                                placeholder="client, custom.com, sub.custom.com"
                                className="font-mono"
                                required
                            />
                        </div>

                        {/* Platform Margin */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="margin"
                                className="font-mono text-xs flex items-center gap-2"
                            >
                                <Percent className="h-3 w-3" />
                                PLATFORM MARGIN PERCENT
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="margin"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.platform_margin_percent}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            platform_margin_percent: parseFloat(e.target.value),
                                        })
                                    }
                                    className="font-mono"
                                />
                                <span className="text-sm text-muted-foreground font-mono">%</span>
                            </div>
                        </div>

                        {canUpdateWarehouseOpsRate && (
                            <div className="space-y-2">
                                <Label
                                    htmlFor="warehouse_ops_rate"
                                    className="font-mono text-xs flex items-center gap-2"
                                >
                                    WAREHOUSE OPS RATE
                                </Label>
                                <Input
                                    id="warehouse_ops_rate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.warehouse_ops_rate ?? ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            warehouse_ops_rate:
                                                e.target.value === ""
                                                    ? null
                                                    : parseFloat(e.target.value),
                                        })
                                    }
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground font-mono">
                                    Default rate applied to orders (2 decimal places)
                                </p>
                            </div>
                        )}

                        {/* Contact Information */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="email"
                                    className="font-mono text-xs flex items-center gap-2"
                                >
                                    <Mail className="h-3 w-3" />
                                    CONTACT EMAIL
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.contact_email ?? ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            contact_email: e.target.value || undefined,
                                        })
                                    }
                                    placeholder="contact@company.com"
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="phone"
                                    className="font-mono text-xs flex items-center gap-2"
                                >
                                    <Phone className="h-3 w-3" />
                                    CONTACT PHONE
                                </Label>
                                <Input
                                    id="phone"
                                    value={formData.contact_phone}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            contact_phone: e.target.value,
                                        })
                                    }
                                    placeholder="+971-50-123-4567"
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        <div className="px-2 py-2">
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-muted-foreground tracking-[0.2em] uppercase">
                                    Brand Settings
                                </span>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                        </div>

                        {/* Settings */}
                        <div className="space-y-6">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label className="font-mono text-xs flex items-center gap-2">
                                    TITLE (Optional)
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.settings.branding.title}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            settings: {
                                                ...formData.settings,
                                                branding: {
                                                    ...formData.settings.branding,
                                                    title: e.target.value,
                                                },
                                            },
                                        })
                                    }
                                    placeholder="Company title"
                                />
                            </div>

                            {/* Primary color */}
                            <div className="space-y-2">
                                <Label className="font-mono text-xs flex items-center gap-2">
                                    PRIMARY COLOR (Optional)
                                </Label>
                                <Input
                                    id="primary-color"
                                    value={formData.settings.branding.primary_color}
                                    type="color"
                                    className="size-14 border-none p-0"
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            settings: {
                                                ...formData.settings,
                                                branding: {
                                                    ...formData.settings.branding,
                                                    primary_color: e.target.value,
                                                },
                                            },
                                        })
                                    }
                                />
                            </div>

                            {/* Secondary color */}
                            <div className="space-y-2">
                                <Label className="font-mono text-xs flex items-center gap-2">
                                    SECONDARY COLOR (Optional)
                                </Label>
                                <Input
                                    id="secondary-color"
                                    value={formData.settings.branding.secondary_color}
                                    type="color"
                                    className="size-14 border-none p-0"
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            settings: {
                                                ...formData.settings,
                                                branding: {
                                                    ...formData.settings.branding,
                                                    secondary_color: e.target.value,
                                                },
                                            },
                                        })
                                    }
                                />
                            </div>

                            {/* Company Logo */}
                            <div className="space-y-2">
                                <Label className="font-mono text-xs flex items-center gap-2">
                                    <ImageIcon className="h-3 w-3" />
                                    COMPANY LOGO (Optional)
                                </Label>

                                {logoPreview ? (
                                    <div className="relative group border-2 border-border rounded-lg p-4 bg-muted/30">
                                        <div className="flex items-center gap-4">
                                            <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-border bg-background shrink-0">
                                                <img
                                                    src={logoPreview}
                                                    alt="Company logo"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-mono font-semibold">
                                                    Logo uploaded
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                                    {selectedLogo
                                                        ? selectedLogo.name
                                                        : "Current logo"}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRemoveLogo}
                                                className="shrink-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                                        <input
                                            type="file"
                                            id="logo-upload"
                                            accept="image/png,image/jpg,image/jpeg,image/webp,image/svg+xml"
                                            onChange={handleLogoSelect}
                                            className="hidden"
                                            multiple={false}
                                        />
                                        <label
                                            htmlFor="logo-upload"
                                            className="cursor-pointer flex flex-col items-center"
                                        >
                                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-sm font-mono text-muted-foreground">
                                                Click to upload logo
                                            </span>
                                            <span className="text-xs font-mono text-muted-foreground mt-1">
                                                PNG, JPG, WebP, SVG (max 5MB)
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsCreateOpen(false);
                                    resetForm();
                                }}
                                disabled={createMutation.isPending}
                                className="font-mono"
                            >
                                CANCEL
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="font-mono"
                            >
                                {createMutation.isPending ? "PROCESSING..." : "CREATE"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <DataTable
                filters={
                    <>
                        <DataTableSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search companies..."
                        />
                        <Button
                            variant={includeArchived ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIncludeArchived(!includeArchived)}
                            className="gap-2 font-mono text-xs"
                        >
                            <Archive className="h-3.5 w-3.5" />
                            {includeArchived ? "HIDE ARCHIVED" : "SHOW ARCHIVED"}
                        </Button>
                    </>
                }
                columns={[
                    "COMPANY",
                    "PRIMARY DOMAIN",
                    { label: "PLATFORM MARGIN PERCENT", className: "text-right" },
                    ...(canReadWarehouseOpsRate
                        ? ([{ label: "WAREHOUSE OPS RATE", className: "text-right" }] as const)
                        : []),
                    { label: "VAT OVERRIDE", className: "text-right" },
                    "CONTACT",
                    "STATUS",
                    { label: "", className: "w-12" },
                ]}
                loading={loading}
                hasData={companies.length > 0}
                empty={{
                    icon: Building2,
                    message: "NO COMPANIES FOUND",
                    action: canCreateCompany ? (
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            variant="outline"
                            className="font-mono text-xs"
                        >
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            CREATE FIRST COMPANY
                        </Button>
                    ) : undefined,
                }}
            >
                {companies.map((company, index) => (
                    <DataTableRow key={company.id} index={index}>
                        <TableCell className="font-mono font-medium">
                            <div className="flex items-center gap-2">
                                <div className="h-10 w-10 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center shrink-0">
                                    {company.settings.branding.logo_url ? (
                                        <img
                                            src={company.settings.branding.logo_url}
                                            alt={`${company.name} logo`}
                                            className="w-full h-full object-contain p-1"
                                        />
                                    ) : (
                                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                            <span className="text-xs font-mono font-bold text-primary">
                                                {company.name.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold">{company.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        ID: {company.id.slice(0, 8)}...
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground max-w-xs">
                            {company.primary_domain_hostname || company.domain || "\u2014"}
                        </TableCell>
                        <TableCell className="text-center">
                            <span className="font-mono font-bold text-primary">
                                {parseFloat(String(company.platform_margin_percent)).toFixed(2)}%
                            </span>
                        </TableCell>
                        {canReadWarehouseOpsRate && (
                            <TableCell className="text-center">
                                <span className="font-mono font-bold text-primary">
                                    {parseFloat(String(company.warehouse_ops_rate)).toFixed(2)}
                                </span>
                            </TableCell>
                        )}
                        <TableCell className="text-center">
                            <span className="font-mono font-bold text-primary">
                                {company.vat_percent_override !== null &&
                                company.vat_percent_override !== undefined
                                    ? `${parseFloat(String(company.vat_percent_override)).toFixed(2)}%`
                                    : "Inherited"}
                            </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                            {company.contact_email || company.contact_phone ? (
                                <div className="space-y-1">
                                    {company.contact_email && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                            {company.contact_email}
                                        </div>
                                    )}
                                    {company.contact_phone && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                            {company.contact_phone}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className="text-muted-foreground">\u2014</span>
                            )}
                        </TableCell>
                        <TableCell>
                            {company.deleted_at ? (
                                <Badge
                                    variant="outline"
                                    className="font-mono text-xs border-destructive/30 text-destructive"
                                >
                                    ARCHIVED
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
                            {canManageCompanies ? (
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
                                        {canUpdateCompany && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    router.push(`/companies/${company.id}`)
                                                }
                                                className="font-mono text-xs"
                                            >
                                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                                Edit Company
                                            </DropdownMenuItem>
                                        )}
                                        {canArchiveCompany &&
                                            (company.deleted_at ? (
                                                <DropdownMenuItem
                                                    onClick={() => setConfirmUnarchive(company)}
                                                    className="font-mono text-xs text-primary"
                                                >
                                                    <Undo2 className="h-3.5 w-3.5 mr-2" />
                                                    Unarchive Company
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    onClick={() => setConfirmArchive(company)}
                                                    className="font-mono text-xs text-destructive"
                                                >
                                                    <Archive className="h-3.5 w-3.5 mr-2" />
                                                    Archive Company
                                                </DropdownMenuItem>
                                            ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                            )}
                        </TableCell>
                    </DataTableRow>
                ))}
            </DataTable>

            {/* Footer with zone marker */}
            <div className="fixed bottom-4 right-4 font-mono text-xs text-muted-foreground/40">
                ZONE: ADMIN-COMPANIES · SEC-LEVEL: Platform-ADMIN
            </div>

            {/* Confirm Archive Dialog */}
            <ConfirmDialog
                open={!!confirmArchive}
                onOpenChange={(open) => !open && setConfirmArchive(null)}
                onConfirm={handleArchive}
                title="Archive Company"
                description={`Are you sure you want to archive ${confirmArchive?.name}? This will soft-delete the company.`}
                confirmText="Archive"
                cancelText="Cancel"
                variant="destructive"
            />

            {/* Confirm Unarchive Dialog */}
            <ConfirmDialog
                open={!!confirmUnarchive}
                onOpenChange={(open) => !open && setConfirmUnarchive(null)}
                onConfirm={handleUnarchive}
                title="Unarchive Company"
                description={`Are you sure you want to restore ${confirmUnarchive?.name}?`}
                confirmText="Unarchive"
                cancelText="Cancel"
            />
        </div>
    );
}
