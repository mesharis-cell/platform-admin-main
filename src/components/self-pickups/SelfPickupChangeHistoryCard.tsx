"use client";

/**
 * Self-pickup change-history card (Order Editing — Phase 4, read-only).
 *
 * Admin-side mirror of the warehouse self-pickup change log. Renders the rows
 * from GET /operations/v1/self-pickup/:id/change-history (newest first) via the
 * shared ChangeHistoryTimeline — which uses the field-aware `formatChangeValue`
 * so object diffs (item_quantities, permit_requirements, venue_location) never
 * crash JSX. Surfaces "on behalf of" attribution for company-manager edits.
 */

import { useAdminSelfPickupChangeHistory } from "@/hooks/use-self-pickups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import {
    ChangeHistoryTimeline,
    type ChangeHistoryEntry,
} from "@/components/shared/change-history-timeline";

interface SelfPickupChangeHistoryCardProps {
    selfPickupId: string | null;
}

// Friendly labels for the SP fields the API tracks. Falls back to a
// title-cased version of the raw key for anything not listed.
const FIELD_LABELS: Record<string, string> = {
    contact_name: "Contact Name",
    contact_email: "Contact Email",
    contact_phone: "Contact Phone",
    pickup_contact_name: "Pickup Contact Name",
    pickup_contact_email: "Pickup Contact Email",
    pickup_contact_phone: "Pickup Contact Phone",
    special_instructions: "Special Instructions",
    item_quantities: "Item Quantities",
    po_number: "PO Number",
    job_number: "Job Number",
    pickup_date: "Pickup Date",
    return_date: "Return Date",
};

export function SelfPickupChangeHistoryCard({ selfPickupId }: SelfPickupChangeHistoryCardProps) {
    const { data, isLoading } = useAdminSelfPickupChangeHistory(selfPickupId);

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
