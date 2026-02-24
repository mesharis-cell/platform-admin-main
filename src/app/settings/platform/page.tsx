"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    usePlatform,
    useUpdatePlatformConfig,
    type PlatformFeatures,
} from "@/lib/hooks/use-platform";
import {
    useCompanyDomains,
    useCreateCompanyDomain,
    useUpdateCompanyDomain,
    useDeleteCompanyDomain,
    useUpdatePlatformDomain,
    type CompanyDomain,
    type CreateCompanyDomainPayload,
} from "@/lib/hooks/use-company-domains";
import { useCompanies } from "@/hooks/use-companies";
import {
    Mail,
    Globe,
    Palette,
    Sliders,
    Info,
    Plus,
    Pencil,
    Trash2,
    AlertTriangle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const BASE = "/operations/v1/platform";

export default function PlatformSettingsPage() {
    const { data: platform, isLoading } = usePlatform();
    const updateConfig = useUpdatePlatformConfig();
    const qc = useQueryClient();

    // Config fields
    const [fromEmail, setFromEmail] = useState("");
    const [supportEmail, setSupportEmail] = useState("");
    const [currency, setCurrency] = useState("");
    const [primaryColor, setPrimaryColor] = useState("");
    const [secondaryColor, setSecondaryColor] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [logisticsPartnerName, setLogisticsPartnerName] = useState("");

    // Feature flags
    const [features, setFeatures] = useState<Required<PlatformFeatures>>({
        collections: true,
        bulk_import: true,
        advanced_reporting: false,
        api_access: false,
    });
    const [savingFeatures, setSavingFeatures] = useState(false);

    // Domain state
    const [platformDomain, setPlatformDomain] = useState("");
    const updatePlatformDomain = useUpdatePlatformDomain();

    // Company domains
    const { data: companyDomains = [], isLoading: domainsLoading } = useCompanyDomains();
    const createDomain = useCreateCompanyDomain();
    const updateDomain = useUpdateCompanyDomain();
    const deleteDomain = useDeleteCompanyDomain();
    const { data: companiesData } = useCompanies();
    const companies = companiesData?.data ?? [];

    // Dialogs
    const [addDomainOpen, setAddDomainOpen] = useState(false);
    const [editDomain, setEditDomain] = useState<CompanyDomain | null>(null);
    const [deleteDomainId, setDeleteDomainId] = useState<string | null>(null);
    const [newDomain, setNewDomain] = useState<CreateCompanyDomainPayload>({
        company_id: "",
        hostname: "",
        type: "VANITY",
        is_verified: false,
        is_active: true,
    });
    const [editFields, setEditFields] = useState<{
        hostname: string;
        type: "VANITY" | "CUSTOM";
        is_verified: boolean;
        is_active: boolean;
    }>({
        hostname: "",
        type: "VANITY",
        is_verified: false,
        is_active: true,
    });

    useEffect(() => {
        if (!platform) return;
        setFromEmail(platform.config.from_email ?? "");
        setSupportEmail(platform.config.support_email ?? "");
        setCurrency(platform.config.currency ?? "");
        setPrimaryColor(platform.config.primary_color ?? "");
        setSecondaryColor(platform.config.secondary_color ?? "");
        setLogoUrl(platform.config.logo_url ?? "");
        setLogisticsPartnerName((platform.config as any).logistics_partner_name ?? "");
        setPlatformDomain(platform.domain ?? "");
        setFeatures({
            collections: platform.features.collections ?? true,
            bulk_import: platform.features.bulk_import ?? true,
            advanced_reporting: platform.features.advanced_reporting ?? false,
            api_access: platform.features.api_access ?? false,
        });
    }, [platform]);

    const handleSaveConfig = () => {
        updateConfig.mutate({
            from_email: fromEmail || undefined,
            support_email: supportEmail || undefined,
            currency: currency || undefined,
            primary_color: primaryColor || undefined,
            secondary_color: secondaryColor || undefined,
            logo_url: logoUrl || undefined,
            logistics_partner_name: logisticsPartnerName || undefined,
        } as any);
    };

    const handleSaveFeatures = async () => {
        setSavingFeatures(true);
        try {
            await apiClient.patch(`${BASE}/features`, features);
            toast.success("Features saved");
            qc.invalidateQueries({ queryKey: ["platform"] });
        } catch (err) {
            throwApiError(err);
        } finally {
            setSavingFeatures(false);
        }
    };

    const handleOpenEdit = (d: CompanyDomain) => {
        setEditDomain(d);
        setEditFields({
            hostname: d.hostname,
            type: d.type,
            is_verified: d.is_verified ?? false,
            is_active: d.is_active ?? true,
        });
    };

    const handleSaveEdit = () => {
        if (!editDomain) return;
        updateDomain.mutate(
            { id: editDomain.id, ...editFields },
            { onSuccess: () => setEditDomain(null) }
        );
    };

    const handleAddDomain = () => {
        createDomain.mutate(newDomain, {
            onSuccess: () => {
                setAddDomainOpen(false);
                setNewDomain({
                    company_id: "",
                    hostname: "",
                    type: "VANITY",
                    is_verified: false,
                    is_active: true,
                });
            },
        });
    };

    const handleDeleteDomain = () => {
        if (!deleteDomainId) return;
        deleteDomain.mutate(deleteDomainId, { onSuccess: () => setDeleteDomainId(null) });
    };

    if (isLoading)
        return (
            <div className="p-8 space-y-4 max-w-2xl">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );

    return (
        <div className="p-8 max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Platform Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    System-wide configuration for{" "}
                    <span className="font-medium">{platform?.name}</span>
                </p>
            </div>

            {/* Email */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-4 w-4" /> Email
                    </CardTitle>
                    <CardDescription>
                        Sender and contact email addresses for outgoing notifications.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            From Email
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    Must be a verified sender in your Resend account. If not set,
                                    emails will send from{" "}
                                    <code>no-reply@unconfigured.kadence.app</code> which will fail
                                    unless verified.
                                </TooltipContent>
                            </Tooltip>
                        </Label>
                        <Input
                            placeholder="notifications@yourdomain.com"
                            value={fromEmail}
                            onChange={(e) => setFromEmail(e.target.value)}
                            type="email"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Support Email</Label>
                        <Input
                            placeholder="support@yourdomain.com"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            type="email"
                        />
                        <p className="text-xs text-muted-foreground">
                            Shown to clients for help and contact.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Regional */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4" /> Regional & Operations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Currency</Label>
                        <Input
                            placeholder="USD"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                            maxLength={3}
                            className="w-32"
                        />
                        <p className="text-xs text-muted-foreground">
                            3-letter ISO code (e.g. USD, EUR, AED)
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Logistics Partner Name</Label>
                        <Input
                            placeholder="e.g. FedEx, Aramex"
                            value={logisticsPartnerName}
                            onChange={(e) => setLogisticsPartnerName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Displayed in client-facing logistics references.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Branding */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Palette className="h-4 w-4" /> Branding
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Logo URL</Label>
                        <Input
                            placeholder="https://cdn.yoursite.com/logo.png"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Primary Color</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="#0F172A"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                />
                                {/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor) && (
                                    <div
                                        className="h-8 w-8 rounded border shrink-0"
                                        style={{ backgroundColor: primaryColor }}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Secondary Color</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="#64748B"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                />
                                {/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(secondaryColor) && (
                                    <div
                                        className="h-8 w-8 rounded border shrink-0"
                                        style={{ backgroundColor: secondaryColor }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                    {updateConfig.isPending ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            {/* Feature Flags */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Sliders className="h-4 w-4" /> Feature Flags
                    </CardTitle>
                    <CardDescription>Toggle platform capabilities on or off.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(
                        [
                            {
                                key: "collections",
                                label: "Collections",
                                desc: "Allow grouping assets into collections",
                            },
                            {
                                key: "bulk_import",
                                label: "Bulk Import",
                                desc: "CSV/spreadsheet asset import",
                            },
                            {
                                key: "advanced_reporting",
                                label: "Advanced Reporting",
                                desc: "Extended analytics and report exports",
                            },
                            {
                                key: "api_access",
                                label: "API Access",
                                desc: "Enable external API access for this platform",
                            },
                        ] as const
                    ).map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">{label}</p>
                                <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                            <Switch
                                checked={features[key]}
                                onCheckedChange={(v) => setFeatures((f) => ({ ...f, [key]: v }))}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveFeatures} disabled={savingFeatures}>
                    {savingFeatures ? "Saving..." : "Save Features"}
                </Button>
            </div>

            {/* Domain Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4" /> Platform Domain
                    </CardTitle>
                    <CardDescription>
                        The root domain for this platform. Used to resolve admin, warehouse, and
                        client subdomains.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Changing the platform domain affects all URL resolution and company domain
                        lookups.
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="kadence.ae"
                            value={platformDomain}
                            onChange={(e) => setPlatformDomain(e.target.value)}
                            className="font-mono text-sm"
                        />
                        <Button
                            onClick={() => updatePlatformDomain.mutate(platformDomain)}
                            disabled={
                                updatePlatformDomain.isPending ||
                                platformDomain === (platform?.domain ?? "")
                            }
                        >
                            {updatePlatformDomain.isPending ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Company Domains */}
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Globe className="h-4 w-4" /> Company Domains
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Hostname mappings for client-facing company portals.
                        </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setAddDomainOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Domain
                    </Button>
                </CardHeader>
                <CardContent>
                    {domainsLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : companyDomains.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No company domains configured.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hostname</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Verified</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead className="w-20" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companyDomains.map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell className="font-mono text-sm">
                                            {d.hostname}
                                        </TableCell>
                                        <TableCell className="text-sm">{d.company_name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {d.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={d.is_verified ? "default" : "secondary"}
                                                className="text-xs"
                                            >
                                                {d.is_verified ? "Yes" : "No"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={d.is_active ? "default" : "secondary"}
                                                className="text-xs"
                                            >
                                                {d.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => handleOpenEdit(d)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteDomainId(d.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add Domain Dialog */}
            <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Company Domain</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Company</Label>
                            <Select
                                value={newDomain.company_id}
                                onValueChange={(v) =>
                                    setNewDomain((p) => ({ ...p, company_id: v }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Hostname</Label>
                            <Input
                                placeholder="pernod-ricard.kadence.ae"
                                value={newDomain.hostname}
                                onChange={(e) =>
                                    setNewDomain((p) => ({ ...p, hostname: e.target.value }))
                                }
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select
                                value={newDomain.type}
                                onValueChange={(v: "VANITY" | "CUSTOM") =>
                                    setNewDomain((p) => ({ ...p, type: v }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VANITY">
                                        VANITY — subdomain on platform domain
                                    </SelectItem>
                                    <SelectItem value="CUSTOM">
                                        CUSTOM — bring your own domain
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                    checked={newDomain.is_verified}
                                    onCheckedChange={(v) =>
                                        setNewDomain((p) => ({ ...p, is_verified: v }))
                                    }
                                />
                                Verified
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                    checked={newDomain.is_active}
                                    onCheckedChange={(v) =>
                                        setNewDomain((p) => ({ ...p, is_active: v }))
                                    }
                                />
                                Active
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDomainOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddDomain}
                            disabled={
                                createDomain.isPending ||
                                !newDomain.company_id ||
                                !newDomain.hostname
                            }
                        >
                            {createDomain.isPending ? "Adding..." : "Add Domain"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Domain Dialog */}
            <Dialog
                open={!!editDomain}
                onOpenChange={(open) => {
                    if (!open) setEditDomain(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Domain</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Hostname</Label>
                            <Input
                                value={editFields.hostname}
                                onChange={(e) =>
                                    setEditFields((p) => ({ ...p, hostname: e.target.value }))
                                }
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select
                                value={editFields.type}
                                onValueChange={(v: "VANITY" | "CUSTOM") =>
                                    setEditFields((p) => ({ ...p, type: v }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VANITY">VANITY</SelectItem>
                                    <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                    checked={editFields.is_verified}
                                    onCheckedChange={(v) =>
                                        setEditFields((p) => ({ ...p, is_verified: v }))
                                    }
                                />
                                Verified
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                    checked={editFields.is_active}
                                    onCheckedChange={(v) =>
                                        setEditFields((p) => ({ ...p, is_active: v }))
                                    }
                                />
                                Active
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDomain(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={updateDomain.isPending}>
                            {updateDomain.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog
                open={!!deleteDomainId}
                onOpenChange={(open) => {
                    if (!open) setDeleteDomainId(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Domain</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this domain? This cannot be undone and may
                        break client access.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDomainId(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteDomain}
                            disabled={deleteDomain.isPending}
                        >
                            {deleteDomain.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
