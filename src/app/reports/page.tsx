"use client";

import { useMemo, useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { toast } from "sonner";
import { useCompanies } from "@/hooks/use-companies";
import { useAssetCategories } from "@/hooks/use-asset-categories";
import {
    useReports,
    type ReportCardMeta,
    type ReportFilterMeta,
    type ReportSection,
} from "@/hooks/use-reports";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { UnauthorizedState } from "@/components/unauthorized-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const SECTION_ORDER: ReportSection[] = ["INVENTORY", "OPERATIONS", "FINANCIAL"];
const SECTION_LABEL: Record<ReportSection, string> = {
    INVENTORY: "Inventory",
    OPERATIONS: "Orders & Operations",
    FINANCIAL: "Financial",
};

type CardFilterState = Record<string, any>;

// Sentinel for an OPTIONAL company filter's "All companies" choice — buildQuery
// omits company_id for it, and the API treats a missing company_id as all-companies.
const ALL_COMPANIES_SENTINEL = "__all__";

export default function ReportsPage() {
    const { data: reports, isLoading, isError } = useReports();
    const { data: companies } = useCompanies({ limit: "200", page: "1" });
    const { data: categories } = useAssetCategories(undefined, { allScopes: true });
    const [filters, setFilters] = useState<Record<string, CardFilterState>>({});
    const [downloading, setDownloading] = useState<string | null>(null);

    const cards = reports ?? [];

    const grouped = useMemo(
        () =>
            SECTION_ORDER.map((section) => ({
                section,
                cards: cards.filter((c) => c.section === section),
            })).filter((g) => g.cards.length > 0),
        [cards]
    );

    const setF = (cardKey: string, fKey: string, value: any) =>
        setFilters((prev) => ({ ...prev, [cardKey]: { ...(prev[cardKey] ?? {}), [fKey]: value } }));
    const getF = (cardKey: string, fKey: string) => filters[cardKey]?.[fKey];

    const buildQuery = (card: ReportCardMeta): string => {
        const f = filters[card.key] ?? {};
        const q = new URLSearchParams();
        for (const flt of card.filters) {
            if (flt.type === "category-include-exclude") {
                const cat = f[flt.key] as { mode?: string; values?: string[] } | undefined;
                if (cat?.values?.length) {
                    // include-only filters never emit category_exclude (the report drops it).
                    const param =
                        flt.mode !== "include-only" && cat.mode === "exclude"
                            ? "category_exclude"
                            : "category_include";
                    cat.values.forEach((v) => q.append(param, v));
                }
            } else {
                const v = f[flt.key];
                // The all-companies sentinel means "omit company_id" → API runs platform-wide.
                if (v && v !== ALL_COMPANIES_SENTINEL) q.append(flt.key, String(v));
            }
        }
        return q.toString();
    };

    const missingRequired = (card: ReportCardMeta): ReportFilterMeta[] =>
        card.filters.filter((flt) => flt.required && !getF(card.key, flt.key));

    const run = async (card: ReportCardMeta) => {
        const missing = missingRequired(card);
        if (missing.length) {
            toast.error(`Select: ${missing.map((m) => m.label).join(", ")}`);
            return;
        }
        const query = buildQuery(card);
        const url = `/operations/v1/reports/${card.key}/run${query ? `?${query}` : ""}`;
        setDownloading(card.key);
        try {
            const response = await apiClient.get(url, { responseType: "blob" });
            const contentType = String(response.headers?.["content-type"] ?? "");
            const blob =
                response.data instanceof Blob
                    ? response.data
                    : new Blob([response.data], { type: contentType });
            const downloadUrl = URL.createObjectURL(blob);
            if (typeof window === "undefined") {
                URL.revokeObjectURL(downloadUrl);
                throw new Error("Download is only available in the browser.");
            }
            // eslint-disable-next-line creatr/no-browser-globals-in-ssr
            const link = window.document.createElement("a");
            link.href = downloadUrl;
            link.download = `${card.key}-${new Date().toISOString().slice(0, 10)}.xlsx`;
            link.click();
            URL.revokeObjectURL(downloadUrl);
            toast.success(`${card.label} exported successfully`);
        } catch (error) {
            // Downloads use responseType: "blob", so a JSON error body arrives as a
            // Blob and its message is lost. Decode the blob and pull out `.message`
            // before falling back to the generic axios-error path.
            const blobBody = (error as { response?: { data?: unknown } })?.response?.data;
            if (blobBody instanceof Blob) {
                let message = `Failed to export ${card.label}`;
                try {
                    const text = await blobBody.text();
                    const parsed = JSON.parse(text);
                    if (parsed?.message) message = String(parsed.message);
                } catch {
                    // Not a JSON error body — keep the generic message.
                }
                toast.error(message);
            } else {
                try {
                    throwApiError(error);
                } catch (apiError: any) {
                    toast.error(apiError?.message || `Failed to export ${card.label}`);
                }
            }
        } finally {
            setDownloading(null);
        }
    };

    const renderFilter = (card: ReportCardMeta, flt: ReportFilterMeta) => {
        const value = getF(card.key, flt.key);
        if (flt.type === "company") {
            return (
                <div key={flt.key} className="space-y-1.5">
                    <Label className="text-xs">
                        {flt.label}
                        {flt.required ? " *" : ""}
                    </Label>
                    <Select value={value || ""} onValueChange={(v) => setF(card.key, flt.key, v)}>
                        <SelectTrigger>
                            <SelectValue
                                placeholder={flt.required ? "Select company" : "All companies"}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {!flt.required && (
                                <SelectItem value={ALL_COMPANIES_SENTINEL}>
                                    All companies
                                </SelectItem>
                            )}
                            {companies?.data?.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }
        if (flt.type === "date") {
            return (
                <div key={flt.key} className="space-y-1.5">
                    <Label className="text-xs">{flt.label}</Label>
                    <Input
                        type="date"
                        value={value || ""}
                        onChange={(e) => setF(card.key, flt.key, e.target.value)}
                    />
                </div>
            );
        }
        if (flt.type === "status" && flt.options?.length) {
            return (
                <div key={flt.key} className="space-y-1.5">
                    <Label className="text-xs">{flt.label}</Label>
                    <Select
                        value={value || "all"}
                        onValueChange={(v) => setF(card.key, flt.key, v === "all" ? "" : v)}
                    >
                        <SelectTrigger>
                            <SelectValue
                                placeholder={flt.allLabel ?? `All ${flt.label.toLowerCase()}`}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{flt.allLabel ?? "All"}</SelectItem>
                            {flt.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }
        if (flt.type === "category-include-exclude") {
            const includeOnly = flt.mode === "include-only";
            const cat = (value as { mode?: string; values?: string[] }) ?? {
                mode: "include",
                values: [],
            };
            // In include-only mode the report drops any exclude payload, so force
            // (and surface) "include" and never offer the Exclude option.
            const effectiveMode = includeOnly ? "include" : (cat.mode ?? "include");
            const selected = new Set(cat.values ?? []);
            const toggle = (name: string) => {
                const next = new Set(selected);
                if (next.has(name)) next.delete(name);
                else next.add(name);
                setF(card.key, flt.key, { mode: effectiveMode, values: [...next] });
            };
            return (
                <div key={flt.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">{flt.label}</Label>
                        {!includeOnly && (
                            <Select
                                value={cat.mode ?? "include"}
                                onValueChange={(m) =>
                                    setF(card.key, flt.key, { mode: m, values: cat.values ?? [] })
                                }
                            >
                                <SelectTrigger className="h-7 w-[110px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="include">Include</SelectItem>
                                    <SelectItem value="exclude">Exclude</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {categories?.data?.map((c) => (
                            <Button
                                key={c.id}
                                type="button"
                                size="sm"
                                variant={selected.has(c.name) ? "default" : "outline"}
                                className="h-6 px-2 text-[11px]"
                                onClick={() => toggle(c.name)}
                            >
                                {c.name}
                            </Button>
                        ))}
                    </div>
                    {flt.scope === "document" && (
                        <p className="text-[10px] text-muted-foreground">
                            Coarse filter — matches any line item in the document.
                        </p>
                    )}
                </div>
            );
        }
        // group / team / status-without-options → free text id
        return (
            <div key={flt.key} className="space-y-1.5">
                <Label className="text-xs">{flt.label}</Label>
                <Input
                    value={value || ""}
                    placeholder={flt.label}
                    onChange={(e) => setF(card.key, flt.key, e.target.value)}
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={FileBarChart}
                title="REPORTS & EXPORTS"
                description="Data Exports · Analytics · Reconciliation"
                stats={{ label: "AVAILABLE REPORTS", value: cards.length }}
            />

            <div className="mx-auto max-w-[1600px] px-6 py-8 space-y-8">
                {isLoading ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">Loading reports…</p>
                        </CardContent>
                    </Card>
                ) : isError ? (
                    <Card>
                        <CardContent className="p-8 text-center space-y-1">
                            <p className="font-medium text-foreground">Couldn’t load reports</p>
                            <p className="text-sm text-muted-foreground">
                                The reports service didn’t respond. Refresh to retry — if it
                                persists, the API may be unavailable.
                            </p>
                        </CardContent>
                    </Card>
                ) : grouped.length === 0 ? (
                    <UnauthorizedState
                        title="No Reports Available"
                        message="Your role doesn’t grant access to any reports. Contact your administrator if you believe this is an error."
                        backHref="/"
                    />
                ) : (
                    grouped.map(({ section, cards: sectionCards }) => (
                        <section key={section} className="space-y-4">
                            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
                                {SECTION_LABEL[section]}
                            </h2>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {sectionCards.map((card) => (
                                    <Card key={card.key} className="border-border/60">
                                        <CardHeader className="space-y-1">
                                            <CardTitle className="text-base">
                                                {card.label}
                                            </CardTitle>
                                            <CardDescription>{card.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {card.filters.map((flt) => renderFilter(card, flt))}
                                            <Button
                                                className="w-full gap-2"
                                                onClick={() => run(card)}
                                                disabled={downloading === card.key}
                                            >
                                                <Download className="h-4 w-4" />
                                                {downloading === card.key
                                                    ? "Exporting…"
                                                    : "Download XLSX"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </div>
    );
}
