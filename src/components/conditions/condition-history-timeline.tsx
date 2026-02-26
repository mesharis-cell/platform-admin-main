"use client";

import { useState } from "react";
import { format } from "date-fns";
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
import type { Condition } from "@/types/asset";

interface ConditionHistoryTimelineProps {
    history: Array<{
        id?: string;
        notes: string;
        condition: Condition;
        updated_by: string;
        timestamp: string;
        photos?: string[];
        damage_report_entries?: Array<{ url: string; description?: string }>;
    }>;
    assetName: string;
}

const CONDITION_DOT: Record<Condition, string> = {
    RED: "bg-destructive",
    ORANGE: "bg-orange-500",
    GREEN: "bg-green-500",
};

const CONDITION_BORDER: Record<Condition, string> = {
    RED: "border-l-destructive bg-destructive/5",
    ORANGE: "border-l-orange-500 bg-orange-500/5",
    GREEN: "border-l-green-500 bg-green-500/5",
};

const CONDITION_LABEL: Record<Condition, { text: string; cls: string }> = {
    RED: { text: "Critical", cls: "text-destructive" },
    ORANGE: { text: "Flagged", cls: "text-orange-500" },
    GREEN: { text: "Good", cls: "text-green-500" },
};

const CONDITION_ICON: Record<Condition, React.ReactNode> = {
    RED: <AlertTriangle className="h-5 w-5 text-white" />,
    ORANGE: <AlertCircle className="h-5 w-5 text-white" />,
    GREEN: <CheckCircle2 className="h-5 w-5 text-white" />,
};

export function ConditionHistoryTimeline({ history }: ConditionHistoryTimelineProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggle = (key: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });

    const getPhotos = (entry: ConditionHistoryTimelineProps["history"][number]) => {
        if (Array.isArray(entry.damage_report_entries) && entry.damage_report_entries.length > 0) {
            return entry.damage_report_entries
                .filter((d) => !!d?.url)
                .map((d) => ({ url: d.url, description: d.description }));
        }
        return (entry.photos ?? []).map((url) => ({ url, description: undefined }));
    };

    if (history.length === 0)
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No condition history recorded yet</p>
            </div>
        );

    return (
        <div className="relative space-y-5">
            {/* Vertical line */}
            <div className="absolute bottom-0 left-[22px] top-7 w-[2px] bg-border" />

            {history.map((entry, idx) => {
                const key = entry.timestamp;
                const isOpen = expanded.has(key);
                const isFirst = idx === 0;
                const photos = getPhotos(entry);
                const hasDetail = !!entry.notes || photos.length > 0;
                const label = CONDITION_LABEL[entry.condition];

                return (
                    <div key={key} className="relative flex gap-5">
                        {/* Dot */}
                        <div
                            className={`relative z-10 mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-background ${CONDITION_DOT[entry.condition]} ${isFirst ? "ring-4 ring-primary/20" : ""}`}
                        >
                            {CONDITION_ICON[entry.condition]}
                        </div>

                        {/* Card */}
                        <div
                            className={`flex-1 rounded-lg border-l-4 bg-card shadow-sm ${CONDITION_BORDER[entry.condition]}`}
                        >
                            {/* Header — fully clickable */}
                            <div
                                className={`flex items-start justify-between gap-3 px-4 py-3 ${hasDetail ? "cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg" : ""}`}
                                onClick={() => hasDetail && toggle(key)}
                            >
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                            className={`font-mono text-sm font-semibold ${label.cls}`}
                                        >
                                            {label.text}
                                        </span>
                                        {isFirst && (
                                            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                                                Current
                                            </span>
                                        )}
                                        {photos.length > 0 && !isOpen && (
                                            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                                <ImageIcon className="h-3 w-3" />
                                                {photos.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                        <User className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{entry.updated_by}</span>
                                        <span>·</span>
                                        <Clock className="h-3 w-3 shrink-0" />
                                        <span>
                                            {format(
                                                new Date(entry.timestamp),
                                                "MMM d, yyyy · HH:mm"
                                            )}
                                        </span>
                                    </div>
                                    {/* Notes preview when collapsed */}
                                    {!isOpen && entry.notes && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 italic">
                                            {entry.notes}
                                        </p>
                                    )}
                                </div>

                                {hasDetail && (
                                    <div className="shrink-0 mt-0.5">
                                        {isOpen ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Expanded details */}
                            {isOpen && (
                                <div className="border-t bg-muted/20 px-4 py-4 space-y-4 rounded-b-lg">
                                    {entry.notes && (
                                        <div className="space-y-1.5">
                                            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                <FileText className="h-3.5 w-3.5" />
                                                Notes
                                            </p>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                {entry.notes}
                                            </p>
                                        </div>
                                    )}

                                    {photos.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                <ImageIcon className="h-3.5 w-3.5" />
                                                Photos ({photos.length})
                                            </p>
                                            {/* Horizontal scrollable photo strip */}
                                            <div className="flex gap-3 overflow-x-auto pb-2">
                                                {photos.map((photo, i) => (
                                                    <a
                                                        key={i}
                                                        href={photo.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="shrink-0 group"
                                                    >
                                                        <div className="w-28 h-28 rounded-lg overflow-hidden border border-border bg-muted relative group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                                                            <img
                                                                src={photo.url}
                                                                alt={`Photo ${i + 1}`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                            />
                                                        </div>
                                                        {photo.description && (
                                                            <p className="text-xs text-muted-foreground mt-1 w-28 truncate">
                                                                {photo.description}
                                                            </p>
                                                        )}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
