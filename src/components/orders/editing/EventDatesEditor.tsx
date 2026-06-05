"use client";

/**
 * Event-dates editor (admin order-edit, per-section twin of the client's
 * EventDatesEditor). Captures event start + end as full calendar days. Editing
 * these re-derives the asset booking window server-side; an unavailable / too-soon
 * window returns 409 which the parent surfaces inline.
 *
 * Two visibility / gating behaviours layered on top of the client twin (task #10):
 *   - `enabled` (resolved from enable_event_date_inputs per-company) hides the
 *     whole section when the platform/company doesn't expose event-date inputs.
 *   - `minDate` (lead-time floor) caps how soon the start can be picked.
 *
 * The feasibility helper (advisory floor / too-soon copy) is rendered by the
 * parent below the inputs — it depends on the staged item set too, so the parent
 * owns the feasibility query and passes the rendered node in via `helper`.
 */

import type { ReactNode } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EventDatesDraft {
    event_start_date: string; // "YYYY-MM-DD" or ""
    event_end_date: string; // "YYYY-MM-DD" or ""
}

export function EventDatesEditor({
    value,
    onChange,
    disabled,
    minDate,
    helper,
}: {
    value: EventDatesDraft;
    onChange: (patch: Partial<EventDatesDraft>) => void;
    disabled?: boolean;
    /** Lead-time floor (YYYY-MM-DD) — earliest selectable start date. */
    minDate?: string;
    /** Advisory feasibility helper node, rendered below the inputs. */
    helper?: ReactNode;
}) {
    // Client-side guard only: end must not precede start. The server is
    // authoritative and 409s on availability — this is purely a friendly hint.
    const endBeforeStart =
        !!value.event_start_date &&
        !!value.event_end_date &&
        value.event_end_date < value.event_start_date;

    return (
        <div className="space-y-3">
            <p className="font-mono text-[10px] text-muted-foreground">
                Changing the event dates re-derives the asset booking window. If inventory
                isn&apos;t available for the new dates the change is rejected. Editing a quoted
                order&apos;s dates returns it to pricing review.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="font-mono text-[10px] text-muted-foreground">
                        EVENT START DATE
                    </Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            className="font-mono text-sm pl-10"
                            value={value.event_start_date}
                            min={minDate || undefined}
                            disabled={disabled}
                            onChange={(e) => onChange({ event_start_date: e.target.value })}
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="font-mono text-[10px] text-muted-foreground">
                        EVENT END DATE
                    </Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            className="font-mono text-sm pl-10"
                            value={value.event_end_date}
                            min={value.event_start_date || minDate || undefined}
                            disabled={disabled}
                            onChange={(e) => onChange({ event_end_date: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {endBeforeStart && (
                <p className="font-mono text-[11px] font-medium text-destructive">
                    The end date can&apos;t be before the start date.
                </p>
            )}

            {helper}
        </div>
    );
}
