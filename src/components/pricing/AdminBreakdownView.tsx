"use client";

import { cn } from "@/lib/utils";
import { Minus, EyeOff, Tag } from "lucide-react";
import type { BreakdownLine, OrderPricing } from "@/types/hybrid-pricing";

interface Props {
    projection: OrderPricing | null;
}

/**
 * Admin role view of the pricing breakdown.
 *
 * Renders the full Buy + Margin + Sell grid plus margin / VAT / total
 * summary rows. Lines flagged apply_margin=false or logistics_visible=false
 * get full-line stripes (amber for no-margin, indigo for hidden-from-
 * logistics) so admin can scan policy at a glance. Stripes are admin-only:
 * the LogisticsBreakdownView + ClientBreakdownView never show them.
 */
export function AdminBreakdownView({ projection }: Props) {
    if (!projection) {
        return (
            <p className="text-xs text-muted-foreground py-6 text-center">
                No pricing snapshot available.
            </p>
        );
    }

    const lines = (projection.breakdown_lines || []).filter(
        (line) => !line.is_voided && (line.billing_mode || "BILLABLE") === "BILLABLE"
    ) as BreakdownLine[];

    const totals = projection.totals || {};
    const buyTotal = Number(totals.buy_total ?? 0);
    const sellTotal = Number(totals.sell_total ?? 0);
    const marginAmount = Number(totals.margin_amount ?? sellTotal - buyTotal);
    const vatPercent = Number(projection.vat?.percent ?? totals.vat_percent ?? 0);
    const vatAmount = Number(projection.vat?.amount ?? totals.vat_amount ?? 0);
    const finalTotal = Number(totals.sell_total_with_vat ?? totals.total ?? sellTotal + vatAmount);
    const marginPercent = Number(
        projection.margin_policy?.percent ?? projection.margin?.percent ?? 0
    );

    return (
        <div className="space-y-2 text-sm">
            <div className="rounded border border-border/60 overflow-hidden">
                <div className="grid grid-cols-12 bg-muted/30 px-3 py-2 text-xs font-medium">
                    <span className="col-span-5">Line</span>
                    <span className="col-span-2 text-right">Buy</span>
                    <span className="col-span-2 text-right">Margin</span>
                    <span className="col-span-3 text-right">Sell</span>
                </div>

                {lines.map((line) => {
                    const buy = Number(line.buy_total ?? 0);
                    const sell = Number(line.sell_total ?? 0);
                    const lineMargin = sell - buy;
                    const noMargin = line.apply_margin === false;
                    const logisticsHidden = line.logistics_visible === false;
                    // Per-unit sell override is active when the marker is non-null.
                    const sellOverride = line.sell_unit_rate_override != null;
                    return (
                        <div
                            key={line.line_id}
                            className={cn(
                                "grid grid-cols-12 px-3 py-2 text-xs border-t border-border/40",
                                noMargin && !logisticsHidden && "line-row-no-margin",
                                logisticsHidden && "line-row-hidden-logistics"
                            )}
                        >
                            <span className="col-span-5 truncate flex items-center gap-1.5">
                                <span className="truncate">
                                    {line.label} ({line.quantity} {line.unit})
                                </span>
                                {noMargin && (
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-amber-700">
                                        <Minus className="h-2.5 w-2.5" /> no-margin
                                    </span>
                                )}
                                {logisticsHidden && (
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-indigo-600">
                                        <EyeOff className="h-2.5 w-2.5" /> hidden from logistics
                                    </span>
                                )}
                                {sellOverride && (
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-primary">
                                        <Tag className="h-2.5 w-2.5" /> sell override
                                    </span>
                                )}
                            </span>
                            <span className="col-span-2 text-right font-mono">
                                {buy.toFixed(2)} AED
                            </span>
                            <span
                                className={cn(
                                    "col-span-2 text-right font-mono",
                                    noMargin && "text-muted-foreground"
                                )}
                            >
                                +{lineMargin.toFixed(2)} AED
                            </span>
                            <span className="col-span-3 text-right font-mono">
                                {sell.toFixed(2)} AED
                            </span>
                        </div>
                    );
                })}

                <div className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border font-semibold bg-muted/20">
                    <span className="col-span-5">Total of lines</span>
                    <span className="col-span-2 text-right font-mono">
                        {buyTotal.toFixed(2)} AED
                    </span>
                    <span className="col-span-2 text-right font-mono">
                        +{marginAmount.toFixed(2)} AED
                    </span>
                    <span className="col-span-3 text-right font-mono">
                        {sellTotal.toFixed(2)} AED
                    </span>
                </div>
            </div>

            <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">
                    Effective margin ({marginPercent.toFixed(2)}%)
                </span>
                <span className="font-mono">{marginAmount.toFixed(2)} AED</span>
            </div>
            <div className="border-t border-border my-2" />
            {vatPercent > 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                        {vatAmount > 0 ? `VAT (${vatPercent}%)` : `VAT included (${vatPercent}%)`}
                    </span>
                    {vatAmount > 0 && <span className="font-mono">{vatAmount.toFixed(2)} AED</span>}
                </div>
            )}
            <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">{finalTotal.toFixed(2)} AED</span>
            </div>
        </div>
    );
}
