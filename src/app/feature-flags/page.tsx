"use client";

import { useState, useMemo } from "react";
import { useCompanies, useUpdateCompany } from "@/hooks/use-companies";
import { Search, Building2, Mail, Phone, ChevronDown, Settings, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function FeatureFlagsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    // Feature flags state
    const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
    const [editingFeatures, setEditingFeatures] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Build query params
    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            limit: "100",
            page: "1",
        };
        if (searchQuery) params.search_term = searchQuery;
        return params;
    }, [searchQuery]);

    // Fetch companies
    const { data, isLoading: loading } = useCompanies(queryParams);
    const companies = data?.data || [];
    const total = data?.meta.total || 0;

    // Mutations
    const updateMutation = useUpdateCompany();

    // Handle expand row
    const handleExpandRow = (companyId: string, currentFeatures: Record<string, boolean>) => {
        if (expandedCompanyId === companyId) {
            setExpandedCompanyId(null);
            setEditingFeatures({});
        } else {
            setExpandedCompanyId(companyId);
            setEditingFeatures(currentFeatures || {});
        }
    };

    // Handle feature toggle
    const handleToggleFeature = (featureId: string) => {
        setEditingFeatures((prev) => ({
            ...prev,
            [featureId]: !prev[featureId],
        }));
    };

    // Handle save features
    const handleSaveFeatures = async (companyId: string) => {
        try {
            setIsSaving(true);
            await updateMutation.mutateAsync({
                id: companyId,
                data: { features: editingFeatures },
            });
            toast.success("Feature flags updated successfully");
            setExpandedCompanyId(null);
            setEditingFeatures({});
        } catch (error) {
            toast.error("Failed to update feature flags");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
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
                                    <TableHead className="font-mono text-xs font-bold text-right">
                                        WAREHOUSE OPS RATE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        STATUS
                                    </TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companies.map((company, index) => (
                                    <>
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
                                                                src={
                                                                    company.settings.branding
                                                                        .logo_url
                                                                }
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
                                                        <div className="font-bold">
                                                            {company.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            ID: {company.id.slice(0, 8)}...
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-muted-foreground max-w-xs">
                                                {company.domain || "—"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-mono font-bold text-primary">
                                                    {parseFloat(
                                                        String(company.platform_margin_percent)
                                                    ).toFixed(2)}
                                                    %
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-mono font-bold text-primary">
                                                    {parseFloat(
                                                        String(company.warehouse_ops_rate)
                                                    ).toFixed(2)}
                                                </span>
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleExpandRow(
                                                            company.id,
                                                            company.features
                                                        )
                                                    }
                                                >
                                                    <ChevronDown
                                                        className={`h-4 w-4 text-muted-foreground transition-transform ${expandedCompanyId === company.id ? "rotate-180" : ""}`}
                                                    />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {expandedCompanyId === company.id && (
                                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                                                <TableCell colSpan={7} className="p-0">
                                                    <div className="p-4 border-b border-border">
                                                        <div className="bg-background border border-border rounded-lg p-4 shadow-inner">
                                                            <h3 className="text-sm font-mono font-bold mb-4 flex items-center gap-2">
                                                                <Settings className="w-4 h-4 text-primary" />
                                                                FEATURE FLAG CONFIGURATION
                                                            </h3>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                                {Object.entries(
                                                                    company.features
                                                                ).map(([featureId, enabled]) => (
                                                                    <div
                                                                        key={featureId}
                                                                        className="flex items-center gap-2 p-2 border border-border rounded hover:bg-muted/50 transition-colors"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`feature-${company.id}-${featureId}`}
                                                                            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                                                            checked={
                                                                                editingFeatures[
                                                                                    featureId
                                                                                ] || false
                                                                            }
                                                                            onChange={() =>
                                                                                handleToggleFeature(
                                                                                    featureId
                                                                                )
                                                                            }
                                                                        />
                                                                        <label
                                                                            htmlFor={`feature-${company.id}-${featureId}`}
                                                                            className="text-sm font-mono cursor-pointer select-none flex-1"
                                                                        >
                                                                            {featureId}
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        setExpandedCompanyId(null)
                                                                    }
                                                                    disabled={isSaving}
                                                                    className="font-mono"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleSaveFeatures(
                                                                            company.id
                                                                        )
                                                                    }
                                                                    disabled={isSaving}
                                                                    className="font-mono"
                                                                >
                                                                    {isSaving ? (
                                                                        <>
                                                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                                                            Saving...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Save className="w-3 h-3 mr-2" />
                                                                            Save Changes
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
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
        </div>
    );
}
