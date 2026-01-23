"use client";

/**
 * Condition History Timeline Component (Phase 12)
 * Industrial audit trail visualization
 */

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    User,
    Clock,
    FileText,
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import type { ConditionHistoryEntry } from "@/types/condition";
import type { Condition } from "@/types/asset";

interface ConditionHistoryTimelineProps {
    history: { notes: string; condition: Condition; updated_by: string; timestamp: string }[];
    assetName: string;
}

export function ConditionHistoryTimeline({ history, assetName }: ConditionHistoryTimelineProps) {
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

    const toggleEntry = (id: string) => {
        setExpandedEntries((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const getConditionIcon = (condition: Condition) => {
        switch (condition) {
            case "RED":
                return <AlertTriangle className="h-5 w-5 text-destructive" />;
            case "ORANGE":
                return <AlertCircle className="h-5 w-5 text-orange-500" />;
            case "GREEN":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        }
    };

    const getConditionBadge = (condition: Condition) => {
        const baseClasses = "font-mono text-xs uppercase tracking-wider";

        switch (condition) {
            case "RED":
                return <span className={`${baseClasses} text-destructive`}>Critical</span>;
            case "ORANGE":
                return <span className={`${baseClasses} text-orange-500`}>Flagged</span>;
            case "GREEN":
                return <span className={`${baseClasses} text-green-500`}>Good</span>;
        }
    };

    const getConditionColor = (condition: Condition) => {
        switch (condition) {
            case "RED":
                return "border-l-destructive bg-destructive/5";
            case "ORANGE":
                return "border-l-orange-500 bg-orange-500/5";
            case "GREEN":
                return "border-l-green-500 bg-green-500/5";
        }
    };

    if (history.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No condition history recorded yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Timeline Container */}
            <div className="relative space-y-6">
                {/* Vertical Timeline Line */}
                <div className="absolute bottom-0 left-[18px] top-6 w-[2px] bg-border" />

                {history.map((entry, index) => {
                    const isExpanded = expandedEntries.has(entry.timestamp);
                    const isFirst = index === 0;

                    return (
                        <div key={entry.timestamp} className="relative">
                            {/* Timeline Dot */}
                            <div
                                className={`absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background ${
                                    entry.condition === "RED"
                                        ? "bg-destructive"
                                        : entry.condition === "ORANGE"
                                          ? "bg-orange-500"
                                          : "bg-green-500"
                                } ${isFirst ? "ring-4 ring-primary/20" : ""}`}
                            >
                                {getConditionIcon(entry.condition)}
                            </div>

                            {/* Entry Card */}
                            <div className="ml-16">
                                <div
                                    className={`rounded-lg border-l-4 bg-card transition-colors ${getConditionColor(
                                        entry.condition
                                    )}`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between p-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                {getConditionBadge(entry.condition)}
                                                {isFirst && (
                                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-primary">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <User className="h-3 w-3" />
                                                <span>{entry.updated_by}</span>
                                                <span>•</span>
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    {format(
                                                        new Date(entry.timestamp),
                                                        "MMM dd, yyyy 'at' HH:mm"
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {entry.notes && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleEntry(entry.timestamp)}
                                                className="font-mono text-xs"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="mr-1 h-3 w-3" />
                                                        Collapse
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="mr-1 h-3 w-3" />
                                                        Details
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t bg-muted/30 p-4">
                                            {entry.notes && (
                                                <div className="mb-4 space-y-2">
                                                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                                                        <FileText className="h-3 w-3" />
                                                        Notes
                                                    </div>
                                                    <p className="whitespace-pre-wrap text-sm">
                                                        {entry.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
