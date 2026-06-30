"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ReportCombobox, type ComboboxOption } from "@/components/reports/report-combobox";
import type { ReportFilterMeta } from "@/hooks/use-reports";
import { useCompanies } from "@/hooks/use-companies";
import { useTeams } from "@/hooks/use-teams";
import { useBrands } from "@/hooks/use-brands";
import { useAssetCategories } from "@/hooks/use-asset-categories";
import { useAssetGroups } from "@/hooks/use-asset-groups";

// Sentinel for an OPTIONAL company filter's "All companies" choice — buildQuery
// omits company_id for it, and the API treats a missing company_id as all-companies.
export const ALL_COMPANIES_SENTINEL = "__all__";

// Readable labels for the entity-toggle filter. The API ships raw enum values
// (ORDER / SERVICE_REQUEST / …) as both value + label, so we humanise them here.
export const ENTITY_TYPE_LABELS: Record<string, string> = {
    ORDER: "Orders",
    SERVICE_REQUEST: "Service Requests",
    SELF_PICKUP: "Self-Pickups",
    INBOUND_REQUEST: "Inbound",
};
const entityLabel = (opt: { value: string; label: string }) =>
    ENTITY_TYPE_LABELS[opt.value] ?? opt.label;

// Orders status accepts a repeated array server-side and has 17 options; render
// it as a multi-select combobox. Every other status filter is a single Select
// (current-stock + accounts-reconciliation only accept a single value server-side).
const STATUS_MULTI_THRESHOLD = 8;

interface ReportFilterProps {
    flt: ReportFilterMeta;
    value: unknown;
    /** Set this filter's value. */
    onChange: (value: unknown) => void;
    /** The card's currently-selected company_id (drives team/group enablement). */
    companyId: string | undefined;
}

function FilterLabel({ flt, hint }: { flt: ReportFilterMeta; hint?: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <Label className="text-xs">
                {flt.label}
                {flt.required ? " *" : ""}
            </Label>
            {hint && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-3 w-3 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[240px]">{hint}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}

export function ReportFilter({ flt, value, onChange, companyId }: ReportFilterProps) {
    /* ---------------------------------- COMPANY --------------------------------- */
    const { data: companies } = useCompanies(
        flt.type === "company" ? { limit: "200", page: "1" } : undefined
    );
    /* ----------------------------------- TEAM ----------------------------------- */
    const { data: teams } = useTeams(
        flt.type === "team" && companyId ? { company_id: companyId } : undefined
    );
    /* ---------------------------------- BRAND ----------------------------------- */
    const { data: brands } = useBrands(flt.type === "brand" ? { limit: "200" } : undefined);
    /* ---------------------------------- GROUP ----------------------------------- */
    const { data: groups } = useAssetGroups(flt.type === "group" ? companyId : undefined);
    /* -------------------------------- CATEGORY ---------------------------------- */
    const { data: categories } = useAssetCategories(undefined, {
        allScopes: flt.type === "category-include-exclude",
    });

    /* =========================== COMPANY (combobox) ============================ */
    if (flt.type === "company") {
        const options: ComboboxOption[] = [
            // Optional company filters pin an "All companies" item that buildQuery drops.
            ...(!flt.required
                ? [{ value: ALL_COMPANIES_SENTINEL, label: "All companies", pinned: true }]
                : []),
            ...(companies?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
        ];
        return (
            <div className="space-y-1.5">
                <FilterLabel flt={flt} />
                <ReportCombobox
                    options={options}
                    value={(value as string | null) ?? null}
                    onChange={(v) => onChange(v ?? "")}
                    placeholder={flt.required ? "Select company" : "All companies"}
                    searchPlaceholder="Search companies…"
                    emptyText="No companies found."
                />
            </div>
        );
    }

    /* ================================== DATE =================================== */
    if (flt.type === "date") {
        return (
            <div className="space-y-1.5">
                <FilterLabel flt={flt} />
                <Input
                    type="date"
                    value={(value as string) || ""}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        );
    }

    /* ================================= STATUS ================================== */
    if (flt.type === "status" && flt.options?.length) {
        const opts = flt.options;
        const isMulti = opts.length > STATUS_MULTI_THRESHOLD;
        if (isMulti) {
            return (
                <div className="space-y-1.5">
                    <FilterLabel flt={flt} />
                    <ReportCombobox
                        multiple
                        options={opts.map((o) => ({ value: o.value, label: o.label }))}
                        value={(value as string[] | undefined) ?? []}
                        onChange={(v) => onChange(v)}
                        placeholder={flt.allLabel ?? `All ${flt.label.toLowerCase()}`}
                        searchPlaceholder="Search statuses…"
                        emptyText="No statuses found."
                    />
                </div>
            );
        }
        return (
            <div className="space-y-1.5">
                <FilterLabel flt={flt} />
                <Select
                    value={(value as string) || "all"}
                    onValueChange={(v) => onChange(v === "all" ? "" : v)}
                >
                    <SelectTrigger>
                        <SelectValue
                            placeholder={flt.allLabel ?? `All ${flt.label.toLowerCase()}`}
                        />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{flt.allLabel ?? "All"}</SelectItem>
                        {opts.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    /* ===================== CATEGORY (multi + include/exclude) ==================== */
    if (flt.type === "category-include-exclude") {
        const includeOnly = flt.mode === "include-only";
        const cat = (value as { mode?: string; values?: string[] }) ?? {
            mode: "include",
            values: [],
        };
        // In include-only mode the report drops any exclude payload, so force "include".
        const effectiveMode = includeOnly ? "include" : (cat.mode ?? "include");
        const options: ComboboxOption[] = (categories?.data ?? []).map((c) => ({
            value: c.name,
            label: c.name,
        }));
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <FilterLabel
                        flt={flt}
                        hint={
                            flt.scope === "document"
                                ? "Coarse filter — matches any line item in the document."
                                : undefined
                        }
                    />
                    {!includeOnly && (
                        <div className="inline-flex rounded-md border border-input p-0.5">
                            {(["include", "exclude"] as const).map((m) => (
                                <Button
                                    key={m}
                                    type="button"
                                    size="sm"
                                    variant={effectiveMode === m ? "default" : "ghost"}
                                    className="h-6 px-2.5 text-[11px] capitalize"
                                    onClick={() => onChange({ mode: m, values: cat.values ?? [] })}
                                >
                                    {m}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                <ReportCombobox
                    multiple
                    options={options}
                    value={cat.values ?? []}
                    onChange={(vals) => onChange({ mode: effectiveMode, values: vals })}
                    placeholder="All categories"
                    searchPlaceholder="Search categories…"
                    emptyText="No categories found."
                />
            </div>
        );
    }

    /* ============================== ENTITY-TOGGLE ============================== */
    if (flt.type === "entity-toggle" && flt.options?.length) {
        const opts = flt.options;
        const all = opts.map((o) => o.value);
        // No state ⇒ all selected (matches the API default + buildQuery's omission).
        const selected = (value as string[] | undefined) ?? all;
        return (
            <div className="space-y-1.5">
                <FilterLabel flt={flt} />
                <ToggleGroup
                    type="multiple"
                    variant="outline"
                    size="sm"
                    value={selected}
                    // Radix hands back the new array; if the user clears everything we
                    // fall back to "all" so the report still runs (buildQuery then omits
                    // the param, which the API reads as "all four arms").
                    onValueChange={(next: string[]) => onChange(next.length ? next : all)}
                    className="flex-wrap justify-start gap-1.5"
                >
                    {opts.map((opt) => (
                        <ToggleGroupItem
                            key={opt.value}
                            value={opt.value}
                            className="h-7 px-2.5 text-[11px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                            {entityLabel(opt)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>
        );
    }

    /* ================================== TEAM =================================== */
    if (flt.type === "team") {
        const disabled = !companyId;
        const widget = (
            <ReportCombobox
                options={(teams?.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
                value={(value as string | null) ?? null}
                onChange={(v) => onChange(v ?? "")}
                placeholder="All teams"
                searchPlaceholder="Search teams…"
                emptyText="No teams found."
                disabled={disabled}
            />
        );
        return (
            <div className="space-y-1.5">
                <FilterLabel flt={flt} />
                {disabled ? <DisabledWithTooltip>{widget}</DisabledWithTooltip> : widget}
            </div>
        );
    }

    /* ================================== BRAND ================================== */
    if (flt.type === "brand") {
        return (
            <div className="space-y-1.5">
                <FilterLabel flt={flt} />
                <ReportCombobox
                    options={(brands?.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
                    value={(value as string | null) ?? null}
                    onChange={(v) => onChange(v ?? "")}
                    placeholder="All brands"
                    searchPlaceholder="Search brands…"
                    emptyText="No brands found."
                />
            </div>
        );
    }

    /* ================================== GROUP ================================== */
    if (flt.type === "group") {
        const disabled = !companyId;
        const widget = (
            <ReportCombobox
                options={(groups?.data ?? []).map((g) => ({ value: g.id, label: g.name }))}
                value={(value as string | null) ?? null}
                onChange={(v) => onChange(v ?? "")}
                placeholder="All groups"
                searchPlaceholder="Search groups…"
                emptyText="No groups found."
                disabled={disabled}
            />
        );
        return (
            <div className="space-y-1.5">
                <FilterLabel flt={flt} />
                {disabled ? <DisabledWithTooltip>{widget}</DisabledWithTooltip> : widget}
            </div>
        );
    }

    /* --------------- fallback: status-without-options / unknown → text id -------------- */
    return (
        <div className="space-y-1.5">
            <FilterLabel flt={flt} />
            <Input
                value={(value as string) || ""}
                placeholder={flt.label}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

/** Wraps a disabled combobox so the "Select a company first" tooltip surfaces. */
function DisabledWithTooltip({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* span so the tooltip fires even though the trigger button is disabled */}
                    <span className="block">{children}</span>
                </TooltipTrigger>
                <TooltipContent>Select a company first</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
