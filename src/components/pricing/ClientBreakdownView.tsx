"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
        <div className="space-y-3">
            {/* Same table language as the edit lens; role accent = client (secondary) */}
            <div className="overflow-x-auto rounded-md border border-border border-t-2 border-t-secondary">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border/50 bg-muted/50">
                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                Line
                            </TableHead>
                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                Sell
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map((line) => {
                            const amount = line.total;
                            return (
                                <TableRow key={line.line_id} className="border-border/50">
                                    <TableCell className="py-1.5 text-sm">
                                        {line.label}
                                        {line.quantity ? ` (${line.quantity} ${line.unit})` : ""}
                                    </TableCell>
                                    <TableCell className="py-1.5 text-right font-mono text-xs tabular-nums">
                                        {amount === null || amount === undefined ? (
                                            <span className="text-muted-foreground">—</span>
                                        ) : (
                                            `${Number(amount).toFixed(2)} AED`
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        <TableRow className="border-t border-border bg-muted/20 font-semibold hover:bg-muted/20">
                            <TableCell className="py-2">Subtotal</TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs tabular-nums">
                                {subtotal.toFixed(2)} AED
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Staircase totals — mirrors the edit lens */}
            <div className="ml-auto max-w-xs space-y-1 text-sm">
                {vatPercent > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                        <span>
                            {vatAmount > 0
                                ? `VAT (${vatPercent}%)`
                                : `VAT included (${vatPercent}%)`}
                        </span>
                        {vatAmount > 0 && (
                            <span className="font-mono tabular-nums">
                                {vatAmount.toFixed(2)} AED
                            </span>
                        )}
                    </div>
                )}
                <div className="my-1.5 border-t border-border" />
                <div className="flex items-baseline justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-mono text-base font-bold tabular-nums">
                        {total.toFixed(2)} AED
                    </span>
                </div>
            </div>
        </div>
    );
}
