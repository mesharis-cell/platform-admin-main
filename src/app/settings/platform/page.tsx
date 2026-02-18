"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    usePlatform,
    useUpdatePlatformConfig,
    type PlatformFeatures,
} from "@/lib/hooks/use-platform";
import { Mail, Globe, Palette, Sliders, Info } from "lucide-react";
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

    useEffect(() => {
        if (!platform) return;
        setFromEmail(platform.config.from_email ?? "");
        setSupportEmail(platform.config.support_email ?? "");
        setCurrency(platform.config.currency ?? "");
        setPrimaryColor(platform.config.primary_color ?? "");
        setSecondaryColor(platform.config.secondary_color ?? "");
        setLogoUrl(platform.config.logo_url ?? "");
        setLogisticsPartnerName((platform.config as any).logistics_partner_name ?? "");
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

    if (isLoading)
        return (
            <div className="p-8 space-y-4 max-w-2xl">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );

    return (
        <div className="p-8 max-w-2xl space-y-6">
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
        </div>
    );
}
