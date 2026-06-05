"use client";

/**
 * Shared read-only change-history timeline (Order Editing — Phase 4).
 *
 * Presentational component that renders newest-first field-level change rows
 * for ANY entity (orders, self-pickups) returned by a `.../change-history`
 * endpoint. Humanizes the `field` key, shows old → new via the shared
 * `formatChangeValue` (so object diffs never crash JSX), and surfaces who made
 * the change + any "on behalf of" attribution.
 *
 * Wrapped by entity-specific cards (OrderChangeHistoryCard,
 * SelfPickupChangeHistoryCard) which supply the data via their own hook.
 */

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { formatChangeValue } from "@/lib/format-change-value";

export interface ChangeHistoryEntry {
    id: string;
    field: string;
    old_value: unknown;
    new_value: unknown;
    change_tier?: string | null;
    changed_by?: string | null;
    changed_by_name?: string | null;
    changed_by_role?: string | null;
    acted_by_name?: string | null;
    on_behalf_of_name?: string | null;
    created_at: string;
}

interface ChangeHistoryTimelineProps {
    entries: ChangeHistoryEntry[];
    isLoading?: boolean;
    /** Optional field-key → friendly label overrides. */
    fieldLabels?: Record<string, string>;
    emptyText?: string;
}

function humanizeField(field: string, fieldLabels?: Record<string, string>): string {
    if (fieldLabels?.[field]) return fieldLabels[field];
    return field
        .replace(/_/g, " ")
        .replace(/\./g, " · ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Human labels for the edit tier: A = descriptive (no money/inventory),
// B = pricing/money, C = inventory/scheduling (dates/qty/assets → reconcile).
const TIER_LABELS: Record<string, string> = {
    A: "Details",
    B: "Pricing",
    C: "Inventory",
};

export function ChangeHistoryTimeline({
    entries,
    isLoading,
    fieldLabels,
    emptyText = "No edits yet.",
}: ChangeHistoryTimelineProps) {
    if (isLoading) {
        return <Skeleton className="h-32 w-full" />;
    }

    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground font-mono">{emptyText}</p>;
    }

    return (
        <div className="space-y-1 relative">
            {entries.map((entry, index) => {
                const actor = entry.acted_by_name || entry.changed_by_name || "System";
                return (
                    <div key={entry.id} className="relative pl-6 pb-4 last:pb-0">
                        {/* Connecting line */}
                        {index < entries.length - 1 && (
                            <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
                        )}
                        {/* Dot */}
                        <div className="absolute left-0 top-0.5 h-4 w-4 rounded-full border-2 bg-muted border-border" />
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="border font-mono text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border-border">
                                    {humanizeField(entry.field, fieldLabels)}
                                </Badge>
                                {entry.change_tier && (
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-[10px] px-2 py-0.5"
                                        title={
                                            TIER_LABELS[entry.change_tier]
                                                ? `Tier ${entry.change_tier}`
                                                : undefined
                                        }
                                    >
                                        {TIER_LABELS[entry.change_tier] ?? entry.change_tier}
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                                <span className="text-muted-foreground line-through decoration-muted-foreground/60">
                                    {formatChangeValue(entry.field, entry.old_value)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="font-medium text-foreground">
                                    {formatChangeValue(entry.field, entry.new_value)}
                                </span>
                            </div>
                            <p className="font-mono text-[10px] text-muted-foreground mt-1">
                                {new Date(entry.created_at).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                            <p className="font-mono text-[10px] mt-0.5">
                                {actor}
                                {entry.changed_by_role && (
                                    <span className="text-muted-foreground">
                                        {" "}
                                        · {entry.changed_by_role}
                                    </span>
                                )}
                            </p>
                            {entry.on_behalf_of_name && (
                                <p className="font-mono text-[10px] text-muted-foreground mt-0.5 italic">
                                    on behalf of {entry.on_behalf_of_name}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
