"use client";

/**
 * OrderEditFeasibilityHelper — the admin order-edit twin of checkout's
 * FeasibilityHelper. Plain-language inline guide for the event-date edit:
 *   - the soonest event date ("floor") given the staged item set
 *   - whether the admin's picked date clears the floor
 *   - a "Why?" disclosure with the concrete numbers driving the floor
 *
 * Reads from useOpsFeasibility (the ops feasibility endpoint). The hard block is
 * the server's job (the PATCH 409s on a too-soon / unavailable window) — this is
 * advisory copy only, matching checkout's helper/gate split. Operational data
 * only: refurb lead-time + lead-hours, never pricing.
 */

import * as React from "react";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    MaintenanceFeasibilityIssue,
    MaintenanceFeasibilityResult,
} from "@/hooks/use-order-feasibility";

function fmtFriendlyDate(ymd: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
    if (!m) return ymd;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
}

interface OrderEditFeasibilityHelperProps {
    isLoading: boolean;
    /** YYYY-MM-DD floor, or null when no preview yet. */
    floorDate: string | null;
    /** The admin's currently-picked event start (YYYY-MM-DD or ""). */
    userEventDate: string;
    /** true / false / null — whether the picked date clears the floor. */
    userDateFeasible: boolean | null;
    blockingItems: MaintenanceFeasibilityIssue[];
    config: MaintenanceFeasibilityResult["config"] | null;
    /** Apply the floor date to the event-start input. */
    onUseFloorDate: () => void;
}

export function OrderEditFeasibilityHelper({
    isLoading,
    floorDate,
    userEventDate,
    userDateFeasible,
    blockingItems,
    config,
    onUseFloorDate,
}: OrderEditFeasibilityHelperProps) {
    const [whyOpen, setWhyOpen] = React.useState(false);
    const floorLabel = floorDate ? fmtFriendlyDate(floorDate) : "";

    if (isLoading) {
        return (
            <p className="font-mono text-[11px] text-muted-foreground italic">
                Checking availability…
            </p>
        );
    }
    if (!floorDate) return null;

    // No date picked yet — show the floor as a friendly hint.
    if (!userEventDate) {
        return (
            <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Soonest possible start
                </p>
                <p className="font-mono text-sm font-medium">{floorLabel}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                    Based on the items on this order. Pick this date or later.
                </p>
                <WhyAccordion
                    open={whyOpen}
                    setOpen={setWhyOpen}
                    floorLabel={floorLabel}
                    config={config}
                    blockingItems={blockingItems}
                />
            </div>
        );
    }

    // Picked date clears the floor — subtle confirmation.
    if (userDateFeasible === true) {
        return (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="font-mono text-[11px] text-emerald-700">
                    This date works — everything can be ready in time.
                </p>
            </div>
        );
    }

    // Picked date is earlier than the floor — warn + offer the shortcut.
    return (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                    <p className="font-mono text-sm font-medium text-amber-900">
                        This date is a bit too soon.
                    </p>
                    <p className="font-mono text-[11px] text-amber-800">
                        Soonest everything can be ready:{" "}
                        <span className="font-semibold">{floorLabel}</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
                <button
                    type="button"
                    onClick={onUseFloorDate}
                    className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[11px] hover:bg-muted"
                >
                    Use this date
                </button>
                <button
                    type="button"
                    onClick={() => setWhyOpen((v) => !v)}
                    className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                    Why
                    <ChevronDown
                        className={cn("h-3 w-3 transition-transform", whyOpen && "rotate-180")}
                    />
                </button>
            </div>
            {whyOpen ? (
                <WhyBody floorLabel={floorLabel} config={config} blockingItems={blockingItems} />
            ) : null}
        </div>
    );
}

function WhyAccordion({
    open,
    setOpen,
    floorLabel,
    config,
    blockingItems,
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    floorLabel: string;
    config: MaintenanceFeasibilityResult["config"] | null;
    blockingItems: MaintenanceFeasibilityIssue[];
}) {
    return (
        <div className="pt-1">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
            >
                Why this date?
                <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
            </button>
            {open ? (
                <div className="pt-2">
                    <WhyBody
                        floorLabel={floorLabel}
                        config={config}
                        blockingItems={blockingItems}
                    />
                </div>
            ) : null}
        </div>
    );
}

function WhyBody({
    floorLabel,
    config,
    blockingItems,
}: {
    floorLabel: string;
    config: MaintenanceFeasibilityResult["config"] | null;
    blockingItems: MaintenanceFeasibilityIssue[];
}) {
    return (
        <ul className="font-mono text-[11px] text-muted-foreground space-y-1 pl-3 border-l-2 border-border/50">
            {config ? (
                <li>
                    <span className="font-medium">{config.minimum_lead_hours}h</span> of prep time
                    after the order is placed
                    {config.exclude_weekends ? " (weekends don't count)" : ""}
                </li>
            ) : null}
            {blockingItems.map((it) => (
                <li key={it.asset_id}>
                    <span className="font-medium">{it.asset_name}</span> needs{" "}
                    <span>
                        {it.refurb_days_estimate} more day
                        {it.refurb_days_estimate === 1 ? "" : "s"}
                    </span>{" "}
                    to be ready
                </li>
            ))}
            <li className="pt-1 text-foreground">
                Earliest everything can be ready: <span className="font-medium">{floorLabel}</span>
            </li>
        </ul>
    );
}
