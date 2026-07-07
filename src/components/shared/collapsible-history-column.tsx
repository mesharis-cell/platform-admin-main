"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Normalized shape for a single compact-rail entry. Deliberately smaller than
 * the full timeline entry — the rail only shows badge + short date + user.
 */
export interface HistoryRailEntry {
    id: string;
    /** Status badge label */
    label: string;
    /** Tailwind classes for the badge (from the page's status config) */
    badgeClassName?: string;
    /** ISO timestamp string */
    timestamp: string;
    /** Acting user, truncated in the rail */
    user?: string | null;
    /** Highlight as the current/active state */
    isActive?: boolean;
}

interface CollapsibleHistoryColumnProps {
    /** Controlled collapsed state (owned by the page; default collapsed on load) */
    collapsed: boolean;
    /** Toggle handler */
    onToggle: () => void;
    /** Compact entries rendered in the rail when collapsed (desktop only) */
    railEntries: HistoryRailEntry[];
    /** Rail heading (defaults to "History") */
    railTitle?: string;
    /** Full expanded content — the real timeline + any sibling history cards */
    children: ReactNode;
}

/**
 * Reusable right-hand history column shared by the ORDER and SELF-PICKUP detail
 * pages (PLAN pricing-ledger follow-up item 1).
 *
 * - **Desktop, collapsed (default):** renders a narrow compact rail (badge +
 *   short date + truncated user) via {@link CompactRail}. The page swaps its grid
 *   template to a fixed ~128px column so the main content widens to absorb the
 *   freed space. The full timeline is NOT click-to-expand from the rail entries;
 *   only the sticky chevron toggles.
 * - **Desktop, expanded:** renders `children` (the full StatusHistoryTimeline +
 *   any sibling cards) at the normal 1/3 width.
 * - **Below `lg`:** the stacked single-column layout always renders `children`
 *   full-width, exactly as before — the rail is desktop-only.
 *
 * The collapse state is intentionally NOT persisted: it resets to collapsed on
 * every load. State lives in the page (it also drives the grid template), so
 * this component is a controlled presentational wrapper.
 */
export function CollapsibleHistoryColumn({
    collapsed,
    onToggle,
    railEntries,
    railTitle = "History",
    children,
}: CollapsibleHistoryColumnProps) {
    return (
        <div className="space-y-3">
            {/* Sticky toggle — desktop only, stays visible while the column scrolls.
                top-20 clears the pages' sticky top-0 header (~72px). */}
            <div className="sticky top-20 z-20 hidden justify-end lg:flex">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-card shadow-sm"
                    onClick={onToggle}
                    aria-label={collapsed ? "Expand history" : "Collapse history"}
                    title={collapsed ? "Expand history" : "Collapse history"}
                >
                    {collapsed ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Desktop + collapsed → compact rail. */}
            {collapsed && (
                <div className="hidden lg:block">
                    <CompactRail entries={railEntries} title={railTitle} />
                </div>
            )}

            {/* Full content: desktop shows it only when expanded; mobile always shows it. */}
            <div className={cn("space-y-6", collapsed ? "lg:hidden" : "block")}>{children}</div>
        </div>
    );
}

function CompactRail({ entries, title }: { entries: HistoryRailEntry[]; title: string }) {
    return (
        <div className="rounded-lg border border-border bg-card p-2">
            <div className="flex items-center gap-1.5 px-1 pb-2 text-muted-foreground">
                <Clock className="h-3 w-3 text-primary" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wide">
                    {title}
                </span>
            </div>
            {entries.length === 0 ? (
                <p className="px-1 py-2 text-[10px] text-muted-foreground">No history yet.</p>
            ) : (
                <div className="relative space-y-3">
                    {entries.map((entry, index) => (
                        <div key={entry.id} className="relative pl-4">
                            {/* Connecting line (kept from the full timeline aesthetic) */}
                            {index < entries.length - 1 && (
                                <div className="absolute bottom-[-12px] left-[3px] top-3 w-px bg-border" />
                            )}
                            {/* Dot */}
                            <div
                                className={cn(
                                    "absolute left-0 top-1 h-2 w-2 rounded-full border",
                                    entry.isActive
                                        ? "border-primary bg-primary"
                                        : "border-border bg-muted"
                                )}
                            />
                            <Badge
                                className={cn(
                                    "border px-1 py-0 font-mono text-[9px] leading-tight",
                                    entry.badgeClassName ||
                                        "border-border bg-muted text-muted-foreground"
                                )}
                            >
                                {entry.label}
                            </Badge>
                            <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </p>
                            {entry.user && (
                                <p
                                    className="truncate font-mono text-[9px] text-muted-foreground/80"
                                    title={entry.user}
                                >
                                    {entry.user}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
