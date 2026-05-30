"use client";

/**
 * Order Editing (Phase 1) — read-only change-history timeline.
 *
 * Renders the rows returned by GET /operations/v1/order/:id/change-history
 * (newest first) using the same vertical-timeline styling as the status
 * history on the order detail page. Humanizes the `field` key, shows
 * old → new, who made the change, and "on behalf of" when present.
 */

import { useOrderChangeHistory } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ArrowRight } from "lucide-react";

interface OrderChangeHistoryCardProps {
    orderId: string | null;
}

interface ChangeHistoryEntry {
    id: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
    change_tier?: string | null;
    changed_by?: string | null;
    changed_by_name?: string | null;
    changed_by_role?: string | null;
    acted_by_name?: string | null;
    on_behalf_of_name?: string | null;
    created_at: string;
}

// Friendly labels for the fields the API tracks. Falls back to a
// title-cased version of the raw key for anything not listed.
const FIELD_LABELS: Record<string, string> = {
    contact_name: "Contact Name",
    contact_email: "Contact Email",
    contact_phone: "Contact Phone",
    venue_contact_name: "Venue Contact Name",
    venue_contact_email: "Venue Contact Email",
    venue_contact_phone: "Venue Contact Phone",
    venue_name: "Venue Name",
    venue_city_id: "Venue City",
    venue_location: "Venue Location",
    "venue_location.address": "Venue Address",
    "venue_location.access_notes": "Venue Access Notes",
    "venue_location.country": "Venue Country",
    "venue_location.city": "Venue City",
    special_instructions: "Special Instructions",
    permit_requirements: "Permit Requirements",
    is_permanent_placement: "Permanent Placement",
    po_number: "PO Number",
    job_number: "Job Number",
};

function humanizeField(field: string): string {
    if (FIELD_LABELS[field]) return FIELD_LABELS[field];
    return field
        .replace(/_/g, " ")
        .replace(/\./g, " · ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: string | null): string {
    if (value === null || value === undefined || value === "") return "—";
    if (value === "true") return "Yes";
    if (value === "false") return "No";
    return value;
}

export function OrderChangeHistoryCard({ orderId }: OrderChangeHistoryCardProps) {
    const { data, isLoading } = useOrderChangeHistory(orderId);

    const entries: ChangeHistoryEntry[] = Array.isArray(data?.data) ? data.data : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    EDIT HISTORY
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                ) : entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-mono">No edits yet.</p>
                ) : (
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
                                                {humanizeField(entry.field)}
                                            </Badge>
                                            {entry.change_tier && (
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-[10px] px-2 py-0.5"
                                                >
                                                    {entry.change_tier.replace(/_/g, " ")}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                                            <span className="text-muted-foreground line-through decoration-muted-foreground/60">
                                                {formatValue(entry.old_value)}
                                            </span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <span className="font-medium text-foreground">
                                                {formatValue(entry.new_value)}
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
                )}
            </CardContent>
        </Card>
    );
}
