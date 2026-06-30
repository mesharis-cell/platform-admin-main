"use client";

import { useMemo } from "react";
import { AlertTriangle, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReportFilter, ALL_COMPANIES_SENTINEL } from "@/components/reports/report-filter";
import type { ReportCardMeta, ReportFilterMeta } from "@/hooks/use-reports";

/**
 * Layout-only grouping: collapse a consecutive pair of `date` filters (the
 * From/To window) into one row so they render side-by-side instead of as two
 * stacked full-width cells. Every other filter renders on its own. This only
 * affects visual arrangement — each filter keeps its own value/onChange.
 */
type FilterRow =
    | { kind: "single"; flt: ReportFilterMeta }
    | { kind: "pair"; flts: [ReportFilterMeta, ReportFilterMeta] };

function groupFilterRows(filters: ReportFilterMeta[]): FilterRow[] {
    const rows: FilterRow[] = [];
    for (let i = 0; i < filters.length; i++) {
        const current = filters[i];
        const next = filters[i + 1];
        if (current.type === "date" && next?.type === "date") {
            rows.push({ kind: "pair", flts: [current, next] });
            i += 1; // consume the paired filter
        } else {
            rows.push({ kind: "single", flt: current });
        }
    }
    return rows;
}

interface ReportCardProps {
    card: ReportCardMeta;
    /** This card's filter state ({ [filterKey]: value }). */
    state: Record<string, unknown>;
    setFilter: (filterKey: string, value: unknown) => void;
    downloading: boolean;
    onDownload: () => void;
    /** Required filters still unset — disables Download + lists them in a tooltip. */
    missingRequired: ReportFilterMeta[];
}

export function ReportCard({
    card,
    state,
    setFilter,
    downloading,
    onDownload,
    missingRequired,
}: ReportCardProps) {
    // The card's company selection drives team/group enablement.
    const companyFilter = card.filters.find((f) => f.type === "company");
    const companyValue = companyFilter
        ? (state[companyFilter.key] as string | undefined)
        : undefined;
    const companyId =
        companyValue && companyValue !== ALL_COMPANIES_SENTINEL ? companyValue : undefined;

    // All-companies mode applies only to OPTIONAL company filters: empty or the
    // "All companies" sentinel ⇒ the report runs platform-wide (row-cap risk).
    const showAllCompaniesWarning =
        companyFilter !== undefined &&
        companyFilter.required === false &&
        (!companyValue || companyValue === ALL_COMPANIES_SENTINEL);

    const missingLabels = useMemo(
        () => missingRequired.map((m) => m.label).join(", "),
        [missingRequired]
    );
    const blocked = missingRequired.length > 0;

    // Layout grouping only — pairs the From/To date filters onto one row.
    const filterRows = useMemo(() => groupFilterRows(card.filters), [card.filters]);

    const downloadButton = (
        <Button className="w-full gap-2" onClick={onDownload} disabled={downloading || blocked}>
            <Download className="h-4 w-4" />
            {downloading ? "Exporting…" : "Download XLSX"}
        </Button>
    );

    return (
        <Card className="flex flex-col border-border/60">
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <CardTitle className="text-base leading-snug">{card.label}</CardTitle>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground"
                                aria-label="About this report"
                            >
                                <Info className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[320px] text-xs leading-relaxed">
                            {card.description}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    {filterRows.map((row) =>
                        row.kind === "pair" ? (
                            <div
                                key={row.flts[0].key}
                                className="grid grid-cols-2 gap-3 sm:col-span-2"
                            >
                                {row.flts.map((flt) => (
                                    <ReportFilter
                                        key={flt.key}
                                        flt={flt}
                                        value={state[flt.key]}
                                        onChange={(v) => setFilter(flt.key, v)}
                                        companyId={companyId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <ReportFilter
                                key={row.flt.key}
                                flt={row.flt}
                                value={state[row.flt.key]}
                                onChange={(v) => setFilter(row.flt.key, v)}
                                companyId={companyId}
                            />
                        )
                    )}
                </div>

                {showAllCompaniesWarning && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>All-companies mode — set a date range to avoid the row cap.</span>
                    </div>
                )}

                <div className="mt-auto pt-1">
                    {blocked ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="block">{downloadButton}</span>
                                </TooltipTrigger>
                                <TooltipContent>Select: {missingLabels}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        downloadButton
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
