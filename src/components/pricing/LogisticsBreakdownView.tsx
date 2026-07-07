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
        <div className="space-y-3">
            {/* Same table language as the edit lens; role accent = logistics (indigo) */}
            <div className="overflow-x-auto rounded-md border border-border border-t-2 border-t-indigo-500">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border/50 bg-muted/50">
                            <TableHead className="font-mono text-[10px] font-bold uppercase">
                                Line
                            </TableHead>
                            <TableHead className="text-right font-mono text-[10px] font-bold uppercase">
                                Buy
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map((line) => {
                            const amount = Number(line.total ?? line.buy_total ?? 0);
                            return (
                                <TableRow key={line.line_id} className="border-border/50">
                                    <TableCell className="py-1.5 text-sm">
                                        {line.label} ({line.quantity} {line.unit})
                                    </TableCell>
                                    <TableCell className="py-1.5 text-right font-mono text-xs tabular-nums">
                                        {amount.toFixed(2)} AED
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        <TableRow className="border-t border-border bg-muted/20 font-semibold hover:bg-muted/20">
                            <TableCell className="py-2">Total (buy)</TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs tabular-nums">
                                {buyTotal.toFixed(2)} AED
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
