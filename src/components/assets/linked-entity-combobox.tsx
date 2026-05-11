"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, X, Search, Package, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiClient } from "@/lib/api/api-client";

// ─── Types ─────────────────────────────────────────────────────────────────

export type LinkedEntityType = "ORDER" | "SELF_PICKUP";

export interface LinkedEntity {
    type: LinkedEntityType;
    id: string;
    readableId: string; // ORD-... or SPK-...
    status: string;
    companyName?: string | null;
    eventStart?: string | null;
    eventEnd?: string | null;
    itemCount?: number;
    label?: string | null; // e.g. brand or contact name (a short context blurb)
}

interface LinkedEntityComboboxProps {
    value: { type: LinkedEntityType; id: string } | null;
    selectedLabel?: string | null; // for displaying when value is set but result list isn't loaded
    onChange: (entity: LinkedEntity | null) => void;
    disabled?: boolean;
    placeholder?: string;
}

// Statuses considered "active" — anything tentative through fulfilled. Hide
// terminal states (DRAFT, DECLINED, CANCELLED, CLOSED) since they can't be
// linked to a new stock movement meaningfully.
const ACTIVE_ORDER_STATUSES = [
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "IN_PREPARATION",
    "READY_FOR_DELIVERY",
    "IN_TRANSIT",
    "DELIVERED",
    "IN_USE",
    "DERIG",
    "AWAITING_RETURN",
    "RETURN_IN_TRANSIT",
];

const ACTIVE_SP_STATUSES = [
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "AWAITING_RETURN",
];

// Status colors aligned with admin order detail STATUS_CONFIG (compact).
const STATUS_CHIP: Record<string, string> = {
    SUBMITTED: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    PRICING_REVIEW: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    PENDING_APPROVAL: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    QUOTED: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    CONFIRMED: "bg-teal-500/10 text-teal-700 border-teal-500/20",
    IN_PREPARATION: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
    READY_FOR_DELIVERY: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    READY_FOR_PICKUP: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    IN_TRANSIT: "bg-sky-500/10 text-sky-700 border-sky-500/20",
    DELIVERED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    PICKED_UP: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    IN_USE: "bg-pink-500/10 text-pink-700 border-pink-500/20",
    DERIG: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20",
    AWAITING_RETURN: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    RETURN_IN_TRANSIT: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

// ─── Search hooks ──────────────────────────────────────────────────────────

function useOrderSearch(searchTerm: string, enabled: boolean) {
    return useQuery({
        queryKey: ["link-entity-search", "ORDER", searchTerm],
        enabled,
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: "10",
                sort_by: "updated_at",
                sort_order: "desc",
            });
            if (searchTerm.trim()) params.set("search_term", searchTerm.trim());
            const { data } = await apiClient.get(`/client/v1/order?${params.toString()}`);
            // /client/v1/order returns { data: { data: [...], meta: { page, limit, total } } }
            const rows = (data?.data?.data || []) as any[];
            return rows
                .filter((o) => ACTIVE_ORDER_STATUSES.includes(o.order_status))
                .slice(0, 8)
                .map((o) => ({
                    type: "ORDER" as const,
                    id: o.id,
                    readableId: o.order_id,
                    status: o.order_status,
                    companyName: o.company?.name ?? o.company_name ?? null,
                    eventStart: o.event_start_date ?? null,
                    eventEnd: o.event_end_date ?? null,
                    itemCount: o.order_items?.length ?? o.item_count ?? undefined,
                    label: o.venue_name ?? o.brand?.name ?? null,
                })) as LinkedEntity[];
        },
        staleTime: 30_000,
    });
}

function useSelfPickupSearch(searchTerm: string, enabled: boolean) {
    return useQuery({
        queryKey: ["link-entity-search", "SELF_PICKUP", searchTerm],
        enabled,
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "10" });
            if (searchTerm.trim()) params.set("search", searchTerm.trim());
            const { data } = await apiClient.get(`/operations/v1/self-pickup?${params.toString()}`);
            // /operations/v1/self-pickup returns { data: { self_pickups: [...], total, page, ... } }
            const rows = (data?.data?.self_pickups || []) as any[];
            return rows
                .filter((sp) => ACTIVE_SP_STATUSES.includes(sp.self_pickup_status))
                .slice(0, 8)
                .map((sp) => {
                    const window = sp.pickup_window || {};
                    return {
                        type: "SELF_PICKUP" as const,
                        id: sp.id,
                        readableId: sp.self_pickup_id,
                        status: sp.self_pickup_status,
                        companyName: sp.company?.name ?? null,
                        eventStart: window.start ?? null,
                        eventEnd: window.end ?? null,
                        itemCount: sp.self_pickup_items?.length ?? undefined,
                        label: sp.collector_name ?? null,
                    };
                }) as LinkedEntity[];
        },
        staleTime: 30_000,
    });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatWindow(start?: string | null, end?: string | null): string | null {
    if (!start) return null;
    const fmt = (iso: string) => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
        });
    };
    const s = fmt(start);
    const e = end ? fmt(end) : null;
    if (!s) return null;
    if (!e || e === s) return s;
    return `${s} → ${e}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function LinkedEntityCombobox({
    value,
    selectedLabel,
    onChange,
    disabled,
    placeholder = "Search order or self-pickup...",
}: LinkedEntityComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [tab, setTab] = useState<"ORDER" | "SELF_PICKUP">("ORDER");

    // Debounce 300ms
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const orderQuery = useOrderSearch(debouncedSearch, open && tab === "ORDER");
    const spQuery = useSelfPickupSearch(debouncedSearch, open && tab === "SELF_PICKUP");

    const activeQuery = tab === "ORDER" ? orderQuery : spQuery;
    const results = useMemo(() => activeQuery.data ?? [], [activeQuery.data]);

    const displayLabel = useMemo(() => {
        if (!value) return null;
        if (selectedLabel) return selectedLabel;
        const found = results.find((r) => r.type === value.type && r.id === value.id);
        return found?.readableId ?? null;
    }, [value, selectedLabel, results]);

    const handleSelect = (entity: LinkedEntity) => {
        onChange(entity);
        setOpen(false);
        setSearch("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between font-mono"
                >
                    <span className="flex items-center gap-2 truncate text-left">
                        {value ? (
                            <>
                                {value.type === "ORDER" ? (
                                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                    <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className="truncate">{displayLabel ?? value.id}</span>
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">{placeholder}</span>
                            </>
                        )}
                    </span>
                    {value ? (
                        <span
                            role="button"
                            aria-label="Clear selection"
                            onClick={handleClear}
                            className="ml-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0 min-w-[20rem]"
                align="start"
                style={{
                    maxHeight: "min(var(--radix-popover-content-available-height), 480px)",
                    isolation: "isolate",
                }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
            >
                {/* Tab switcher */}
                <div className="flex border-b border-border bg-muted/30">
                    <button
                        type="button"
                        onClick={() => setTab("ORDER")}
                        className={cn(
                            "flex-1 px-3 py-2 text-xs font-mono uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors",
                            tab === "ORDER"
                                ? "border-b-2 border-primary text-foreground bg-background"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Package className="h-3.5 w-3.5" />
                        Orders
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("SELF_PICKUP")}
                        className={cn(
                            "flex-1 px-3 py-2 text-xs font-mono uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors",
                            tab === "SELF_PICKUP"
                                ? "border-b-2 border-primary text-foreground bg-background"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Truck className="h-3.5 w-3.5" />
                        Self-pickups
                    </button>
                </div>

                <Command shouldFilter={false} className="max-h-[inherit]">
                    <CommandInput
                        placeholder={
                            tab === "ORDER"
                                ? "Search by ORD-id, company, venue..."
                                : "Search by SPK-id, company, collector..."
                        }
                        value={search}
                        onValueChange={setSearch}
                        className="font-mono"
                    />
                    <CommandList
                        className="max-h-none"
                        style={{
                            maxHeight:
                                "calc(min(var(--radix-popover-content-available-height), 480px) - 90px)",
                            overflowY: "auto",
                            overscrollBehavior: "contain",
                            touchAction: "pan-y",
                            WebkitOverflowScrolling: "touch",
                        }}
                    >
                        {activeQuery.isLoading ? (
                            <div className="p-3 space-y-2">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="h-12 rounded bg-muted/40 animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : results.length === 0 ? (
                            <CommandEmpty className="py-6 text-center text-xs font-mono text-muted-foreground">
                                {debouncedSearch.trim()
                                    ? `No matching ${tab === "ORDER" ? "orders" : "self-pickups"}.`
                                    : "No active entities. Try searching."}
                            </CommandEmpty>
                        ) : (
                            <CommandGroup
                                heading={
                                    debouncedSearch.trim()
                                        ? `${results.length} match${results.length === 1 ? "" : "es"}`
                                        : "Recent"
                                }
                                className="font-mono text-[10px] uppercase tracking-wide"
                            >
                                {results.map((r) => {
                                    const isSelected = value?.type === r.type && value.id === r.id;
                                    const window = formatWindow(r.eventStart, r.eventEnd);
                                    return (
                                        <CommandItem
                                            key={`${r.type}-${r.id}`}
                                            value={`${r.type}-${r.id}`}
                                            onSelect={() => handleSelect(r)}
                                            className="flex flex-col items-start gap-1 py-2.5 cursor-pointer aria-selected:bg-accent"
                                        >
                                            <div className="flex items-center gap-2 w-full">
                                                <span className="font-mono text-sm font-semibold">
                                                    {r.readableId}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-mono px-1.5 py-0 h-4",
                                                        STATUS_CHIP[r.status] ??
                                                            "bg-muted text-muted-foreground border-border"
                                                    )}
                                                >
                                                    {r.status}
                                                </Badge>
                                                <span className="ml-auto text-xs text-muted-foreground truncate max-w-[40%]">
                                                    {r.companyName}
                                                </span>
                                                {isSelected && (
                                                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                )}
                                            </div>
                                            {(r.label || window || r.itemCount) && (
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 w-full truncate">
                                                    {r.label && (
                                                        <span className="truncate">{r.label}</span>
                                                    )}
                                                    {window && (
                                                        <>
                                                            {r.label && <span>·</span>}
                                                            <span>{window}</span>
                                                        </>
                                                    )}
                                                    {r.itemCount !== undefined && (
                                                        <>
                                                            <span>·</span>
                                                            <span>
                                                                {r.itemCount} item
                                                                {r.itemCount === 1 ? "" : "s"}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
