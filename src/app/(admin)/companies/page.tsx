"use client";

import { useState, useMemo } from "react";
import {
    useCompanies,
    useCreateCompany,
    useUpdateCompany,
    useArchiveCompany,
    useUnarchiveCompany,
} from "@/hooks/use-companies";
import {
    Plus,
    Search,
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
import { toast } from "sonner";
import type { Company } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUploadImage } from "@/hooks/use-assets";

export default function CompaniesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [includeArchived, setIncludeArchived] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [confirmArchive, setConfirmArchive] = useState<Company | null>(null);
    const [confirmUnarchive, setConfirmUnarchive] = useState<Company | null>(null);

    // Create/Edit form state
    const [formData, setFormData] = useState({
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
        contact_email: undefined,
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
    const updateMutation = useUpdateCompany();
    const archiveMutation = useArchiveCompany();
    const unarchiveMutation = useUnarchiveCompany();
    const uploadMutation = useUploadImage();

    // Handle logo selection
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
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

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size exceeds 5MB limit");
            return;
        }

        setSelectedLogo(file);

        // Create preview URL
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
                branding: {
                    ...formData.settings.branding,
                    logo_url: undefined,
                },
            },
        });

        // Revoke object URL
        if (logoPreview && logoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(logoPreview);
        }
    };

    // Handle create/update
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Upload logo if selected
            let logoUrl = formData.settings.branding.logo_url;
            if (selectedLogo) {
                const uploadFormData = new FormData();
                uploadFormData.append("files", selectedLogo);

                const uploadResult = await uploadMutation.mutateAsync(uploadFormData);
                logoUrl = uploadResult.data?.imageUrls?.[0];
            }

            const payload = {
                ...formData,
                settings: {
                    branding: {
                        ...formData.settings.branding,
                        logo_url: logoUrl || undefined,
                    },
                },
            };

            if (editingCompany) {
                await updateMutation.mutateAsync({
                    id: editingCompany.id,
                    data: payload,
                });
                toast.success("Company updated", {
                    description: `${formData.name} has been updated.`,
                });
            } else {
                await createMutation.mutateAsync(payload);
                toast.success("Company created", {
                    description: `${formData.name} has been added to the system.`,
                });
            }

            setIsCreateOpen(false);
            setEditingCompany(null);
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
            contact_email: undefined,
            contact_phone: "",
        });
        setSelectedLogo(null);
        setLogoPreview("");
    };

    const openEditDialog = (company: Company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name,
            domain: company.domain,
            settings: {
                branding: {
                    title: company.settings.branding.title,
                    logo_url: company.settings.branding.logo_url,
                    primary_color: company.settings.branding.primary_color,
                    secondary_color: company.settings.branding.secondary_color,
                },
            },
            platform_margin_percent: parseFloat(String(company.platform_margin_percent)),
            contact_email: company.contact_email || undefined,
            contact_phone: company.contact_phone || "",
        });
        setSelectedLogo(null);
        setLogoPreview(company.settings.branding.logo_url || "");
        setIsCreateOpen(true);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Industrial Header with Grid Background */}
            <div className="border-b border-border bg-muted/30 relative overflow-hidden">
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `
							linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
							linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
						`,
                        backgroundSize: "40px 40px",
                    }}
                />
                <div className="relative px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <Building2 className="h-6 w-6 text-primary" />
                                <h1 className="text-2xl font-mono font-bold tracking-tight">
                                    COMPANY REGISTRY
                                </h1>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">
                                TENANT ENTITIES · MARGIN CONFIG · CONTACT MANAGEMENT
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-xs font-mono text-muted-foreground">
                                    TOTAL ENTITIES
                                </div>
                                <div className="text-2xl font-mono font-bold text-primary">
                                    {total.toString().padStart(3, "0")}
                                </div>
                            </div>
                            <Dialog
                                open={isCreateOpen}
                                onOpenChange={(open) => {
                                    setIsCreateOpen(open);
                                    if (!open) {
                                        setEditingCompany(null);
                                        resetForm();
                                    }
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button className="gap-2 font-mono">
                                        <Plus className="h-4 w-4" />
                                        NEW COMPANY
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[calc(100vh-10rem)] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle className="font-mono">
                                            {editingCompany ? "EDIT COMPANY" : "CREATE NEW COMPANY"}
                                        </DialogTitle>
                                        <DialogDescription className="font-mono text-xs">
                                            {editingCompany
                                                ? "Update company details and configuration"
                                                : "Add new tenant entity to the system"}
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
                                                placeholder="e.g., Pernod Ricard"
                                                required
                                                className="font-mono"
                                            />
                                        </div>

                                        {/* Domain */}
                                        <div className="space-y-2">
                                            <Label htmlFor="domain" className="font-mono text-xs">
                                                DOMAIN *
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
                                                            platform_margin_percent: parseFloat(
                                                                e.target.value
                                                            ),
                                                        })
                                                    }
                                                    className="font-mono"
                                                />
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    %
                                                </span>
                                            </div>
                                            {/* <p className="text-xs text-muted-foreground font-mono">
												Default margin applied to orders (2 decimal places)
											</p> */}
                                        </div>

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
                                                    value={formData.contact_email}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            contact_email: e.target.value,
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
                                                    value={
                                                        formData.settings.branding.secondary_color
                                                    }
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
                                                    setEditingCompany(null);
                                                    resetForm();
                                                }}
                                                disabled={
                                                    createMutation.isPending ||
                                                    updateMutation.isPending
                                                }
                                                className="font-mono"
                                            >
                                                CANCEL
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    createMutation.isPending ||
                                                    updateMutation.isPending
                                                }
                                                className="font-mono"
                                            >
                                                {createMutation.isPending ||
                                                updateMutation.isPending
                                                    ? "PROCESSING..."
                                                    : editingCompany
                                                      ? "UPDATE"
                                                      : "CREATE"}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            {/* Control Panel */}
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search companies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 font-mono text-sm"
                        />
                    </div>

                    {/* Archive Toggle */}
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
                            LOADING REGISTRY...
                        </div>
                    </div>
                ) : companies.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="font-mono text-sm text-muted-foreground">
                            NO COMPANIES FOUND
                        </p>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            variant="outline"
                            className="font-mono text-xs"
                        >
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            CREATE FIRST COMPANY
                        </Button>
                    </div>
                ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50">
                                    <TableHead className="font-mono text-xs font-bold">
                                        COMPANY
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        DOMAIN
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold text-right">
                                        PLATFORM MARGIN PERCENT
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        CONTACT
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        STATUS
                                    </TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companies.map((company, index) => (
                                    <TableRow
                                        key={company.id}
                                        className="group hover:bg-muted/30 transition-colors border-border/50"
                                        style={{
                                            animationDelay: `${index * 50}ms`,
                                        }}
                                    >
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
                                                                {company.name
                                                                    .substring(0, 2)
                                                                    .toUpperCase()}
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
                                            {company.domain || "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* <Percent className="h-3.5 w-3.5 text-primary" /> */}
                                                <span className="font-mono font-bold text-primary">
                                                    {parseFloat(
                                                        String(company.platform_margin_percent)
                                                    ).toFixed(2)}
                                                    %
                                                </span>
                                            </div>
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
                                                <span className="text-muted-foreground">—</span>
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
                                                        onClick={() => openEditDialog(company)}
                                                        className="font-mono text-xs"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5 mr-2" />
                                                        Edit Company
                                                    </DropdownMenuItem>
                                                    {company.deleted_at ? (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setConfirmUnarchive(company)
                                                            }
                                                            className="font-mono text-xs text-primary"
                                                        >
                                                            <Undo2 className="h-3.5 w-3.5 mr-2" />
                                                            Unarchive Company
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setConfirmArchive(company)
                                                            }
                                                            className="font-mono text-xs text-destructive"
                                                        >
                                                            <Archive className="h-3.5 w-3.5 mr-2" />
                                                            Archive Company
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
