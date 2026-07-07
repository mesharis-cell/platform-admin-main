"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    LineItemBillingMode,
    OrderLineItem,
    UpdateLineItemRequest,
} from "@/types/hybrid-pricing";

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
const MODE_META: Record<
    LineItemBillingMode,
    { label: string; text: string; token: string }
> = {
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
// billing-mode signal moved off the stripe onto the dedicated Mode column (owner
// smoke feedback: kill the amber-on-amber fight); the client-hidden stripe was
// removed (the Client eye column now carries whole-line visibility). Only two
// stripes remain: SYSTEM (locked auto-managed) and override (manual sell).
// Returns "" for a plain billable auto line.
const stripeClassFor = (o: { isSystem: boolean; isOverride: boolean }): string => {
    if (o.isSystem) return "line-row-system";
    if (o.isOverride) return "line-row-override";
    return "";
};

// Reveal-on-focus edit affordance: chromeless mono text at rest, input chrome
// (border + bg + ring) only on hover/focus. Pure CSS state — no conditional
// render, no extra state (fixes C2/C3). border-transparent keeps the 1px box so
// the cell doesn't reflow when the border becomes visible on focus.
const REVEAL_INPUT =
    "h-7 px-2 text-right font-mono text-xs md:text-xs tabular-nums border-transparent bg-transparent shadow-none hover:border-input focus:border-input focus:bg-background";

const IDLE_MONEY = "block text-right font-mono text-xs tabular-nums";

const DEBOUNCE_MS = 650;

interface Props {
    item: OrderLineItem;
    // Entity margin seed (prices.margin_percent) — drives "auto" detection + reset.
    seedMarginPercent: number;
    editable: boolean;
    allowVisibility: boolean;
    currency: string;
    // Faint amber wash for operator-added CUSTOM lines (A5). Suppressed when the
    // row already carries a policy stripe (the stripe is the stronger signal).
    customWash?: boolean;
    // Debounced PUT /line-item/:id via the caller's update hook. Rejects on error.
    onUpdate: (data: UpdateLineItemRequest) => Promise<unknown>;
    onVoid: () => void;
    onToggleVisibility: (next: {
        clientPriceVisible?: boolean;
        clientVisible?: boolean;
        logisticsVisible?: boolean;
    }) => void;
}

/**
 * One editable ledger row. Buy/Sell/Margin% are linked exactly as the old
 * accordion grid: editing buy HOLDS sell (margin re-derives), editing sell/margin
 * stamps an explicit override. Writes are debounced + optimistic — the draft
 * displays immediately; on a rejected save the field rolls back to the server
 * value. SYSTEM lines render locked with a provenance slot (PLAN §11).
 */
export function PricingLedgerRow({
    item,
    seedMarginPercent,
    editable,
    allowVisibility,
    currency,
    customWash,
    onUpdate,
    onVoid,
    onToggleVisibility,
}: Props) {
    const isSystem = item.lineItemType === "SYSTEM";
    const perLineLocked = item.canEditPricingFields === false;
    const rowEditable = editable && !isSystem && !perLineLocked;

    const [expanded, setExpanded] = useState(false);
    const [buy, setBuy] = useState(String(item.unitRate ?? 0));
    const [sell, setSell] = useState(() => {
        const o = readSellOverride(item);
        return o != null ? String(o) : "";
    });
    const [qty, setQty] = useState(String(item.quantity ?? 1));
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>(
        (item.billingMode || "BILLABLE") as LineItemBillingMode
    );
    const [notes, setNotes] = useState(item.notes || "");

    const pendingRef = useRef<UpdateLineItemRequest>({});
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);

    // Notes autosave indicator — derived purely from the existing update mutation
    // lifecycle (no new data path). "saving" while the notes write is in-flight,
    // a brief "saved" on success, then back to idle.
    const [notesStatus, setNotesStatus] = useState<"idle" | "saving" | "saved">("idle");
    const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Resync from the server row once no local edit is pending (post-save
    // reconciliation). While a field is dirty/in-flight we keep the draft.
    useEffect(() => {
        if (inFlightRef.current || Object.keys(pendingRef.current).length > 0) return;
        setBuy(String(item.unitRate ?? 0));
        const o = readSellOverride(item);
        setSell(o != null ? String(o) : "");
        setQty(String(item.quantity ?? 1));
        setBillingMode((item.billingMode || "BILLABLE") as LineItemBillingMode);
        setNotes(item.notes || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.updatedAt, item.unitRate, item.sellUnitRate, item.sell_unit_rate, item.quantity]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
        };
    }, []);

    const flush = async () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const payload = pendingRef.current;
        if (Object.keys(payload).length === 0) return;
        const hadNotes = "notes" in payload;
        pendingRef.current = {};
        inFlightRef.current = true;
        if (hadNotes) {
            if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
            setNotesStatus("saving");
        }
        try {
            await onUpdate(payload);
            if (hadNotes) {
                setNotesStatus("saved");
                notesTimerRef.current = setTimeout(() => setNotesStatus("idle"), 1500);
            }
        } catch {
            // Rollback the touched fields to the server row on failure.
            if ("unitRate" in payload) setBuy(String(item.unitRate ?? 0));
            if ("sellUnitRate" in payload) {
                const o = readSellOverride(item);
                setSell(o != null ? String(o) : "");
            }
            if ("quantity" in payload) setQty(String(item.quantity ?? 1));
            if ("billingMode" in payload)
                setBillingMode((item.billingMode || "BILLABLE") as LineItemBillingMode);
            if (hadNotes) {
                setNotes(item.notes || "");
                setNotesStatus("idle");
            }
        } finally {
            inFlightRef.current = false;
        }
    };

    const queue = (partial: UpdateLineItemRequest) => {
        pendingRef.current = { ...pendingRef.current, ...partial };
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    };

    // Enter in any inline cell flushes the pending edit immediately (owner smoke
    // feedback) — cancels the debounce, blurs, and writes now.
    const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.currentTarget.blur();
        void flush();
    };

    // --- linked Buy/Sell/Margin handlers (lifted) ---
    const handleBuy = (value: string) => {
        setBuy(value);
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) queue({ unitRate: n });
    };
    const handleSell = (value: string) => {
        setSell(value);
        const trimmed = value.trim();
        if (trimmed === "") {
            queue({ sellUnitRate: null });
            return;
        }
        const n = Number(trimmed);
        if (Number.isFinite(n) && n >= 0) queue({ sellUnitRate: n });
    };
    const handleMargin = (value: string) => {
        const trimmed = value.trim();
        if (trimmed === "") {
            setSell("");
            queue({ sellUnitRate: null });
            return;
        }
        const pct = Number(trimmed);
        const buyNum = Number(buy || 0);
        if (!Number.isFinite(pct) || !Number.isFinite(buyNum) || buyNum <= 0) return;
        const nextSell = roundMoney(buyNum * (1 + pct / 100));
        setSell(String(nextSell));
        queue({ sellUnitRate: nextSell });
    };
    const handleReset = () => {
        const buyNum = Number(buy || 0);
        const nextSell = roundMoney(buyNum * (1 + seedMarginPercent / 100));
        setSell(String(nextSell));
        queue({ sellUnitRate: nextSell });
    };
    const handleQty = (value: string) => {
        setQty(value);
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) queue({ quantity: Math.floor(n) });
    };
    const handleBillingMode = (value: LineItemBillingMode) => {
        setBillingMode(value);
        // Discrete control — flush immediately rather than waiting on the debounce
        // (no blur fires on a select).
        pendingRef.current = { ...pendingRef.current, billingMode: value };
        void flush();
    };
    const handleNotes = (value: string) => {
        setNotes(value);
        queue({ notes: value });
    };

    // --- derived display state ---
    const buyNum = Number(buy || 0);
    const sellTrimmed = sell.trim();
    const hasSell = sellTrimmed !== "";
    const sellNum = hasSell ? Number(sellTrimmed) : NaN;
    const autoSell = roundMoney(buyNum * (1 + seedMarginPercent / 100));
    const effectiveSell = hasSell ? sellNum : autoSell;
    const margin = deriveMargin(buyNum, effectiveSell);
    const marginValue = hasSell && margin.percent != null ? String(margin.percent) : "";
    const isBillable = billingMode === "BILLABLE";
    // "auto" when the stamped sell equals the seed-derived sell; "ovr" otherwise.
    const isAuto = !hasSell || Math.abs(effectiveSell - autoSell) < 0.005;
    const lineTotal = Number(item.total ?? 0);

    // --- left-edge policy stripe (replaces the old badges) ---
    const isOverride = isBillable && hasSell && !isAuto;
    const stripe = stripeClassFor({ isSystem, isOverride });
    // NON_BILLABLE lines are internal cost — the projection never shows them to
    // the client, so the Client eye is forced-off + disabled (no toggle).
    const clientForcedOff = billingMode === "NON_BILLABLE";
    const clientVisible = clientForcedOff ? false : item.clientVisible !== false;
    const logisticsVisible = item.logisticsVisible !== false;
    // Amber wash for CUSTOM lines, but only when no stronger stripe is present.
    const wash = customWash && !stripe ? "bg-amber-50/30 dark:bg-amber-500/5" : "";
    const modeMeta = MODE_META[billingMode];

    return (
        <>
            <TableRow className={cn("border-border/50 align-middle", stripe, wash)}>
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
                        {isSystem ? <Lock className="h-3 w-3 shrink-0 text-purple-600" /> : null}
                        <span className="text-sm font-medium">{item.description}</span>
                        {isSystem && item.systemKey ? (
                            <span className="text-[10px] text-muted-foreground">
                                · auto-managed: {item.systemKey.replaceAll("_", " ")}
                            </span>
                        ) : null}
                    </div>
                </TableCell>

                {/* Billing mode — editable in-table Select (ADMIN-only server-side).
                    Read-only coloured token when the row can't be edited. */}
                <TableCell className="w-36 py-1.5">
                    {rowEditable ? (
                        <Select
                            value={billingMode}
                            onValueChange={(v) => handleBillingMode(v as LineItemBillingMode)}
                        >
                            <SelectTrigger
                                className={cn(
                                    "h-7 border-transparent bg-transparent px-2 text-xs shadow-none hover:border-input focus:border-input",
                                    modeMeta.text
                                )}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BILLABLE">Billable</SelectItem>
                                <SelectItem value="NON_BILLABLE">Non-billable</SelectItem>
                                <SelectItem value="COMPLIMENTARY">Complimentary</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : billingMode === "BILLABLE" ? (
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

                {/* Buy/u — reveal-on-focus */}
                <TableCell className="w-28 py-1.5">
                    {rowEditable ? (
                        <Input
                            value={buy}
                            type="number"
                            min={0}
                            step="0.01"
                            className={REVEAL_INPUT}
                            onChange={(e) => handleBuy(e.target.value)}
                            onBlur={flush}
                            onKeyDown={handleEnter}
                        />
                    ) : (
                        <span className={IDLE_MONEY}>{buyNum.toFixed(2)}</span>
                    )}
                </TableCell>

                {/* Sell/u — reveal-on-focus */}
                <TableCell className="w-28 py-1.5">
                    {rowEditable && isBillable ? (
                        <Input
                            value={sell}
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="auto"
                            className={REVEAL_INPUT}
                            onChange={(e) => handleSell(e.target.value)}
                            onBlur={flush}
                            onKeyDown={handleEnter}
                        />
                    ) : (
                        <span className={IDLE_MONEY}>
                            {isBillable ? effectiveSell.toFixed(2) : "0.00"}
                        </span>
                    )}
                </TableCell>

                {/* Margin% — reveal-on-focus */}
                <TableCell className="w-24 py-1.5">
                    {rowEditable && isBillable && !margin.isFee ? (
                        <Input
                            value={marginValue}
                            type="number"
                            step="1"
                            placeholder={hasSell ? "—" : "auto"}
                            className={REVEAL_INPUT}
                            onChange={(e) => handleMargin(e.target.value)}
                            onBlur={flush}
                            onKeyDown={handleEnter}
                        />
                    ) : (
                        <span className={cn(IDLE_MONEY, "text-muted-foreground")}>
                            {isBillable ? margin.display : "—"}
                        </span>
                    )}
                </TableCell>

                {/* Logistics visibility eye */}
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

                {/* Client visibility eye (whole-line). NON_BILLABLE = forced off. */}
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
                                    clientVisible
                                        ? "Hide line from client"
                                        : "Show line to client"
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

                {/* Line total (sell side) */}
                <TableCell className="w-28 py-1.5 text-right font-mono text-xs font-semibold tabular-nums">
                    {lineTotal.toFixed(2)} {currency}
                </TableCell>

                {/* Row actions */}
                <TableCell className="w-20 py-1.5">
                    <div className="flex items-center justify-end gap-0.5">
                        {rowEditable && isBillable && !isAuto ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleReset}
                                title="Reset to auto (seed margin)"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
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
                    <TableCell colSpan={9} className="py-3">
                        {/* Read tokens (category + mode moved off the row, A2 style) */}
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
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px]">Quantity</Label>
                                        <Input
                                            value={qty}
                                            type="number"
                                            min={1}
                                            step={1}
                                            disabled={!rowEditable}
                                            className="h-8"
                                            onChange={(e) => handleQty(e.target.value)}
                                            onBlur={flush}
                                            onKeyDown={handleEnter}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px]">Unit</Label>
                                        <Input
                                            value={item.unit || "unit"}
                                            disabled
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-[11px]">Notes</Label>
                                        {notesStatus === "saving" ? (
                                            <span className="text-[10px] text-muted-foreground">
                                                Saving…
                                            </span>
                                        ) : notesStatus === "saved" ? (
                                            <span className="text-[10px] text-emerald-600">
                                                Saved ✓
                                            </span>
                                        ) : null}
                                    </div>
                                    <Textarea
                                        value={notes}
                                        rows={2}
                                        disabled={
                                            !rowEditable && item.canEditMetadataFields === false
                                        }
                                        onChange={(e) => handleNotes(e.target.value)}
                                        onBlur={flush}
                                    />
                                </div>
                                {/* Per-line PRICE visibility to the client — the third
                                    visibility control (separate from the whole-line Client
                                    eye). Default off: the client sees the line but not its
                                    individual sell figure unless this is on. Only meaningful
                                    on a billable, client-visible line. */}
                                {!isSystem && isBillable && !clientForcedOff ? (
                                    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                                        <div className="space-y-0.5">
                                            <Label className="text-[11px]">
                                                Show price to client
                                            </Label>
                                            <p className="text-[10.5px] leading-snug text-muted-foreground">
                                                When on, this line&apos;s individual sell price
                                                appears on the client&apos;s estimate.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={item.clientPriceVisible === true}
                                            disabled={!rowEditable}
                                            onCheckedChange={(next) =>
                                                onToggleVisibility({ clientPriceVisible: next })
                                            }
                                        />
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-2 text-[11px] text-muted-foreground">
                                {perLineLocked && item.lockReason ? (
                                    <p className="text-amber-600">{item.lockReason}</p>
                                ) : null}
                                {rowEditable && isBillable && !isAuto ? (
                                    <p>
                                        Override — sell stamped manually ·{" "}
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="text-primary hover:underline"
                                        >
                                            Reset to auto (seed {seedMarginPercent}%)
                                        </button>
                                    </p>
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
