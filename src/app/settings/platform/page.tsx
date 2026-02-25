"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Globe,
    Mail,
    Palette,
    Sliders,
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
    usePlatformUrlDiagnostics,
    useUpdatePlatformConfig,
    type PlatformFeatures,
} from "@/lib/hooks/use-platform";
import {
    useCompanyDomains,
    useCreateCompanyDomain,
    useDeleteCompanyDomain,
    useUpdateCompanyDomain,
    useUpdatePlatformDomain,
    type CompanyDomain,
    type CreateCompanyDomainPayload,
} from "@/lib/hooks/use-company-domains";
import { useCompanies } from "@/hooks/use-companies";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

const BASE = "/operations/v1/platform";

type StrictFeatures = Required<PlatformFeatures>;

const DEFAULT_FEATURES: StrictFeatures = {
    enable_inbound_requests: true,
    show_estimate_on_order_creation: true,
    enable_kadence_invoicing: false,
};

export default function PlatformSettingsPage() {
    const qc = useQueryClient();
    const { data: platform, isLoading } = usePlatform();
    const { data: diagnostics, isLoading: diagnosticsLoading } = usePlatformUrlDiagnostics();
    const updateConfig = useUpdatePlatformConfig();
    const updatePlatformDomain = useUpdatePlatformDomain();

    const { data: companyDomains = [], isLoading: domainsLoading } = useCompanyDomains();
    const createDomain = useCreateCompanyDomain();
    const updateDomain = useUpdateCompanyDomain();
    const deleteDomain = useDeleteCompanyDomain();
    const { data: companiesData } = useCompanies();
    const companies = companiesData?.data ?? [];

    const [fromEmail, setFromEmail] = useState("");
    const [currency, setCurrency] = useState("");
    const [primaryColor, setPrimaryColor] = useState("");
    const [secondaryColor, setSecondaryColor] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [platformDomain, setPlatformDomain] = useState("");
    const [features, setFeatures] = useState<StrictFeatures>(DEFAULT_FEATURES);
    const [savingFeatures, setSavingFeatures] = useState(false);

    const [addDomainOpen, setAddDomainOpen] = useState(false);
    const [editDomain, setEditDomain] = useState<CompanyDomain | null>(null);
    const [deleteDomainId, setDeleteDomainId] = useState<string | null>(null);

    const [newDomain, setNewDomain] = useState<CreateCompanyDomainPayload>({
        company_id: "",
        hostname: "",
        type: "VANITY",
        is_verified: false,
        is_active: true,
        is_primary: false,
    });
    const [editFields, setEditFields] = useState({
        hostname: "",
        type: "VANITY" as "VANITY" | "CUSTOM",
        is_verified: false,
        is_active: true,
        is_primary: false,
    });

    useEffect(() => {
        if (!platform) return;
        setFromEmail(platform.config.from_email ?? "");
        setCurrency(platform.config.currency ?? "");
        setPrimaryColor(platform.config.primary_color ?? "");
        setSecondaryColor(platform.config.secondary_color ?? "");
        setLogoUrl(platform.config.logo_url ?? "");
        setPlatformDomain(platform.domain ?? "");
        setFeatures({
            enable_inbound_requests:
                platform.features.enable_inbound_requests ??
                DEFAULT_FEATURES.enable_inbound_requests,
            show_estimate_on_order_creation:
                platform.features.show_estimate_on_order_creation ??
                DEFAULT_FEATURES.show_estimate_on_order_creation,
            enable_kadence_invoicing:
                platform.features.enable_kadence_invoicing ??
                DEFAULT_FEATURES.enable_kadence_invoicing,
        });
    }, [platform]);

    const groupedDomains = useMemo(() => {
        const byCompany = new Map<string, CompanyDomain[]>();
        for (const domain of companyDomains) {
            const list = byCompany.get(domain.company_id) ?? [];
            list.push(domain);
            byCompany.set(domain.company_id, list);
        }
        return byCompany;
    }, [companyDomains]);

    const handleSaveConfig = () => {
        updateConfig.mutate({
            from_email: fromEmail || undefined,
            currency: currency || undefined,
            primary_color: primaryColor || undefined,
            secondary_color: secondaryColor || undefined,
            logo_url: logoUrl || undefined,
        });
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

    const openEditDialog = (domain: CompanyDomain) => {
        setEditDomain(domain);
        setEditFields({
            hostname: domain.hostname,
            type: domain.type,
            is_verified: domain.is_verified ?? false,
            is_active: domain.is_active ?? true,
            is_primary: domain.is_primary ?? false,
        });
    };

    const handleCreateDomain = () => {
        createDomain.mutate(newDomain, {
            onSuccess: () => {
                setAddDomainOpen(false);
                setNewDomain({
                    company_id: "",
                    hostname: "",
                    type: "VANITY",
                    is_verified: false,
                    is_active: true,
                    is_primary: false,
                });
                qc.invalidateQueries({ queryKey: ["platform-url-diagnostics"] });
            },
        });
    };

    const handleUpdateDomain = () => {
        if (!editDomain) return;
        updateDomain.mutate(
            { id: editDomain.id, ...editFields },
            {
                onSuccess: () => {
                    setEditDomain(null);
                    qc.invalidateQueries({ queryKey: ["platform-url-diagnostics"] });
                },
            }
        );
    };

    const handleSetPrimary = (domain: CompanyDomain) => {
        updateDomain.mutate(
            { id: domain.id, is_primary: true, is_active: true },
            {
                onSuccess: () => {
                    qc.invalidateQueries({ queryKey: ["platform-url-diagnostics"] });
                },
            }
        );
    };

    const handleDeleteDomain = () => {
        if (!deleteDomainId) return;
        deleteDomain.mutate(deleteDomainId, {
            onSuccess: () => {
                setDeleteDomainId(null);
                qc.invalidateQueries({ queryKey: ["platform-url-diagnostics"] });
            },
        });
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-4 max-w-4xl">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-52 w-full" />
                <Skeleton className="h-52 w-full" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Platform Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Runtime configuration for <span className="font-medium">{platform?.name}</span>
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-4 w-4" /> Email & Currency
                    </CardTitle>
                    <CardDescription>
                        These values are consumed directly by notifications and pricing displays.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>From Email</Label>
                        <Input
                            placeholder="notifications@platform.com"
                            value={fromEmail}
                            onChange={(e) => setFromEmail(e.target.value)}
                            type="email"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Currency</Label>
                        <Input
                            placeholder="AED"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                            maxLength={3}
                            className="w-28"
                        />
                    </div>
                </CardContent>
            </Card>

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
                            placeholder="https://cdn.example.com/logo.png"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Primary Color</Label>
                            <Input
                                placeholder="#0F172A"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Secondary Color</Label>
                            <Input
                                placeholder="#64748B"
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                    {updateConfig.isPending ? "Saving..." : "Save Config"}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Sliders className="h-4 w-4" /> Enforced Feature Flags
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        {
                            key: "enable_inbound_requests" as const,
                            label: "Enable Inbound Requests",
                            description: "Allow inbound request workflows",
                        },
                        {
                            key: "show_estimate_on_order_creation" as const,
                            label: "Show Estimate on Order Creation",
                            description: "Display estimate immediately in order creation flow",
                        },
                        {
                            key: "enable_kadence_invoicing" as const,
                            label: "Enable Kadence Invoicing",
                            description: "Enable invoice generation and payment confirmation flows",
                        },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                            <Switch
                                checked={features[item.key]}
                                onCheckedChange={(checked) =>
                                    setFeatures((prev) => ({ ...prev, [item.key]: checked }))
                                }
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4" /> Platform Domain
                    </CardTitle>
                    <CardDescription>
                        Admin and warehouse URLs are derived from this domain at runtime.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="kadence.ae"
                            value={platformDomain}
                            onChange={(e) => setPlatformDomain(e.target.value)}
                            className="font-mono"
                        />
                        <Button
                            onClick={() =>
                                updatePlatformDomain.mutate(platformDomain, {
                                    onSuccess: () =>
                                        qc.invalidateQueries({
                                            queryKey: ["platform-url-diagnostics"],
                                        }),
                                })
                            }
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

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">URL Diagnostics</CardTitle>
                    <CardDescription>
                        Resolver-backed URLs used by notifications and app routing.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {diagnosticsLoading ? (
                        <Skeleton className="h-24 w-full" />
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-md border p-3">
                                    <p className="text-xs text-muted-foreground">Admin URL</p>
                                    <p className="font-mono text-sm break-all">
                                        {diagnostics?.admin_url || "-"}
                                    </p>
                                </div>
                                <div className="rounded-md border p-3">
                                    <p className="text-xs text-muted-foreground">Warehouse URL</p>
                                    <p className="font-mono text-sm break-all">
                                        {diagnostics?.warehouse_url || "-"}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Client URL Status by Company</p>
                                {(diagnostics?.company_urls || []).length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        No company diagnostics available.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {diagnostics?.company_urls.map((row) => (
                                            <div
                                                key={row.company_id}
                                                className="flex items-center justify-between rounded-md border p-3"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {row.company_name}
                                                    </p>
                                                    <p className="font-mono text-xs text-muted-foreground break-all">
                                                        {row.client_url ||
                                                            "No active primary domain"}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        row.status === "OK"
                                                            ? "default"
                                                            : "destructive"
                                                    }
                                                    className="gap-1"
                                                >
                                                    {row.status === "OK" ? (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    ) : (
                                                        <AlertCircle className="h-3 w-3" />
                                                    )}
                                                    {row.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-base">Company Domains</CardTitle>
                        <CardDescription>
                            Client URL resolution requires one active primary domain per company.
                        </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setAddDomainOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Domain
                    </Button>
                </CardHeader>
                <CardContent>
                    {domainsLoading ? (
                        <Skeleton className="h-24 w-full" />
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
                                    <TableHead>Status</TableHead>
                                    <TableHead>Primary</TableHead>
                                    <TableHead className="w-[220px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companyDomains.map((domain) => (
                                    <TableRow key={domain.id}>
                                        <TableCell className="font-mono text-sm">
                                            {domain.hostname}
                                        </TableCell>
                                        <TableCell>{domain.company_name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{domain.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={domain.is_active ? "default" : "secondary"}
                                            >
                                                {domain.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {domain.is_primary ? (
                                                <Badge>Primary</Badge>
                                            ) : (
                                                <Badge variant="secondary">Secondary</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {!domain.is_primary && domain.is_active && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSetPrimary(domain)}
                                                    >
                                                        Set Primary
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => openEditDialog(domain)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteDomainId(domain.id)}
                                                    disabled={
                                                        (
                                                            groupedDomains.get(domain.company_id) ||
                                                            []
                                                        ).length <= 1
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
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

            <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Company Domain</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Company</Label>
                            <Select
                                value={newDomain.company_id}
                                onValueChange={(value) =>
                                    setNewDomain((prev) => ({ ...prev, company_id: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((company: any) => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Hostname</Label>
                            <Input
                                value={newDomain.hostname}
                                onChange={(e) =>
                                    setNewDomain((prev) => ({ ...prev, hostname: e.target.value }))
                                }
                                placeholder="brand.platform-domain.com"
                            />
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Select
                                value={newDomain.type}
                                onValueChange={(value: "VANITY" | "CUSTOM") =>
                                    setNewDomain((prev) => ({ ...prev, type: value }))
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
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                    checked={newDomain.is_active}
                                    onCheckedChange={(checked) =>
                                        setNewDomain((prev) => ({ ...prev, is_active: checked }))
                                    }
                                />
                                Active
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                    checked={newDomain.is_primary}
                                    onCheckedChange={(checked) =>
                                        setNewDomain((prev) => ({ ...prev, is_primary: checked }))
                                    }
                                />
                                Primary
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDomainOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateDomain}
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

            <Dialog open={!!editDomain} onOpenChange={(open) => !open && setEditDomain(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Company Domain</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Hostname</Label>
                            <Input
                                value={editFields.hostname}
                                onChange={(e) =>
                                    setEditFields((prev) => ({ ...prev, hostname: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Select
                                value={editFields.type}
                                onValueChange={(value: "VANITY" | "CUSTOM") =>
                                    setEditFields((prev) => ({ ...prev, type: value }))
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
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                    checked={editFields.is_active}
                                    onCheckedChange={(checked) =>
                                        setEditFields((prev) => ({ ...prev, is_active: checked }))
                                    }
                                />
                                Active
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                    checked={editFields.is_primary}
                                    onCheckedChange={(checked) =>
                                        setEditFields((prev) => ({ ...prev, is_primary: checked }))
                                    }
                                />
                                Primary
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDomain(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateDomain} disabled={updateDomain.isPending}>
                            {updateDomain.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!deleteDomainId}
                onOpenChange={(open) => !open && setDeleteDomainId(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Domain</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Deleting this domain may break client access and notification links.
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
