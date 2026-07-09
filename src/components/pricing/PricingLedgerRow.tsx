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
import {
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    Link2,
    Lock,
    RotateCcw,
    Trash2,
} from "lucide-react";
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

// Inline-edit affordance (G7): a persistent dashed 1px UNDERLINE at rest so the
// cell reads as editable, upgrading to a solid input border + ring on
// hover/focus. The other three sides stay 1px transparent so the box never
// reflows when the border becomes visible. Read-only spans get no underline
// (IDLE_MONEY) — absence of the underline is the not-editable signal. Centered
// (G6) to match the centered column headers/cells.
const REVEAL_INPUT =
    "h-7 px-2 text-center font-mono text-xs md:text-xs tabular-nums border border-transparent border-dashed border-b-muted-foreground/40 bg-transparent shadow-none hover:border-solid hover:border-input focus:border-solid focus:border-input focus:bg-background";

// Same dashed-underline affordance for the in-table billing-mode Select trigger.
const REVEAL_SELECT =
    "h-7 justify-center border border-transparent border-dashed border-b-muted-foreground/40 bg-transparent px-2 text-xs shadow-none hover:border-solid hover:border-input focus:border-solid focus:border-input";

const IDLE_MONEY = "block text-center font-mono text-xs tabular-nums";

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
    // Resolves true on success, false on a caught+toasted failure (G5 lets the
    // folded Save roll a price-toggle draft back on a rejected PATCH).
    onToggleVisibility: (next: {
        clientPriceVisible?: boolean;
        clientVisible?: boolean;
        logisticsVisible?: boolean;
    }) => Promise<boolean> | void;
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
    // G8: post-acceptance client-visibility lock (ORDER only; the API sends
    // can_edit_client_visibility=false when financial_status is locked). Absent
    // → treat as editable. Disables the client eye + the folded price toggle.
    const clientVisibilityLocked = item.canEditClientVisibility === false;

    const [expanded, setExpanded] = useState(false);
    // Main-table cells (debounced autosave via pendingRef/flush).
    const [buy, setBuy] = useState(String(item.unitRate ?? 0));
    const [sell, setSell] = useState(() => {
        const o = readSellOverride(item);
        return o != null ? String(o) : "";
    });
    const [qty, setQty] = useState(String(item.quantity ?? 1));
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>(
        (item.billingMode || "BILLABLE") as LineItemBillingMode
    );
    // Folded-section DRAFTS (G5) — no autosave; committed only via the Save
    // button. unit + notes go in one PUT; the price toggle via PATCH visibility.
    const [notes, setNotes] = useState(item.notes || "");
    const [unitDraft, setUnitDraft] = useState(item.unit || "");
    const [priceVisibleDraft, setPriceVisibleDraft] = useState(item.clientPriceVisible === true);

    const pendingRef = useRef<UpdateLineItemRequest>({});
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);

    // Which folded drafts the user has touched since the last sync — guards the
    // resync effect from clobbering an in-progress edit on an unrelated refetch
    // (e.g. editing a main-table cell triggers a refetch while notes is dirty).
    const foldedTouchedRef = useRef({ unit: false, notes: false, priceVisible: false });

    // Folded Save feedback — reuses the Saving…/Saved ✓ pattern (G5).
    const [foldedSaveStatus, setFoldedSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const foldedSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Resync from the server row once no local edit is pending (post-save
    // reconciliation). Main cells resync whenever no debounced write is pending;
    // folded drafts resync only when the user hasn't touched them (else we'd wipe
    // an unsaved Save-draft on an unrelated refetch).
    useEffect(() => {
        if (inFlightRef.current || Object.keys(pendingRef.current).length > 0) return;
        setBuy(String(item.unitRate ?? 0));
        const o = readSellOverride(item);
        setSell(o != null ? String(o) : "");
        setQty(String(item.quantity ?? 1));
        setBillingMode((item.billingMode || "BILLABLE") as LineItemBillingMode);
        if (!foldedTouchedRef.current.notes) setNotes(item.notes || "");
        if (!foldedTouchedRef.current.unit) setUnitDraft(item.unit || "");
        if (!foldedTouchedRef.current.priceVisible)
            setPriceVisibleDraft(item.clientPriceVisible === true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        item.updatedAt,
        item.unitRate,
        item.sellUnitRate,
        item.sell_unit_rate,
        item.quantity,
        item.unit,
        item.notes,
        item.clientPriceVisible,
    ]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (foldedSaveTimerRef.current) clearTimeout(foldedSaveTimerRef.current);
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
            // Rollback the touched main-table fields to the server row on failure.
            if ("unitRate" in payload) setBuy(String(item.unitRate ?? 0));
            if ("sellUnitRate" in payload) {
                const o = readSellOverride(item);
                setSell(o != null ? String(o) : "");
            }
            if ("quantity" in payload) setQty(String(item.quantity ?? 1));
            if ("billingMode" in payload)
                setBillingMode((item.billingMode || "BILLABLE") as LineItemBillingMode);
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
    // --- folded-section drafts (G5) — local only, committed via Save ---
    const handleNotesDraft = (value: string) => {
        setNotes(value);
        foldedTouchedRef.current.notes = true;
    };
    const handleUnitDraft = (value: string) => {
        setUnitDraft(value);
        foldedTouchedRef.current.unit = true;
    };
    const handlePriceVisibleDraft = (value: boolean) => {
        setPriceVisibleDraft(value);
        foldedTouchedRef.current.priceVisible = true;
    };

    // Per-field dirtiness (Save button gate). Compared against the server row.
    const notesDirty = notes !== (item.notes || "");
    const unitDirty = unitDraft !== (item.unit || "");
    const priceVisibleDirty = priceVisibleDraft !== (item.clientPriceVisible === true);
    const foldedDirty = notesDirty || unitDirty || priceVisibleDirty;

    const resetFoldedDrafts = () => {
        setNotes(item.notes || "");
        setUnitDraft(item.unit || "");
        setPriceVisibleDraft(item.clientPriceVisible === true);
        foldedTouchedRef.current = { unit: false, notes: false, priceVisible: false };
    };

    // G5 explicit Save: unit/notes → one PUT (unit is a pricing field, so on a
    // QUOTED order the confirm gate fires via onUpdate exactly like a cell edit);
    // a changed price toggle → the visibility PATCH (REBUILD_ONLY server-side, no
    // gate). PUT first, then PATCH — if the PUT fails (incl. amend-cancel) nothing
    // else runs and all drafts roll back; if only the PATCH fails, the price draft
    // rolls back while the committed unit/notes stay.
    const handleFoldedSave = async () => {
        if (!foldedDirty || foldedSaveStatus === "saving") return;
        if (foldedSaveTimerRef.current) clearTimeout(foldedSaveTimerRef.current);
        setFoldedSaveStatus("saving");
        try {
            const putPayload: UpdateLineItemRequest = {};
            if (unitDirty) putPayload.unit = unitDraft;
            if (notesDirty) putPayload.notes = notes;
            if (Object.keys(putPayload).length > 0) {
                await onUpdate(putPayload);
                foldedTouchedRef.current.unit = false;
                foldedTouchedRef.current.notes = false;
            }
            if (priceVisibleDirty) {
                const ok = await onToggleVisibility({ clientPriceVisible: priceVisibleDraft });
                if (ok === false) {
                    // PATCH rejected (toasted by the parent) — roll the price draft
                    // back; the unit/notes PUT already committed.
                    setPriceVisibleDraft(item.clientPriceVisible === true);
                    foldedTouchedRef.current.priceVisible = false;
                    setFoldedSaveStatus("idle");
                    return;
                }
                foldedTouchedRef.current.priceVisible = false;
            }
            setFoldedSaveStatus("saved");
            foldedSaveTimerRef.current = setTimeout(() => setFoldedSaveStatus("idle"), 1500);
        } catch {
            // PUT failed (or the QUOTED confirm was cancelled) — roll every draft
            // back to the server row; the price toggle was never attempted.
            resetFoldedDrafts();
            setFoldedSaveStatus("idle");
        }
    };

    // --- derived display state ---
    const buyNum = Number(buy || 0);
    const sellTrimmed = sell.trim();
    const hasSell = sellTrimmed !== "";
    const sellNum = hasSell ? Number(sellTrimmed) : NaN;
    const autoSell = roundMoney(buyNum * (1 + seedMarginPercent / 100));
    const effectiveSell = hasSell ? sellNum : autoSell;
    const margin = deriveMargin(buyNum, effectiveSell);
    // Always show the computed % — even when the sell is seed-derived (owner:
    // values are always visible, never an "auto" placeholder).
    const marginValue = margin.percent != null ? String(margin.percent) : "";
    const isBillable = billingMode === "BILLABLE";
    // "auto" when the stamped sell equals the seed-derived sell; "ovr" otherwise.
    const isAuto = !hasSell || Math.abs(effectiveSell - autoSell) < 0.005;
    // Quantity (live) drives the two derived money columns below (R10/R11).
    const qtyNum = Math.max(1, Math.floor(Number(qty) || 1));
    // R11: the row Total column is the SELL total (qty × effective sell/unit),
    // display-derived so it tracks live edits. Non-billable lines sell for 0.
    // effectiveSell already falls back to the seed-margin sell when no explicit
    // override is stamped, so a numeric total is always available.
    const sellTotalLine = isBillable ? roundMoney(effectiveSell * qtyNum) : 0;
    // R10: line-level margin amount (sell − buy, times qty) as a money figure.
    const marginAmountLine = isBillable ? roundMoney((effectiveSell - buyNum) * qtyNum) : 0;
    // Provenance (R3): line created from an approved logistics line-item request.
    const isLirOrigin = item.lirOrigin === true;

    // --- left-edge policy stripe (replaces the old badges) ---
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
                <TableCell className="w-36 py-1.5 text-center">
                    {rowEditable ? (
                        <Select
                            value={billingMode}
                            onValueChange={(v) => handleBillingMode(v as LineItemBillingMode)}
                        >
                            <SelectTrigger className={cn(REVEAL_SELECT, modeMeta.text)}>
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

                {/* Qty — inline-editable in the main table (G4), debounced like
                    the other pricing cells. Read-only value when the row is
                    locked/SYSTEM (no dashed underline). */}
                <TableCell className="w-20 py-1.5">
                    {rowEditable ? (
                        <Input
                            value={qty}
                            type="number"
                            min={1}
                            step={1}
                            className={REVEAL_INPUT}
                            onChange={(e) => handleQty(e.target.value)}
                            onBlur={flush}
                            onKeyDown={handleEnter}
                        />
                    ) : (
                        <span className={IDLE_MONEY}>{qtyNum}</span>
                    )}
                </TableCell>

                {/* Buy / Unit — reveal-on-focus. LIR-origin lines carry a small
                    provenance hint (R3): the rate came from an approved logistics
                    request. ADMIN stays editable; LOGISTICS is locked server-side. */}
                <TableCell className="w-28 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                        {isLirOrigin ? (
                            <span
                                className="shrink-0 text-muted-foreground/60"
                                title="Unit price set by an approved logistics request. You can still edit it as admin."
                                aria-label="Unit price from an approved logistics request"
                            >
                                <Link2 className="h-3 w-3" />
                            </span>
                        ) : null}
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
                    </div>
                </TableCell>

                {/* Sell / Unit — reveal-on-focus. Always shows the number (owner:
                    no "auto" placeholder) — the seed-derived value renders in
                    normal foreground (G6) until an explicit override is stamped. */}
                <TableCell className="w-28 py-1.5">
                    {rowEditable && isBillable ? (
                        <Input
                            value={hasSell ? sell : autoSell.toFixed(2)}
                            type="number"
                            min={0}
                            step="0.01"
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

                {/* Margin % — reveal-on-focus */}
                <TableCell className="w-24 py-1.5">
                    {rowEditable && isBillable && !margin.isFee ? (
                        <Input
                            value={marginValue}
                            type="number"
                            step="1"
                            placeholder="—"
                            className={REVEAL_INPUT}
                            onChange={(e) => handleMargin(e.target.value)}
                            onBlur={flush}
                            onKeyDown={handleEnter}
                        />
                    ) : (
                        <span className={IDLE_MONEY}>{isBillable ? margin.display : "—"}</span>
                    )}
                </TableCell>

                {/* Margin Amount (R10) — derived money, read-only. */}
                <TableCell className="w-28 py-1.5">
                    <span className={IDLE_MONEY}>
                        {isBillable ? marginAmountLine.toFixed(2) : "—"}
                    </span>
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

                {/* Client visibility eye (whole-line). NON_BILLABLE = forced off;
                    post-acceptance lock (G8) shows current state disabled. */}
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
                                title={`Reset to entity margin (${seedMarginPercent}%)`}
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
                    <TableCell colSpan={11} className="py-3">
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
                                {/* Unit is a pricing field (edited here as a draft, G5).
                                    Quantity now lives in the main table (G4). */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px]">Unit</Label>
                                        <Input
                                            value={unitDraft}
                                            placeholder="unit"
                                            disabled={!rowEditable}
                                            className="h-8"
                                            onChange={(e) => handleUnitDraft(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Notes</Label>
                                    <Textarea
                                        value={notes}
                                        rows={2}
                                        disabled={
                                            !rowEditable && item.canEditMetadataFields === false
                                        }
                                        onChange={(e) => handleNotesDraft(e.target.value)}
                                    />
                                </div>
                                {/* Per-line PRICE visibility to the client — the third
                                    visibility control (separate from the whole-line Client
                                    eye). Default off: the client sees the line but not its
                                    individual sell figure unless this is on. Only meaningful
                                    on a billable, client-visible line. Draft (G5) + locked
                                    after quote acceptance (G8). */}
                                {!isSystem && isBillable && !clientForcedOff ? (
                                    <div
                                        className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
                                        title={
                                            clientVisibilityLocked
                                                ? "Locked after quote acceptance"
                                                : undefined
                                        }
                                    >
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
                                            checked={priceVisibleDraft}
                                            disabled={!rowEditable || clientVisibilityLocked}
                                            onCheckedChange={handlePriceVisibleDraft}
                                        />
                                    </div>
                                ) : null}
                                {/* Explicit Save for the folded drafts (G5) — disabled
                                    until dirty. Shown whenever any folded field is
                                    editable (rowEditable, or notes-only post-lock). */}
                                {rowEditable || item.canEditMetadataFields !== false ? (
                                    <div className="flex items-center gap-2 pt-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={!foldedDirty || foldedSaveStatus === "saving"}
                                            onClick={() => void handleFoldedSave()}
                                        >
                                            Save
                                        </Button>
                                        {foldedSaveStatus === "saving" ? (
                                            <span className="text-[10px] text-muted-foreground">
                                                Saving…
                                            </span>
                                        ) : foldedSaveStatus === "saved" ? (
                                            <span className="text-[10px] text-emerald-600">
                                                Saved ✓
                                            </span>
                                        ) : foldedDirty ? (
                                            <span className="text-[10px] text-muted-foreground">
                                                Unsaved changes
                                            </span>
                                        ) : null}
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
                                            Reset to entity margin ({seedMarginPercent}%)
                                        </button>
                                    </p>
                                ) : null}
                                {isLirOrigin ? (
                                    <p className="flex items-center gap-1.5 text-foreground/80">
                                        <Link2 className="h-3 w-3 shrink-0" />
                                        Unit price set by an approved logistics request
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
