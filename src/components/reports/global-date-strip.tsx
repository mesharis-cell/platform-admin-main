"use client";

import { CalendarRange, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DateRange {
    from: string;
    to: string;
}

interface GlobalDateStripProps {
    value: DateRange;
    /**
     * Apply a date range to every card in the active tab. Empty strings clear
     * the pre-fill. The page writes the range into each card's filter state.
     */
    onApply: (range: DateRange) => void;
}

// yyyy-mm-dd in local time (the API uses the Dubai date convention; the inputs
// already hand a bare date string, so local formatting is fine here).
function fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function presetLast30(): DateRange {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return { from: fmt(from), to: fmt(to) };
}

function presetThisMonth(): DateRange {
    const now = new Date();
    return {
        from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
}

function presetThisYear(): DateRange {
    const now = new Date();
    return {
        from: fmt(new Date(now.getFullYear(), 0, 1)),
        to: fmt(new Date(now.getFullYear(), 11, 31)),
    };
}

/**
 * Per-tab global date strip. Setting a range (manually or via a preset)
 * pre-fills date_from / date_to for every card in that tab. Per-card date
 * inputs still override on a per-card basis.
 */
export function GlobalDateStrip({ value, onApply }: GlobalDateStripProps) {
    const hasValue = Boolean(value.from || value.to);

    return (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2 pb-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                        <CalendarRange className="h-4 w-4" />
                        Date range
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input
                            type="date"
                            value={value.from}
                            className="h-9 w-[160px]"
                            onChange={(e) => onApply({ ...value, from: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input
                            type="date"
                            value={value.to}
                            className="h-9 w-[160px]"
                            onChange={(e) => onApply({ ...value, to: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onApply(presetLast30())}
                    >
                        Last 30 days
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onApply(presetThisMonth())}
                    >
                        This month
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onApply(presetThisYear())}
                    >
                        This year
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!hasValue}
                        onClick={() => onApply({ from: "", to: "" })}
                    >
                        <X className="h-4 w-4" />
                        Clear
                    </Button>
                </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
                Pre-fills the date range for every report in this tab. Individual cards can still be
                adjusted below.
            </p>
        </div>
    );
}
