"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

// margin% derived from buy + sell — returns a display token because buy=0 is a
// legitimate "fee" line where margin% is undefined.
const deriveMargin = (
    buy: number,
    sell: number
): { display: string; isFee: boolean; percent: number | null } => {
    if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
        return { display: "—", isFee: false, percent: null };
    }
    if (buy > 0) {
        const pct = Math.round(((sell - buy) / buy) * 100);
        return { display: `${pct}%`, isFee: false, percent: pct };
    }
    if (sell > 0) return { display: "Fee", isFee: true, percent: null };
    return { display: "—", isFee: false, percent: null };
};

const MODE_CHIP: Record<LineItemBillingMode, { label: string; className: string }> = {
    BILLABLE: {
        label: "bill",
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    },
    NON_BILLABLE: {
        label: "free",
        className: "bg-slate-500/10 text-slate-600 border-slate-500/30",
    },
    COMPLIMENTARY: { label: "comp", className: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
};

const DEBOUNCE_MS = 650;

interface Props {
    item: OrderLineItem;
    // Entity margin seed (prices.margin_percent) — drives "auto" detection + reset.
    seedMarginPercent: number;
    editable: boolean;
    allowVisibility: boolean;
    currency: string;
    // Debounced PUT /line-item/:id via the caller's update hook. Rejects on error.
    onUpdate: (data: UpdateLineItemRequest) => Promise<unknown>;
    onVoid: () => void;
    onToggleVisibility: (next: {
        clientPriceVisible?: boolean;
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
        };
    }, []);

    const flush = async () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const payload = pendingRef.current;
        if (Object.keys(payload).length === 0) return;
        pendingRef.current = {};
        inFlightRef.current = true;
        try {
            await onUpdate(payload);
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
            if ("notes" in payload) setNotes(item.notes || "");
        } finally {
            inFlightRef.current = false;
        }
    };

    const queue = (partial: UpdateLineItemRequest) => {
        pendingRef.current = { ...pendingRef.current, ...partial };
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, DEBOUNCE_MS);
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
        queue({ billingMode: value });
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
    const modeChip = MODE_CHIP[billingMode];
    const lineTotal = Number(item.total ?? 0);

    return (
        <>
            <TableRow className="border-border/50 align-middle">
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

                <TableCell className="min-w-[220px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">{item.description}</span>
                        <Badge variant="outline" className="text-[10px]">
                            {item.category}
                        </Badge>
                        {isSystem ? (
                            <Badge
                                variant="outline"
                                className="text-[10px] gap-1 border-purple-500/40 text-purple-600"
                            >
                                <Lock className="h-2.5 w-2.5" /> system
                            </Badge>
                        ) : !isBillable ? (
                            <Badge
                                variant="outline"
                                className="text-[10px] border-slate-500/40 text-slate-600"
                            >
                                free
                            </Badge>
                        ) : isAuto ? (
                            <Badge
                                variant="outline"
                                className="text-[10px] border-emerald-500/40 text-emerald-600"
                            >
                                auto
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="text-[10px] border-primary/50 text-primary"
                            >
                                ovr
                            </Badge>
                        )}
                    </div>
                    {isSystem ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {/* Provenance slot — future AUTO_FEE lines (PLAN §11) fill this. */}
                            Auto-managed
                            {item.systemKey ? `: ${item.systemKey.replaceAll("_", " ")}` : ""}
                        </p>
                    ) : null}
                </TableCell>

                {/* Buy/u */}
                <TableCell className="w-28">
                    {rowEditable ? (
                        <Input
                            value={buy}
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-right font-mono"
                            onChange={(e) => handleBuy(e.target.value)}
                            onBlur={flush}
                        />
                    ) : (
                        <span className="block text-right font-mono text-xs">
                            {buyNum.toFixed(2)}
                        </span>
                    )}
                </TableCell>

                {/* Sell/u */}
                <TableCell className="w-28">
                    {rowEditable && isBillable ? (
                        <Input
                            value={sell}
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="auto"
                            className="h-8 text-right font-mono"
                            onChange={(e) => handleSell(e.target.value)}
                            onBlur={flush}
                        />
                    ) : (
                        <span className="block text-right font-mono text-xs">
                            {isBillable ? effectiveSell.toFixed(2) : "0.00"}
                        </span>
                    )}
                </TableCell>

                {/* Margin% */}
                <TableCell className="w-24">
                    {rowEditable && isBillable && !margin.isFee ? (
                        <Input
                            value={marginValue}
                            type="number"
                            step="1"
                            placeholder={hasSell ? "—" : "auto"}
                            className="h-8 text-right font-mono"
                            onChange={(e) => handleMargin(e.target.value)}
                            onBlur={flush}
                        />
                    ) : (
                        <span className="block text-right font-mono text-xs text-muted-foreground">
                            {isBillable ? margin.display : "—"}
                        </span>
                    )}
                </TableCell>

                {/* Mode chip */}
                <TableCell className="w-16 text-center">
                    <Badge variant="outline" className={cn("text-[10px]", modeChip.className)}>
                        {modeChip.label}
                    </Badge>
                </TableCell>

                {/* Client visibility eye */}
                <TableCell className="w-12 text-center">
                    {allowVisibility && !isSystem ? (
                        <button
                            type="button"
                            onClick={() =>
                                onToggleVisibility({
                                    clientPriceVisible: !item.clientPriceVisible,
                                })
                            }
                            className={cn(
                                "inline-flex",
                                item.clientPriceVisible
                                    ? "text-primary"
                                    : "text-muted-foreground/50"
                            )}
                            aria-label={
                                item.clientPriceVisible
                                    ? "Hide price from client"
                                    : "Show price to client"
                            }
                            title={
                                item.clientPriceVisible
                                    ? "Price visible to client"
                                    : "Price hidden from client"
                            }
                        >
                            {item.clientPriceVisible ? (
                                <Eye className="h-4 w-4" />
                            ) : (
                                <EyeOff className="h-4 w-4" />
                            )}
                        </button>
                    ) : null}
                </TableCell>

                {/* Line total (sell side) */}
                <TableCell className="w-28 text-right font-mono text-xs font-semibold">
                    {lineTotal.toFixed(2)} {currency}
                </TableCell>

                {/* Row actions */}
                <TableCell className="w-20">
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
                <TableRow className="border-border/50 bg-muted/20 hover:bg-muted/20">
                    <TableCell />
                    <TableCell colSpan={8} className="py-3">
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
                                    <Label className="text-[11px]">Billing mode</Label>
                                    <Select
                                        value={billingMode}
                                        disabled={!rowEditable}
                                        onValueChange={(v) =>
                                            handleBillingMode(v as LineItemBillingMode)
                                        }
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BILLABLE">BILLABLE</SelectItem>
                                            <SelectItem value="NON_BILLABLE">
                                                NON_BILLABLE
                                            </SelectItem>
                                            <SelectItem value="COMPLIMENTARY">
                                                COMPLIMENTARY
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Notes</Label>
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
                            </div>

                            <div className="space-y-2 text-[11px] text-muted-foreground">
                                {perLineLocked && item.lockReason ? (
                                    <p className="text-amber-600">{item.lockReason}</p>
                                ) : null}
                                {/* Provenance — LIR/catalog/custom origin isn't distinctly
                                    carried on the row today; surface what's available. */}
                                <p>
                                    Type: <span className="font-mono">{item.lineItemType}</span>
                                    {item.serviceTypeId ? " · from catalog service" : ""}
                                </p>
                                {item.addedBy ? <p>Added by {item.addedBy}</p> : null}
                                {item.addedAt ? (
                                    <p>Added {new Date(item.addedAt).toLocaleString()}</p>
                                ) : null}
                                {item.metadata &&
                                typeof item.metadata === "object" &&
                                Object.keys(item.metadata).length > 0 ? (
                                    <pre className="mt-2 rounded border border-border/60 bg-background/70 p-2 text-[11px] whitespace-pre-wrap break-all">
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
