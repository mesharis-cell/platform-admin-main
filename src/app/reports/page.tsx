"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileBarChart } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { toast } from "sonner";
import {
    useReports,
    type ReportCardMeta,
    type ReportFilterMeta,
    type ReportSection,
} from "@/hooks/use-reports";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { UnauthorizedState } from "@/components/unauthorized-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportCard } from "@/components/reports/report-card";
import { ALL_COMPANIES_SENTINEL } from "@/components/reports/report-filter";
import { GlobalDateStrip, type DateRange } from "@/components/reports/global-date-strip";

const SECTION_ORDER: ReportSection[] = ["INVENTORY", "OPERATIONS", "FINANCIAL"];
const SECTION_LABEL: Record<ReportSection, string> = {
    INVENTORY: "Inventory",
    OPERATIONS: "Operations",
    FINANCIAL: "Financial",
};

type CardFilterState = Record<string, unknown>;

function ReportsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { data: reports, isLoading, isError } = useReports();
    const [filters, setFilters] = useState<Record<string, CardFilterState>>({});
    // Per-tab global date range (pre-fills date_from/date_to across the tab's cards).
    const [tabDates, setTabDates] = useState<Record<string, DateRange>>({});
    const [downloading, setDownloading] = useState<string | null>(null);

    const cards = useMemo(() => reports ?? [], [reports]);

    const grouped = useMemo(
        () =>
            SECTION_ORDER.map((section) => ({
                section,
                cards: cards.filter((c) => c.section === section),
            })).filter((g) => g.cards.length > 0),
        [cards]
    );

    // Active tab persists in the URL (?tab=FINANCIAL) so refresh/deep-link lands here.
    const tabParam = searchParams.get("tab") as ReportSection | null;
    const activeTab: ReportSection =
        tabParam && grouped.some((g) => g.section === tabParam)
            ? tabParam
            : (grouped[0]?.section ?? "INVENTORY");

    const setActiveTab = useCallback(
        (tab: string) => {
            const params = new URLSearchParams(Array.from(searchParams.entries()));
            params.set("tab", tab);
            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams]
    );

    const setF = (cardKey: string, fKey: string, value: unknown) =>
        setFilters((prev) => ({ ...prev, [cardKey]: { ...(prev[cardKey] ?? {}), [fKey]: value } }));
    const getF = (cardKey: string, fKey: string) => filters[cardKey]?.[fKey];

    // Apply a date range to every card in a section. Empty strings clear that
    // card's date_from/date_to so a cleared global range removes the pre-fill.
    const applyTabDates = (section: ReportSection, range: DateRange) => {
        setTabDates((prev) => ({ ...prev, [section]: range }));
        const sectionCards = grouped.find((g) => g.section === section)?.cards ?? [];
        setFilters((prev) => {
            const next = { ...prev };
            for (const card of sectionCards) {
                const hasFrom = card.filters.some((f) => f.key === "date_from");
                const hasTo = card.filters.some((f) => f.key === "date_to");
                if (!hasFrom && !hasTo) continue;
                const cardState = { ...(next[card.key] ?? {}) };
                if (hasFrom) cardState.date_from = range.from;
                if (hasTo) cardState.date_to = range.to;
                next[card.key] = cardState;
            }
            return next;
        });
    };

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
            } else if (flt.type === "entity-toggle") {
                const all = (flt.options ?? []).map((o) => o.value);
                const selected = (f[flt.key] as string[] | undefined) ?? all;
                // When every entity is selected (the default), omit the param so the
                // URL stays clean and the API's "absent = all four" rule applies.
                const allSelected =
                    all.length > 0 &&
                    selected.length === all.length &&
                    all.every((v) => selected.includes(v));
                if (!allSelected) {
                    selected.forEach((v) => q.append(flt.key, v));
                }
            } else if (flt.type === "status" && Array.isArray(f[flt.key])) {
                // Multi-select status (orders) emits a repeated param the API parses
                // as an IN-list. An empty array means "all" → omit.
                (f[flt.key] as string[]).forEach((v) => q.append(flt.key, v));
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
                } catch (apiError: unknown) {
                    toast.error(
                        (apiError as { message?: string })?.message ||
                            `Failed to export ${card.label}`
                    );
                }
            }
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={FileBarChart}
                title="REPORTS & EXPORTS"
                description="Data Exports · Analytics · Reconciliation"
                stats={{ label: "AVAILABLE REPORTS", value: cards.length }}
            />

            <div className="mx-auto max-w-[1600px] px-6 py-8">
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
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="h-10">
                            {grouped.map(({ section, cards: sectionCards }) => (
                                <TabsTrigger key={section} value={section} className="gap-2">
                                    {SECTION_LABEL[section]}
                                    <Badge
                                        variant="secondary"
                                        className="h-5 min-w-5 justify-center px-1.5 text-[11px]"
                                    >
                                        {sectionCards.length}
                                    </Badge>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {grouped.map(({ section, cards: sectionCards }) => (
                            <TabsContent key={section} value={section} className="space-y-5">
                                <GlobalDateStrip
                                    value={tabDates[section] ?? { from: "", to: "" }}
                                    onApply={(range) => applyTabDates(section, range)}
                                />
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    {sectionCards.map((card) => (
                                        <ReportCard
                                            key={card.key}
                                            card={card}
                                            state={filters[card.key] ?? {}}
                                            setFilter={(fKey, value) => setF(card.key, fKey, value)}
                                            downloading={downloading === card.key}
                                            onDownload={() => run(card)}
                                            missingRequired={missingRequired(card)}
                                        />
                                    ))}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </div>
        </div>
    );
}

export default function ReportsPage() {
    // useSearchParams() requires a Suspense boundary under Next 15's app router.
    return (
        <Suspense fallback={null}>
            <ReportsPageInner />
        </Suspense>
    );
}
