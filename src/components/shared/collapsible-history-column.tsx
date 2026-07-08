"use client";

import { Children, type ReactNode } from "react";
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
 *
 * **Sticky containment (owner feedback R1):** the edge-mounted chevron is bounded
 * to the HISTORY CARD, not the full column. The first child is treated as the
 * primary history card and is the only element inside the sticky's relative
 * context; any sibling cards (e.g. the field-level change-history card) render
 * OUTSIDE it. So the chevron travels only while the history card is in view and
 * stops at that card's bottom edge — it no longer trails down past the siblings.
 */
export function CollapsibleHistoryColumn({
    collapsed,
    onToggle,
    railEntries,
    railTitle = "History",
    children,
}: CollapsibleHistoryColumnProps) {
    // Split the primary history card (first child) from any sibling cards so the
    // sticky toggle's containing block hugs only the primary card (R1).
    const [primary, ...siblings] = Children.toArray(children);

    return (
        <div className="space-y-6">
            {/* Sticky region — its height is exactly the rail (collapsed) or the
                primary history card (expanded), so the absolute inset-y-0 wrapper
                that anchors the chevron is bounded to the card and the sticky node
                stops at the card's end rather than the full column's end. */}
            <div className="relative">
                {/* Edge-mounted toggle — desktop only. A small square button that
                    protrudes on the LEFT edge and stays vertically sticky so it
                    travels with the viewport WITHIN the card's bounds. Present in
                    both states (expand arrow when collapsed, collapse when
                    expanded). The inner sticky node pins at top-24 (clears the
                    page's sticky header). */}
                <div className="pointer-events-none absolute inset-y-0 -left-3 z-20 hidden lg:block">
                    <div className="sticky top-24">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="pointer-events-auto h-9 w-6 rounded-md bg-card shadow-md"
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
                </div>

                {/* Desktop + collapsed → compact rail. */}
                {collapsed && (
                    <div className="hidden lg:block">
                        <CompactRail entries={railEntries} title={railTitle} />
                    </div>
                )}

                {/* Primary history card: desktop shows it only when expanded;
                    mobile always shows it. */}
                <div className={cn(collapsed ? "lg:hidden" : "block")}>{primary}</div>
            </div>

            {/* Sibling cards live OUTSIDE the sticky region so the chevron stops at
                the primary card's end. Same desktop/mobile visibility rules. */}
            {siblings.length > 0 ? (
                <div className={cn("space-y-6", collapsed ? "lg:hidden" : "block")}>{siblings}</div>
            ) : null}
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
