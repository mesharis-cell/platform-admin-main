"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface StatusTimelineEntry {
    id: string;
    /** Primary badge label */
    label: string;
    /** Tailwind classes for the badge */
    badgeClassName?: string;
    /** ISO timestamp string */
    timestamp: string;
    /** Name of who made the change */
    user?: string | null;
    /** Optional note or comment */
    note?: string | null;
    /** Highlight this entry as the current/active state */
    isActive?: boolean;
}

interface StatusHistoryTimelineProps {
    entries: StatusTimelineEntry[];
    loading?: boolean;
    emptyText?: string;
    remainingEntries?: Array<{
        id: string;
        label: string;
    }>;
    remainingToggleLabel?: string;
}

export function StatusHistoryTimeline({
    entries,
    loading,
    emptyText = "No history yet.",
    remainingEntries = [],
    remainingToggleLabel = "Show Remaining",
}: StatusHistoryTimelineProps) {
    const [showRemaining, setShowRemaining] = useState(false);

    if (loading) return <Skeleton className="h-40 w-full" />;

    if (!entries || entries.length === 0)
        return <p className="text-sm text-muted-foreground">{emptyText}</p>;

    return (
        <div className="space-y-1 relative">
            {entries.map((entry, index) => (
                <div key={entry.id} className="relative pl-6 pb-4 last:pb-0">
                    {/* Connecting line */}
                    {index < entries.length - 1 && (
                        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
                    )}
                    {/* Dot */}
                    <div
                        className={`absolute left-0 top-0.5 h-4 w-4 rounded-full border-2 ${
                            entry.isActive ? "bg-primary border-primary" : "bg-muted border-border"
                        }`}
                    />
                    <div>
                        <Badge
                            className={`border font-mono text-[10px] px-2 py-0.5 ${
                                entry.badgeClassName ||
                                "bg-slate-500/10 text-slate-600 border-slate-500/20"
                            }`}
                        >
                            {entry.label}
                        </Badge>
                        <p className="font-mono text-[10px] text-muted-foreground mt-1">
                            {new Date(entry.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                        {entry.user && <p className="font-mono text-[10px] mt-0.5">{entry.user}</p>}
                        {entry.note && (
                            <p className="font-mono text-[10px] text-muted-foreground italic mt-2 p-2 bg-muted/20 rounded border">
                                {entry.note}
                            </p>
                        )}
                    </div>
                </div>
            ))}

            {remainingEntries.length > 0 && (
                <div className="pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 font-mono text-[10px]"
                        onClick={() => setShowRemaining((prev) => !prev)}
                    >
                        {showRemaining ? "Hide Remaining" : remainingToggleLabel}
                    </Button>

                    {showRemaining && (
                        <div className="mt-2 border-t border-dashed border-border/70 pt-3 space-y-2">
                            {remainingEntries.map((entry) => (
                                <div key={entry.id} className="relative pl-6 pb-2 opacity-60">
                                    <div className="absolute left-0 top-0.5 h-4 w-4 rounded-full border-2 bg-muted/50 border-border" />
                                    <Badge className="border font-mono text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border-border">
                                        {entry.label}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
