"use client";

/**
 * Order Editing — read-only change-history timeline card.
 *
 * Renders the rows returned by GET /operations/v1/order/:id/change-history
 * (newest first) via the shared ChangeHistoryTimeline. Humanizes the `field`
 * key, shows old → new, who made the change, and "on behalf of" when present.
 *
 * "New edit" pulse (#12): the newest entry's timestamp is compared against a
 * per-order last-seen marker in localStorage. When a newer edit has landed since
 * the admin last opened this card, the header badge + dot pulse to draw the eye.
 * Opening the card (mount with entries present) records the newest timestamp as
 * seen, so the pulse clears on the next render and won't re-fire until a fresh
 * edit arrives. SSR-safe (all localStorage access is inside effects / guarded).
 */

import { useEffect, useMemo, useState } from "react";
import { useOrderChangeHistory } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import {
    ChangeHistoryTimeline,
    type ChangeHistoryEntry,
} from "@/components/shared/change-history-timeline";

interface OrderChangeHistoryCardProps {
    orderId: string | null;
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
    event_start_date: "Event Start Date",
    event_end_date: "Event End Date",
    items: "Items",
};

const seenKey = (orderId: string) => `order-change-history-seen:${orderId}`;

// These helpers are only ever invoked inside a useEffect (never during SSR), and
// are additionally guarded by a typeof-window check. The lint rule keys off the
// lexical global, so we suppress it on the guarded access lines.
function readSeen(orderId: string): string | null {
    if (typeof window === "undefined") return null;
    try {
        // eslint-disable-next-line creatr/no-browser-globals-in-ssr
        return localStorage.getItem(seenKey(orderId));
    } catch {
        return null;
    }
}

function writeSeen(orderId: string, value: string) {
    if (typeof window === "undefined") return;
    try {
        // eslint-disable-next-line creatr/no-browser-globals-in-ssr
        localStorage.setItem(seenKey(orderId), value);
    } catch {
        // ignore quota / privacy-mode failures — the pulse is non-critical.
    }
}

export function OrderChangeHistoryCard({ orderId }: OrderChangeHistoryCardProps) {
    const { data, isLoading } = useOrderChangeHistory(orderId);

    const entries: ChangeHistoryEntry[] = Array.isArray(data?.data) ? data.data : [];

    // Newest entry timestamp (entries arrive newest-first).
    const newestAt = entries.length > 0 ? entries[0].created_at : null;

    // Compute "has new edit" against the persisted last-seen marker, then mark
    // the newest as seen so the pulse clears. Re-runs whenever a fresh edit lands.
    const [hasNewEdit, setHasNewEdit] = useState(false);

    useEffect(() => {
        if (!orderId || !newestAt) {
            setHasNewEdit(false);
            return;
        }
        const seen = readSeen(orderId);
        // New when there's no prior marker, or the newest edit is strictly later
        // than what was last seen (ISO timestamps compare lexicographically).
        const isNew = !seen || newestAt > seen;
        setHasNewEdit(isNew);
        if (isNew) writeSeen(orderId, newestAt);
    }, [orderId, newestAt]);

    const titleClass = useMemo(
        () =>
            hasNewEdit
                ? "font-mono text-sm flex items-center gap-2 animate-pulse"
                : "font-mono text-sm flex items-center gap-2",
        [hasNewEdit]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className={titleClass}>
                    <History className="h-4 w-4 text-primary" />
                    EDIT HISTORY
                    {hasNewEdit && (
                        <span className="relative ml-1 flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                        </span>
                    )}
                    {hasNewEdit && (
                        <Badge className="border font-mono text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                            New
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ChangeHistoryTimeline
                    entries={entries}
                    isLoading={isLoading}
                    fieldLabels={FIELD_LABELS}
                    emptyText="No edits yet."
                />
            </CardContent>
        </Card>
    );
}
