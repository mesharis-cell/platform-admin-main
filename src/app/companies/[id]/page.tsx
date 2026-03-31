"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Percent,
    Mail,
    Phone,
    ImageIcon,
    Upload,
    X,
    Sliders,
    ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useCompanies, useUpdateCompany } from "@/hooks/use-companies";
import { useUploadImage } from "@/hooks/use-assets";
import { usePlatform as usePlatformSettings } from "@/lib/hooks/use-platform";
import type { Company } from "@/types";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";

const FEATURE_FLAGS = [
    {
        key: "enable_inbound_requests",
        label: "Enable Inbound Requests",
        description: "Allow inbound request workflows",
    },
    {
        key: "show_estimate_on_order_creation",
        label: "Show Estimate on Order Creation",
        description: "Display estimate immediately in order creation flow",
    },
    {
        key: "enable_kadence_invoicing",
        label: "Enable Invoicing",
        description: "Enable invoice generation and payment confirmation flows",
    },
    {
        key: "enable_attachments",
        label: "Enable Attachments",
        description:
            "Allow typed documents across order, inbound, service request, and workflow records",
    },
    {
        key: "enable_asset_bulk_upload",
        label: "Enable Asset Bulk Upload",
        description: "Allow bulk uploading of assets via spreadsheet import",
    },
    {
        key: "enable_workflows",
        label: "Enable Internal Workflows",
        description: "Expose workflow sections, workflow inboxes, and workflow request creation",
    },
    {
        key: "enable_base_operations",
        label: "Enable Picking & Handling",
        description: "Include Picking & Handling (base operations) in pricing calculations",
    },
    {
        key: "enable_service_requests",
        label: "Enable Service Requests",
        description: "Show service requests section in client portal",
    },
    {
        key: "enable_event_calendar",
        label: "Enable Event Calendar",
        description: "Show event calendar page in client portal",
    },
    {
        key: "enable_client_stock_requests",
        label: "Enable Client Stock Requests",
        description: "Allow clients to submit new stock / inbound requests",
    },
] as const;

type FeatureOverrides = Record<string, boolean | null>;

export default function CompanyEditPage() {
    const params = useParams();
    const router = useRouter();
    const companyId = params.id as string;
    const { user } = useToken();

    const { data, isLoading } = useCompanies({ limit: "100", page: "1" });
    const { data: platformSettings } = usePlatformSettings();
    const updateMutation = useUpdateCompany();
    const uploadMutation = useUploadImage();
    const canReadWarehouseOpsRate =
        hasPermission(user, ADMIN_ACTION_PERMISSIONS.warehouseOpsRatesRead) ||
        hasPermission(user, ADMIN_ACTION_PERMISSIONS.warehouseOpsRatesUpdate);
    const canUpdateWarehouseOpsRate = hasPermission(
        user,
        ADMIN_ACTION_PERMISSIONS.warehouseOpsRatesUpdate
    );

    const companies = data?.data || [];
    const company = companies.find((c: Company) => c.id === companyId) || null;

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
            feasibility: {
                minimum_lead_hours: null as number | null,
            },
        },
        platform_margin_percent: 0.3,
        warehouse_ops_rate: null as number | null,
        vat_percent_override: null as number | null,
        contact_email: "" as string | undefined,
        contact_phone: "",
    });

    const [featureOverrides, setFeatureOverrides] = useState<FeatureOverrides>({});
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>("");
    const [initialized, setInitialized] = useState(false);

    // Populate form when company data loads
    useEffect(() => {
        if (!company || initialized) return;
        setFormData({
            name: company.name,
            domain: company.primary_domain_hostname || company.domain,
            settings: {
                branding: {
                    title: company.settings.branding.title,
                    logo_url: company.settings.branding.logo_url || undefined,
                    primary_color: company.settings.branding.primary_color,
                    secondary_color: company.settings.branding.secondary_color,
                },
                feasibility: {
                    minimum_lead_hours:
                        company.settings?.feasibility?.minimum_lead_hours !== undefined &&
                        company.settings?.feasibility?.minimum_lead_hours !== null
                            ? Number(company.settings.feasibility.minimum_lead_hours)
                            : null,
                },
            },
            platform_margin_percent: parseFloat(String(company.platform_margin_percent)),
            warehouse_ops_rate: parseFloat(String(company.warehouse_ops_rate)),
            vat_percent_override:
                company.vat_percent_override !== null && company.vat_percent_override !== undefined
                    ? parseFloat(String(company.vat_percent_override))
                    : null,
            contact_email: company.contact_email || undefined,
            contact_phone: company.contact_phone || "",
        });
        setLogoPreview(company.settings.branding.logo_url || "");

        // Initialize feature overrides from raw company override values.
        const overrides: FeatureOverrides = {};
        for (const flag of FEATURE_FLAGS) {
            const val = company.feature_overrides?.[flag.key];
            overrides[flag.key] = val === true ? true : val === false ? false : null;
        }
        setFeatureOverrides(overrides);
        setInitialized(true);
    }, [company, initialized]);

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
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleRemoveLogo = () => {
        setSelectedLogo(null);
        if (logoPreview && logoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(logoPreview);
        }
        setLogoPreview("");
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                branding: { ...formData.settings.branding, logo_url: undefined },
            },
        });
    };

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

            // Build features payload: only include non-null overrides
            const features: Record<string, boolean> = {};
            for (const [key, value] of Object.entries(featureOverrides)) {
                if (value !== null) {
                    features[key] = value;
                }
            }

            const { domain: _domain, ...updatePayload } = {
                ...formData,
                ...(canUpdateWarehouseOpsRate
                    ? {}
                    : {
                          warehouse_ops_rate: undefined,
                      }),
                settings: {
                    ...formData.settings,
                    branding: {
                        ...formData.settings.branding,
                        logo_url: logoUrl || undefined,
                    },
                },
                features,
            };

            await updateMutation.mutateAsync({
                id: companyId,
                data: updatePayload,
            });
            toast.success("Company updated", {
                description: `${formData.name} has been updated.`,
            });
        } catch (error) {
            let errorMessage = "Unknown error";
            if (error instanceof Error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                errorMessage = axiosError.response?.data?.message || error.message;
            }
            toast.error("Update failed", { description: errorMessage });
        }
    };

    const getFeatureSelectValue = (key: string): string => {
        const val = featureOverrides[key];
        if (val === true) return "enabled";
        if (val === false) return "disabled";
        return "default";
    };

    const handleFeatureChange = (key: string, value: string) => {
        setFeatureOverrides((prev) => ({
            ...prev,
            [key]: value === "enabled" ? true : value === "disabled" ? false : null,
        }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="border-b border-border bg-card">
                    <div className="mx-auto max-w-5xl px-8 py-6">
                        <Skeleton className="h-8 w-64" />
                    </div>
                </div>
                <div className="mx-auto max-w-5xl px-8 py-6 space-y-6">
                    <Skeleton className="h-52 w-full" />
                    <Skeleton className="h-52 w-full" />
                    <Skeleton className="h-52 w-full" />
                </div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="min-h-screen bg-background">
                <div className="border-b border-border bg-card">
                    <div className="mx-auto max-w-5xl px-8 py-6">
                        <Link
                            href="/companies"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Companies
                        </Link>
                        <h1 className="text-2xl font-bold font-mono tracking-tight">
                            COMPANY NOT FOUND
                        </h1>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-card">
                <div className="mx-auto max-w-5xl px-8 py-6">
                    <Link
                        href="/companies"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Companies
                    </Link>
                    <h1 className="text-2xl font-bold font-mono tracking-tight">{company.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1 font-mono">ID: {company.id}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="mx-auto max-w-5xl px-8 py-6 space-y-6">
                    {/* General */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">General</CardTitle>
                            <CardDescription>
                                Company name and domain configuration.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="font-mono text-xs">
                                    COMPANY NAME *
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="e.g., Client Company"
                                    required
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="domain" className="font-mono text-xs">
                                    PRIMARY DOMAIN (MANAGED IN SETTINGS)
                                </Label>
                                <Input
                                    id="domain"
                                    value={formData.domain}
                                    className="font-mono"
                                    disabled
                                />
                                <div className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                                    <p className="text-xs font-mono text-muted-foreground">
                                        Manage company hostnames and primary selection in Platform
                                        Settings.
                                    </p>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href="/settings/platform">
                                            Manage Domains
                                            <ArrowUpRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing & Operations */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Percent className="h-4 w-4" /> Pricing & Operations
                            </CardTitle>
                            <CardDescription>
                                Margin, rates, lead time, and VAT configuration.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="margin" className="font-mono text-xs">
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
                                    <span className="text-sm text-muted-foreground font-mono">
                                        %
                                    </span>
                                </div>
                            </div>
                            {canReadWarehouseOpsRate && (
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="warehouse_ops_rate"
                                        className="font-mono text-xs"
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
                                        disabled={!canUpdateWarehouseOpsRate}
                                        className="font-mono"
                                    />
                                    <p className="text-xs text-muted-foreground font-mono">
                                        Default rate applied to orders (2 decimal places)
                                    </p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="minimum_lead_hours" className="font-mono text-xs">
                                    LEAD TIME OVERRIDE (HOURS)
                                </Label>
                                <Input
                                    id="minimum_lead_hours"
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={
                                        formData.settings.feasibility.minimum_lead_hours === null
                                            ? ""
                                            : formData.settings.feasibility.minimum_lead_hours
                                    }
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            settings: {
                                                ...formData.settings,
                                                feasibility: {
                                                    minimum_lead_hours:
                                                        e.target.value === ""
                                                            ? null
                                                            : parseInt(e.target.value, 10),
                                                },
                                            },
                                        })
                                    }
                                    className="font-mono"
                                    placeholder="Leave empty to inherit platform lead time"
                                />
                                <p className="text-xs text-muted-foreground font-mono">
                                    Empty means inherit the platform minimum lead time.
                                    {platformSettings?.config?.feasibility?.minimum_lead_hours !==
                                        undefined &&
                                        ` Current platform default: ${platformSettings.config.feasibility.minimum_lead_hours} hours.`}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vat_percent_override" className="font-mono text-xs">
                                    VAT OVERRIDE (%)
                                </Label>
                                <Input
                                    id="vat_percent_override"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={
                                        formData.vat_percent_override === null
                                            ? ""
                                            : formData.vat_percent_override
                                    }
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            vat_percent_override:
                                                e.target.value === ""
                                                    ? null
                                                    : parseFloat(e.target.value),
                                        })
                                    }
                                    className="font-mono"
                                    placeholder="Leave empty to inherit platform VAT"
                                />
                                <p className="text-xs text-muted-foreground font-mono">
                                    Optional company-level VAT override. Empty means inherit
                                    platform VAT.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Branding */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Branding</CardTitle>
                            <CardDescription>
                                Logo, colors, and display title for the company.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">TITLE (Optional)</Label>
                                <Input
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">
                                        PRIMARY COLOR (Optional)
                                    </Label>
                                    <Input
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
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">
                                        SECONDARY COLOR (Optional)
                                    </Label>
                                    <Input
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
                        </CardContent>
                    </Card>

                    {/* Contact */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Contact</CardTitle>
                            <CardDescription>
                                Primary contact information for this company.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>

                    {/* Feature Overrides */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sliders className="h-4 w-4" /> Feature Overrides
                            </CardTitle>
                            <CardDescription>
                                Override platform-level feature flags for this company. "Platform
                                Default" inherits from the global setting.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {FEATURE_FLAGS.map((item) => (
                                <div
                                    key={item.key}
                                    className="flex items-center justify-between gap-4"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{item.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.description}
                                        </p>
                                    </div>
                                    <Select
                                        value={getFeatureSelectValue(item.key)}
                                        onValueChange={(value) =>
                                            handleFeatureChange(item.key, value)
                                        }
                                    >
                                        <SelectTrigger className="w-[180px] font-mono text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">
                                                Platform Default
                                            </SelectItem>
                                            <SelectItem value="enabled">Enabled</SelectItem>
                                            <SelectItem value="disabled">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pb-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/companies")}
                            className="font-mono"
                        >
                            CANCEL
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending || uploadMutation.isPending}
                            className="font-mono"
                        >
                            {updateMutation.isPending || uploadMutation.isPending
                                ? "SAVING..."
                                : "SAVE CHANGES"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
