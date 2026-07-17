"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Eye, EyeOff, Link2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LineItemBillingMode, OrderLineItem } from "@/types/hybrid-pricing";

// --- shared money helpers (lifted from OrderLineItemsList) ---------------------
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const readSellOverride = (item: OrderLineItem): number | null => {
    const raw = item.sellUnitRate ?? item.sell_unit_rate ?? null;
    if (raw == null) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
};

// Percentage formatter — up to 2 decimals, trailing zeros trimmed (30% / 66.67%).
const fmtPct = (pct: number): string => `${Number(pct.toFixed(2))}`;

// margin% derived from buy + sell — returns a display token because buy=0 is a
// legitimate "fee" line where margin% is undefined. Percent carries 2-decimal
// precision (trailing zeros trimmed on display).
const deriveMargin = (
    buy: number,
    sell: number
): { display: string; isFee: boolean; percent: number | null } => {
    if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
        return { display: "—", isFee: false, percent: null };
    }
    if (buy > 0) {
        const pct = Math.round(((sell - buy) / buy) * 10000) / 100;
        return { display: `${fmtPct(pct)}%`, isFee: false, percent: pct };
    }
    if (sell > 0) return { display: "Fee", isFee: true, percent: null };
    return { display: "—", isFee: false, percent: null };
};

// Billing-mode display tokens — full labels + DISTINCT colours (owner smoke
// feedback: kill the amber-on-amber fight between comp + non-billable). Billable
// is the neutral norm; Complimentary reads as a client gift (emerald);
// Non-billable is internal cost (slate).
const MODE_META: Record<LineItemBillingMode, { label: string; text: string; token: string }> = {
    BILLABLE: {
        label: "Billable",
        text: "text-foreground",
        token: "text-muted-foreground",
    },
    NON_BILLABLE: {
        label: "Non-billable",
        text: "text-slate-600 dark:text-slate-300",
        token: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    COMPLIMENTARY: {
        label: "Complimentary",
        text: "text-emerald-600 dark:text-emerald-400",
        token: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
};

// D1 left-edge stripe classes (globals.css) — one calm signal per row. The
// billing-mode signal lives on the dedicated Mode column; the client-hidden
// stripe was removed (the Client eye column carries whole-line visibility). Only
// two stripes remain: SYSTEM (locked auto-managed) and override (manual sell).
// Returns "" for a plain billable auto line.
const stripeClassFor = (o: { isSystem: boolean; isOverride: boolean }): string => {
    if (o.isSystem) return "line-row-system";
    if (o.isOverride) return "line-row-override";
    return "";
};

// Read-only money display cell — centered + monospace, no edit affordance (all
// numeric editing now happens in the pen → modal, not inline).
const IDLE_MONEY = "block text-center font-mono text-xs tabular-nums";

interface Props {
    item: OrderLineItem;
    // Entity margin seed (prices.margin_percent) — drives "auto" detection.
    seedMarginPercent: number;
    // Row-level editability (permission + status + not-locked). Gates the pen +
    // void + the two visibility eyes.
    editable: boolean;
    allowVisibility: boolean;
    currency: string;
    // Pen click → the parent runs the QUOTED amend gate (if any) then opens the
    // edit modal. No inline editing happens on the row itself.
    onEdit: () => void;
    onVoid: () => void;
    // Resolves true on success, false on a caught+toasted failure. Instant,
    // ungated (G1 PDF-refresh); the eyes are the only inline mutation left.
    onToggleVisibility: (next: {
        clientPriceVisible?: boolean;
        clientVisible?: boolean;
        logisticsVisible?: boolean;
    }) => Promise<boolean> | void;
}

/**
 * One READ-ONLY ledger row. Every numeric cell (Qty / Buy / Sell / Margin % /
 * Margin amount / Billing / Total) is a display only — editing is done through
 * the pen → line-edit modal (Model D). The row keeps two live controls: the two
 * visibility eyes (instant, ungated) and the pen + void actions. SYSTEM / locked
 * lines are view-only (no pen/void/eyes); their detail is on the expand row.
 */
export function PricingLedgerRow({
    item,
    seedMarginPercent,
    editable,
    allowVisibility,
    currency,
    onEdit,
    onVoid,
    onToggleVisibility,
}: Props) {
    const isSystem = item.lineItemType === "SYSTEM";
    const isCatalog = item.lineItemType === "CATALOG";
    const perLineLocked = item.canEditPricingFields === false;
    const rowEditable = editable && !isSystem && !perLineLocked;
    // G8: post-acceptance client-visibility lock (ORDER only; the API sends
    // can_edit_client_visibility=false when financial_status is locked). Absent
    // → treat as editable. Disables the client eye.
    const clientVisibilityLocked = item.canEditClientVisibility === false;

    const [expanded, setExpanded] = useState(false);

    // --- derived display state (read-only; sourced from the server row) ---
    const buyNum = Number(item.unitRate ?? 0);
    const sellOverride = readSellOverride(item);
    const hasSell = sellOverride != null;
    const qtyNum = Math.max(1, Math.floor(Number(item.quantity ?? 1) || 1));
    const billingMode = (item.billingMode || "BILLABLE") as LineItemBillingMode;
    const isBillable = billingMode === "BILLABLE";
    const autoSell = roundMoney(buyNum * (1 + seedMarginPercent / 100));
    const effectiveSell = hasSell ? (sellOverride as number) : autoSell;
    const margin = deriveMargin(buyNum, effectiveSell);
    // "auto" when the stamped sell equals the seed-derived sell; "ovr" otherwise.
    const isAuto = !hasSell || Math.abs(effectiveSell - autoSell) < 0.005;
    // R11: the Total column is the SELL total (qty × effective sell/unit).
    // Non-billable lines sell for 0.
    const sellTotalLine = isBillable ? roundMoney(effectiveSell * qtyNum) : 0;
    // R10: line-level margin amount (sell − buy, times qty).
    const marginAmountLine = isBillable ? roundMoney((effectiveSell - buyNum) * qtyNum) : 0;
    const isLirOrigin = item.lirOrigin === true;

    // --- left-edge policy stripe ---
    const isOverride = isBillable && hasSell && !isAuto;
    const stripe = stripeClassFor({ isSystem, isOverride });
    // NON_BILLABLE lines are internal cost — the projection never shows them to
    // the client, so the Client eye is forced-off + disabled (no toggle).
    const clientForcedOff = billingMode === "NON_BILLABLE";
    const clientVisible = clientForcedOff ? false : item.clientVisible !== false;
    const logisticsVisible = item.logisticsVisible !== false;
    const modeMeta = MODE_META[billingMode];

    return (
        <>
            <TableRow className={cn("border-border/50 align-middle", stripe)}>
                <TableCell className="w-8 px-2">
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={expanded ? "Collapse" : "Expand"}
                    >
                        {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                </TableCell>

                <TableCell className="min-w-[220px] py-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">{item.description}</span>
                        {isSystem && item.systemKey ? (
                            <span className="text-[10px] text-muted-foreground">
                                · auto-managed: {item.systemKey.replaceAll("_", " ")}
                            </span>
                        ) : null}
                    </div>
                </TableCell>

                {/* Billing mode — read-only coloured token. */}
                <TableCell className="w-36 py-1.5 text-center">
                    {billingMode === "BILLABLE" ? (
                        <span className={cn("text-xs", modeMeta.text)}>{modeMeta.label}</span>
                    ) : (
                        <span
                            className={cn(
                                "inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium",
                                modeMeta.token
                            )}
                        >
                            {modeMeta.label}
                        </span>
                    )}
                </TableCell>

                {/* Qty — read-only. */}
                <TableCell className="w-20 py-1.5">
                    <span className={IDLE_MONEY}>{qtyNum}</span>
                </TableCell>

                {/* Buy / Unit — read-only. */}
                <TableCell className="w-28 py-1.5">
                    <span className={IDLE_MONEY}>{buyNum.toFixed(2)}</span>
                </TableCell>

                {/* Sell / Unit — read-only. Non-billable lines sell for 0. */}
                <TableCell className="w-28 py-1.5">
                    <span className={IDLE_MONEY}>
                        {isBillable ? effectiveSell.toFixed(2) : "0.00"}
                    </span>
                </TableCell>

                {/* Margin % — read-only. */}
                <TableCell className="w-24 py-1.5">
                    <span className={IDLE_MONEY}>{isBillable ? margin.display : "—"}</span>
                </TableCell>

                {/* Margin Amount (R10) — read-only. */}
                <TableCell className="w-28 py-1.5">
                    <span className={IDLE_MONEY}>
                        {isBillable ? marginAmountLine.toFixed(2) : "—"}
                    </span>
                </TableCell>

                {/* Logistics visibility eye — instant, ungated. */}
                <TableCell className="w-12 py-1.5 text-center">
                    {allowVisibility && !isSystem ? (
                        <button
                            type="button"
                            onClick={() =>
                                onToggleVisibility({ logisticsVisible: !logisticsVisible })
                            }
                            className={cn(
                                "inline-flex",
                                logisticsVisible ? "text-primary" : "text-muted-foreground/50"
                            )}
                            aria-label={
                                logisticsVisible
                                    ? "Hide line from logistics"
                                    : "Show line to logistics"
                            }
                            title={
                                logisticsVisible
                                    ? "Visible to logistics — click to hide"
                                    : "Hidden from logistics — click to show"
                            }
                        >
                            {logisticsVisible ? (
                                <Eye className="h-4 w-4" />
                            ) : (
                                <EyeOff className="h-4 w-4" />
                            )}
                        </button>
                    ) : null}
                </TableCell>

                {/* Client visibility eye (whole-line) — instant, ungated.
                    NON_BILLABLE = forced off; post-acceptance lock (G8) shows the
                    current state disabled. */}
                <TableCell className="w-12 py-1.5 text-center">
                    {!isSystem ? (
                        clientForcedOff ? (
                            <span
                                className="inline-flex cursor-not-allowed text-muted-foreground/30"
                                title="Internal cost — never shown to client"
                                aria-label="Internal cost — never shown to client"
                            >
                                <EyeOff className="h-4 w-4" />
                            </span>
                        ) : clientVisibilityLocked ? (
                            <span
                                className="inline-flex cursor-not-allowed text-muted-foreground/40"
                                title="Locked after quote acceptance"
                                aria-label="Client visibility locked after quote acceptance"
                            >
                                {clientVisible ? (
                                    <Eye className="h-4 w-4" />
                                ) : (
                                    <EyeOff className="h-4 w-4" />
                                )}
                            </span>
                        ) : allowVisibility ? (
                            <button
                                type="button"
                                onClick={() =>
                                    onToggleVisibility({ clientVisible: !clientVisible })
                                }
                                className={cn(
                                    "inline-flex",
                                    clientVisible ? "text-primary" : "text-muted-foreground/50"
                                )}
                                aria-label={
                                    clientVisible ? "Hide line from client" : "Show line to client"
                                }
                                title={
                                    clientVisible
                                        ? "Visible to client — click to hide"
                                        : "Hidden from client — click to show"
                                }
                            >
                                {clientVisible ? (
                                    <Eye className="h-4 w-4" />
                                ) : (
                                    <EyeOff className="h-4 w-4" />
                                )}
                            </button>
                        ) : null
                    ) : null}
                </TableCell>

                {/* Total (R11) — the SELL total for the line (qty × sell/unit). */}
                <TableCell className="w-28 py-1.5 text-center font-mono text-xs font-semibold tabular-nums">
                    {sellTotalLine.toFixed(2)} {currency}
                </TableCell>

                {/* Row actions — pen (edit) then trash (void). Both gated on
                    rowEditable, so SYSTEM / locked lines are view-only. */}
                <TableCell className="w-20 py-1.5">
                    <div className="flex items-center justify-end gap-0.5">
                        {rowEditable ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={onEdit}
                                title="Edit line"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        ) : null}
                        {rowEditable ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={onVoid}
                                title="Remove line"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        ) : null}
                    </div>
                </TableCell>
            </TableRow>

            {expanded ? (
                <TableRow className={cn("border-border/50 bg-muted/20 hover:bg-muted/20", stripe)}>
                    <TableCell />
                    <TableCell colSpan={11} className="py-3">
                        {/* Read-only detail (A2 style). All editing is via the pen. */}
                        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
                            <span>
                                Category{" "}
                                <span className="font-medium uppercase tracking-wide text-foreground">
                                    {item.category}
                                </span>
                            </span>
                            <span>
                                Type{" "}
                                <span className="font-medium uppercase tracking-wide text-foreground">
                                    {item.lineItemType}
                                </span>
                                {item.serviceTypeId ? " · from catalog service" : ""}
                            </span>
                            {item.unit ? (
                                <span>
                                    Unit{" "}
                                    <span className="font-medium text-foreground">{item.unit}</span>
                                </span>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2 text-[11px] text-muted-foreground">
                                {item.notes ? (
                                    <p>
                                        Notes: <span className="text-foreground">{item.notes}</span>
                                    </p>
                                ) : (
                                    <p className="italic">No notes.</p>
                                )}
                                {isOverride ? (
                                    <p>
                                        Override — sell stamped manually (entity margin{" "}
                                        {seedMarginPercent}%). Edit the line to reset to auto.
                                    </p>
                                ) : isBillable && isCatalog ? (
                                    <p>Sell follows the entity margin ({seedMarginPercent}%).</p>
                                ) : null}
                                {isLirOrigin ? (
                                    <p className="flex items-center gap-1.5 text-foreground/80">
                                        <Link2 className="h-3 w-3 shrink-0" />
                                        Unit price set by an approved logistics request
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-2 text-[11px] text-muted-foreground">
                                {perLineLocked && item.lockReason ? (
                                    <p className="text-amber-600">{item.lockReason}</p>
                                ) : null}
                                {clientVisibilityLocked ? (
                                    <p>Client visibility is locked after quote acceptance.</p>
                                ) : null}
                                {item.addedByName || item.addedBy ? (
                                    <p>Added by {item.addedByName || item.addedBy}</p>
                                ) : null}
                                {item.addedAt ? (
                                    <p>Added {new Date(item.addedAt).toLocaleString()}</p>
                                ) : null}
                                {item.metadata &&
                                typeof item.metadata === "object" &&
                                Object.keys(item.metadata).length > 0 ? (
                                    <pre className="mt-2 rounded-md bg-muted/60 px-2.5 py-2 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap break-all text-muted-foreground">
                                        {JSON.stringify(item.metadata, null, 2)}
                                    </pre>
                                ) : null}
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            ) : null}
        </>
    );
}
