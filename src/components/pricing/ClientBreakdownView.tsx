"use client";

import type { OrderPricing } from "@/types/hybrid-pricing";

interface Props {
    projection: OrderPricing | null;
}

/**
 * Client role view of the pricing breakdown.
 *
 * Renders exactly what the API would return to a CLIENT caller:
 *   - Sell column only (no Buy, no Margin)
 *   - VAT row + grand total when VAT is non-zero
 *   - Per-line `total` is null when the line's client_price_visible=false;
 *     we render the label with a `—` placeholder for the amount.
 *   - CUSTOM + NON_BILLABLE lines are already stripped by projectByRole
 *     and never reach this view.
 *
 * No stripes / policy badges — client never sees margin policy.
 */
export function ClientBreakdownView({ projection }: Props) {
    if (!projection) {
        return (
            <p className="text-xs text-muted-foreground py-6 text-center">
                No pricing snapshot available.
            </p>
        );
    }

    const lines = projection.breakdown_lines || [];
    const totals = projection.totals || {};
    const subtotal = Number(totals.subtotal ?? totals.sell_total ?? 0);
    const vatPercent = Number(projection.vat?.percent ?? totals.vat_percent ?? 0);
    const vatAmount = Number(projection.vat?.amount ?? totals.vat_amount ?? 0);
    const total = Number(totals.total ?? totals.sell_total_with_vat ?? subtotal + vatAmount);

    return (
        <div className="space-y-2 text-sm">
            <div className="rounded border border-border/60 overflow-hidden">
                <div className="grid grid-cols-12 bg-muted/30 px-3 py-2 text-xs font-medium">
                    <span className="col-span-9">Line</span>
                    <span className="col-span-3 text-right">Sell</span>
                </div>

                {lines.map((line) => {
                    const amount = line.total;
                    return (
                        <div
                            key={line.line_id}
                            className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border/40"
                        >
                            <span className="col-span-9 truncate">
                                {line.label}
                                {line.quantity ? ` (${line.quantity} ${line.unit})` : ""}
                            </span>
                            <span className="col-span-3 text-right font-mono">
                                {amount === null || amount === undefined ? (
                                    <span className="text-muted-foreground">—</span>
                                ) : (
                                    `${Number(amount).toFixed(2)} AED`
                                )}
                            </span>
                        </div>
                    );
                })}

                <div className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border font-semibold bg-muted/20">
                    <span className="col-span-9">Subtotal</span>
                    <span className="col-span-3 text-right font-mono">
                        {subtotal.toFixed(2)} AED
                    </span>
                </div>
            </div>

            {vatPercent > 0 && (
                <div className="flex justify-between text-sm pt-2">
                    <span className="text-muted-foreground">
                        {vatAmount > 0 ? `VAT (${vatPercent}%)` : `VAT included (${vatPercent}%)`}
                    </span>
                    {vatAmount > 0 && <span className="font-mono">{vatAmount.toFixed(2)} AED</span>}
                </div>
            )}
            <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">{total.toFixed(2)} AED</span>
            </div>
        </div>
    );
}
