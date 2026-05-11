"use client";

import type { OrderPricing } from "@/types/hybrid-pricing";

interface Props {
    projection: OrderPricing | null;
}

/**
 * Logistics role view of the pricing breakdown.
 *
 * Renders strictly what the API would return to a LOGISTICS caller:
 *   - Buy column only (no Margin, no Sell)
 *   - No VAT row
 *   - Lines flagged logistics_visible=false are already stripped by
 *     projectByRole(LOGISTICS) and never reach this view
 *   - Final total = buy total of visible lines
 *
 * No stripes / policy indicators — those are admin signals; logistics
 * doesn't need to know about a line's margin policy.
 */
export function LogisticsBreakdownView({ projection }: Props) {
    if (!projection) {
        return (
            <p className="text-xs text-muted-foreground py-6 text-center">
                No pricing snapshot available.
            </p>
        );
    }

    const lines = (projection.breakdown_lines || []).filter(
        (line) => !line.is_voided && (line.billing_mode || "BILLABLE") === "BILLABLE"
    );

    const totals = projection.totals || {};
    const buyTotal = Number(totals.buy_total ?? totals.total ?? 0);

    return (
        <div className="space-y-2 text-sm">
            <div className="rounded border border-border/60 overflow-hidden">
                <div className="grid grid-cols-12 bg-muted/30 px-3 py-2 text-xs font-medium">
                    <span className="col-span-9">Line</span>
                    <span className="col-span-3 text-right">Buy</span>
                </div>

                {lines.map((line) => {
                    const amount = Number(line.total ?? line.buy_total ?? 0);
                    return (
                        <div
                            key={line.line_id}
                            className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border/40"
                        >
                            <span className="col-span-9 truncate">
                                {line.label} ({line.quantity} {line.unit})
                            </span>
                            <span className="col-span-3 text-right font-mono">
                                {amount.toFixed(2)} AED
                            </span>
                        </div>
                    );
                })}

                <div className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border font-semibold bg-muted/20">
                    <span className="col-span-9">Total (buy)</span>
                    <span className="col-span-3 text-right font-mono">
                        {buyTotal.toFixed(2)} AED
                    </span>
                </div>
            </div>
        </div>
    );
}
