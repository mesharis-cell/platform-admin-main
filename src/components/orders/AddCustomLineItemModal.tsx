"use client";

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateCustomLineItem } from "@/hooks/use-order-line-items";
import type {
    LineItemBillingMode,
    ServiceCategory,
    TransportLineItemMetadata,
} from "@/types/hybrid-pricing";

interface AddCustomLineItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetId: string;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP";
    // Entity margin seed (prices.margin_percent → company default). In Model D it
    // is treated as an already-set second input (see the recency engine below):
    // it pre-fills margin as a ghost so a sell-first entry derives the buy
    // backward, and a buy-first entry derives the sell.
    seedMarginPercent?: number;
    currency?: string;
    // F7 quiet-amend (ADMIN + ORDER only): the caller resolved a "Update
    // quietly" choice before opening this modal. When true, the created line
    // amends the sent quote in place (no pull-back / QUOTE_REVISED).
    quietAmend?: boolean;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// Trimmed percent for display: 12.5 → "12.5", 30 → "30".
const fmtPct = (value: number) => String(Number(value.toFixed(2)));

// Lenient numeric parse (strips currency/space noise); NaN when unparseable.
const parseNum = (raw: string): number => {
    const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : NaN;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Model D — "Smart" (last-two-win) backward compute.
 *
 * The three linked figures are Buy/Unit, Sell/Unit and Margin %, bound by
 *   sell = buy × (1 + margin ÷ 100).
 * Only TWO can be independent at once; the third is *derived*. A recency queue
 * `rec = [freshest, mid, DERIVED]` remembers which two the user set most
 * recently — those are HELD, and the stalest (`rec[2]`) recomputes on every
 * edit. Editing a field moves it to freshest → the now-stalest recomputes.
 *
 * The margin SEED (prices.margin_percent) counts as already-set at empty, so:
 *   • empty     → Buy is the derived field (auto ↻)
 *   • sell 375  → rec=[sell,margin,buy] → Buy derives backward to 300
 *   • buy 300   → rec=[buy,margin,sell] → Sell derives to 375
 * Clearing a value marks it unknown WITHOUT reordering recency (a clear is not a
 * "set"); the derived field recomputes when its inputs return.
 *
 * This REPLACES the previous Layout-A "buy is the silent anchor" model, where
 * buy could never be derived and a sell edit only ever moved the margin.
 * ──────────────────────────────────────────────────────────────────────────── */
type SmartField = "buy" | "sell" | "margin";

interface SmartState {
    buy: number | null; // null = unknown/empty (blocked at submit)
    sell: number | null;
    margin: number | null; // null only in the buy=0 "Fee" case
    marginTouched: boolean; // false = still the seed ghost
    rec: SmartField[]; // [freshest, mid, DERIVED]
}

const freshSmart = (seed: number): SmartState => ({
    buy: null,
    sell: null,
    margin: seed,
    marginTouched: false,
    // Seed margin is pre-set, so buy is the derived (auto) field from empty.
    rec: ["margin", "sell", "buy"],
});

const bumpRec = (rec: SmartField[], f: SmartField): SmartField[] =>
    [f, ...rec.filter((x) => x !== f)] as SmartField[];

// Recompute the stalest (derived) field from the other two.
const recomputeSmart = (s: SmartState): SmartState => {
    const derived = s.rec[2];
    const next: SmartState = { ...s };
    if (derived === "sell") {
        if (s.buy != null && s.margin != null) next.sell = roundMoney(s.buy * (1 + s.margin / 100));
    } else if (derived === "buy") {
        if (s.sell != null && s.margin != null)
            next.buy = roundMoney(s.sell / (1 + s.margin / 100));
    } else {
        // margin — measured from buy + sell; buy=0 with a sell is a "Fee" (null).
        if (s.buy != null && s.sell != null)
            next.margin = s.buy > 0 ? roundMoney(((s.sell - s.buy) / s.buy) * 100) : null;
    }
    return next;
};

// Set a field the user typed: it becomes freshest, the new stalest recomputes.
const setSmartField = (s: SmartState, f: SmartField, value: number): SmartState => {
    const next: SmartState = { ...s, [f]: value };
    if (f === "margin") next.marginTouched = true;
    next.rec = bumpRec(s.rec, f);
    return recomputeSmart(next);
};

// Clear a value → unknown, WITHOUT reordering recency (clearing ≠ setting).
const clearSmartValue = (s: SmartState, f: "buy" | "sell"): SmartState =>
    recomputeSmart({ ...s, [f]: null });

// Clear margin → the seed ghost returns; buy/sell untouched; derived re-derives.
const clearSmartMargin = (s: SmartState, seed: number): SmartState =>
    recomputeSmart({ ...s, margin: seed, marginTouched: false });

// Submit contract: does the sell carry an explicit value the server must STORE
// (vs. one the server re-stamps from the seed margin)?
//   • sell is HELD (derived ≠ sell)             → SEND (explicit / backward-derived)
//   • sell is DERIVED at a NON-seed margin       → SEND (server can't reproduce it)
//   • sell is DERIVED at the seed margin          → OMIT (server stamps the same value)
// Mirrors the API custom-create stamp: BILLABLE + no sell → sell = buy×(1+seed/100).
const sellIsSent = (s: SmartState, seed: number): boolean => {
    if (s.rec[2] === "sell") {
        const atSeed = s.margin != null && Math.abs(s.margin - seed) < 0.005;
        return s.sell != null && !atSeed;
    }
    return s.sell != null;
};

/**
 * Add Custom Line Item — Model D "Smart" pricing.
 *   Row 1  Qty | Unit
 *   Row 2  Buy / Unit | Buy Total
 *   Row 3  Sell / Unit | Sell Total
 *   Row 4  Margin % | Margin Amount | Line Total
 *
 * Buy/Sell/Margin inter-derive via the recency engine above; totals and
 * margin-amount are just alternative inputs that back-derive their per-unit
 * figure through qty (Buy Total ⇒ Buy/Unit, Sell/Line Total ⇒ Sell/Unit, Margin
 * Amount ⇒ sell total = buy total + amount). The DERIVED field is always dimmed
 * and tagged "auto ↻"; the two held fields carry a "↻" pin to move "auto" there.
 *
 * ADMIN-only surface (admin repo, ADMIN role — middleware-enforced), so raw
 * buy/sell/margin is not a client-visibility leak. Payload contract is
 * unchanged from Layout A: a derived sell that equals the seed-margin result is
 * OMITTED (server re-stamps); a held / non-seed-derived sell is SENT as
 * sell_unit_rate (BILLABLE only). quiet-amend / create plumbing untouched.
 */
export function AddCustomLineItemModal({
    open,
    onOpenChange,
    targetId,
    purposeType = "ORDER",
    seedMarginPercent = 0,
    currency = "AED",
    quietAmend,
}: AddCustomLineItemModalProps) {
    const createLineItem = useCreateCustomLineItem(targetId, purposeType);

    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ServiceCategory>("OTHER");
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>("BILLABLE");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState("service");
    const [notes, setNotes] = useState("");
    const [tripDirection, setTripDirection] = useState<
        "DELIVERY" | "PICKUP" | "ACCESS" | "TRANSFER"
    >("DELIVERY");
    const [truckPlate, setTruckPlate] = useState("");
    const [driverName, setDriverName] = useState("");
    const [driverContact, setDriverContact] = useState("");
    const [truckSize, setTruckSize] = useState("");
    const [tailgateRequired, setTailgateRequired] = useState(false);
    const [manpower, setManpower] = useState("");
    const [transportNotes, setTransportNotes] = useState("");
    // Per-line logistics visibility. Off strips the line from the warehouse view.
    const [logisticsVisible, setLogisticsVisible] = useState(true);

    // ── Model D compute state ──
    const [smart, setSmart] = useState<SmartState>(() => freshSmart(seedMarginPercent));
    const [pricingTouched, setPricingTouched] = useState(false);
    // While a field is being typed, its raw text is kept as a draft so the live
    // recompute of the OTHER fields doesn't clobber the caret. Blur drops the
    // draft and the display snaps to the recomputed / formatted value.
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const setDraft = (key: string, value: string) => setDrafts((d) => ({ ...d, [key]: value }));
    const clearDraft = (key: string) =>
        setDrafts((d) => {
            if (!(key in d)) return d;
            const next = { ...d };
            delete next[key];
            return next;
        });

    // Fresh empty modal on every open — margin re-seeded from the (now-loaded)
    // entity seed. `seedRef` reads the latest seed without re-seeding mid-entry.
    const seedRef = useRef(seedMarginPercent);
    seedRef.current = seedMarginPercent;
    useEffect(() => {
        if (!open) return;
        setSmart(freshSmart(seedRef.current));
        setDrafts({});
        setPricingTouched(false);
    }, [open]);

    const quantityNum = Number(quantity || 0);
    const qtyNum = Number.isFinite(quantityNum) && quantityNum > 0 ? quantityNum : 0;
    // Sell overrides only apply to BILLABLE lines (server rejects a sell rate on
    // NON_BILLABLE/COMPLIMENTARY with a 400). Gate the fields + the payload so a
    // non-billable line can never send one. Mirrors AddCatalogLineItemModal.
    const isBillable = billingMode === "BILLABLE";
    const isTransportCategory = category === "TRANSPORT";
    const derivedField = smart.rec[2];

    // ── edit routing: every pricing input funnels into the recency engine ──
    const commitSmart = (mutator: (s: SmartState) => SmartState) => {
        setPricingTouched(true);
        setSmart(mutator);
    };
    // The per-unit sell implied by a sell-family field (sell / totals / margin amt).
    const sellUnitFrom = (field: string, raw: string): number | null => {
        const v = parseNum(raw);
        if (!Number.isFinite(v)) return null;
        if (field === "sell") return v;
        if (field === "sellTotal" || field === "lineTotal")
            return qtyNum > 0 ? roundMoney(v / qtyNum) : null;
        if (field === "marginAmount") {
            if (smart.buy == null || qtyNum <= 0) return null;
            return roundMoney(smart.buy + v / qtyNum);
        }
        return null;
    };
    const routeBuy = (field: "buy" | "buyTotal", raw: string) => {
        if (raw.trim() === "") return commitSmart((s) => clearSmartValue(s, "buy"));
        const n = parseNum(raw);
        const perUnit = field === "buy" ? n : qtyNum > 0 ? roundMoney(n / qtyNum) : NaN;
        if (!Number.isFinite(perUnit) || perUnit < 0) return;
        commitSmart((s) => setSmartField(s, "buy", roundMoney(perUnit)));
    };
    const routeSell = (field: "sell" | "sellTotal" | "lineTotal" | "marginAmount", raw: string) => {
        if (raw.trim() === "") return commitSmart((s) => clearSmartValue(s, "sell"));
        const perUnit = sellUnitFrom(field, raw);
        if (perUnit == null || !Number.isFinite(perUnit) || perUnit < 0) return;
        commitSmart((s) => setSmartField(s, "sell", roundMoney(perUnit)));
    };
    const routeMargin = (raw: string) => {
        if (raw.trim() === "") return commitSmart((s) => clearSmartMargin(s, seedRef.current));
        const m = parseNum(raw);
        if (!Number.isFinite(m)) return;
        commitSmart((s) => setSmartField(s, "margin", roundMoney(m)));
    };

    // ── display derivation (mirrors the recency state onto the field cells) ──
    const buyStr = smart.buy != null ? smart.buy.toFixed(2) : "";
    const buyIsDerived = isBillable && derivedField === "buy" && smart.buy != null;
    const buyRequiredHint = smart.buy == null && pricingTouched;

    const sellStr = !isBillable ? "0.00" : smart.sell != null ? smart.sell.toFixed(2) : "";
    const sellIsDerived = isBillable && derivedField === "sell" && smart.sell != null;

    const sellSent = sellIsSent(smart, seedMarginPercent);

    // Margin cell: measured from buy+sell when both known; "—" while unverifiable
    // (sell held, buy unknown); the seed ghost otherwise; "Fee" when buy=0.
    let marginStr = "";
    let marginIsFee = false;
    let marginGhost = false;
    let marginDash = false;
    if (!isBillable) {
        marginDash = true;
    } else if (smart.buy != null && smart.sell != null) {
        if (smart.buy > 0)
            marginStr = fmtPct(roundMoney(((smart.sell - smart.buy) / smart.buy) * 100));
        else marginIsFee = true;
    } else if (smart.buy == null && smart.sell != null && sellSent) {
        marginDash = true;
    } else if (smart.margin == null) {
        marginDash = true;
    } else {
        marginStr = fmtPct(roundMoney(smart.margin));
        marginGhost = !smart.marginTouched;
    }
    const marginIsDerived = isBillable && derivedField === "margin" && !marginDash && !marginIsFee;

    // Totals (derived displays / alternative inputs).
    const buyTotal = smart.buy != null ? roundMoney(smart.buy * qtyNum) : null;
    const sellTotal =
        isBillable && smart.sell != null ? roundMoney(smart.sell * qtyNum) : isBillable ? null : 0;
    const marginAmount =
        isBillable && smart.buy != null && smart.sell != null
            ? roundMoney((smart.sell - smart.buy) * qtyNum)
            : null;
    const lineTotal = isBillable ? sellTotal : 0;

    // ── the always-visible derived marker ("auto ↻") + click-to-pin affordance ──
    const SMART_LABEL: Record<SmartField, string> = { buy: "Buy", sell: "Sell", margin: "Margin" };
    const fieldMarker = (field: SmartField) => {
        if (!isBillable) return null;
        if (derivedField !== field) return null;
        return (
            <span
                className="ml-1 inline-flex items-center gap-0.5 rounded border border-primary/40 bg-primary/10 px-1 py-0.5 align-middle text-[9px] font-semibold uppercase tracking-wide text-primary"
                title={`${SMART_LABEL[field]} recalculates automatically`}
            >
                <RefreshCw className="h-2.5 w-2.5" />
                auto
            </span>
        );
    };
    // Derived cells read "computed but still yours to take over": dimmed fill +
    // dashed underline that goes solid on hover/focus (the editable-cell language).
    const derivedCell =
        "bg-muted/60 text-muted-foreground border-dashed hover:border-solid focus-visible:border-solid";

    const handleAdd = async () => {
        if (!description.trim()) {
            toast.error("Please enter a description");
            return;
        }
        if (!unit.trim()) {
            toast.error("Please enter a unit");
            return;
        }
        if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }
        // Model D: buy is REQUIRED — an empty/unknown buy blocks the POST (it is
        // the auto field until you supply the two you know).
        if (smart.buy == null || !Number.isFinite(smart.buy) || smart.buy < 0) {
            toast.error("Buy unit rate is required");
            return;
        }
        const buyRate = roundMoney(smart.buy);

        let metadata: TransportLineItemMetadata | undefined;
        if (isTransportCategory) {
            const manpowerValue = manpower.trim() ? Number(manpower) : undefined;
            if (
                manpowerValue !== undefined &&
                (!Number.isInteger(manpowerValue) || manpowerValue < 0)
            ) {
                toast.error("Manpower must be a non-negative integer");
                return;
            }
            metadata = {
                trip_direction: tripDirection,
                truck_plate: truckPlate.trim() || undefined,
                driver_name: driverName.trim() || undefined,
                driver_contact: driverContact.trim() || undefined,
                truck_size: truckSize.trim() || undefined,
                tailgate_required: tailgateRequired,
                manpower: manpowerValue,
                notes: transportNotes.trim() || undefined,
            };
        }

        // Sell payload: SEND when the sell is held / non-seed-derived; OMIT when
        // it is the seed-margin derive (server re-stamps the identical value).
        // BILLABLE-only: never send a sell override for a non-billable line.
        let sellPayload: number | undefined;
        if (isBillable && sellSent && smart.sell != null) {
            if (!Number.isFinite(smart.sell) || smart.sell < 0) {
                toast.error("Please enter a valid sell rate");
                return;
            }
            sellPayload = roundMoney(smart.sell);
        }

        try {
            await createLineItem.mutateAsync({
                description: description.trim(),
                category,
                billing_mode: billingMode,
                quantity: quantityNum,
                unit: unit.trim(),
                unit_rate: buyRate,
                notes: notes || undefined,
                metadata,
                logistics_visible: logisticsVisible,
                ...(sellPayload !== undefined ? { sell_unit_rate: sellPayload } : {}),
                ...(quietAmend ? { quiet_amend: true } : {}),
            });
            toast.success("Custom line item added");
            onOpenChange(false);
            setDescription("");
            setCategory("OTHER");
            setBillingMode("BILLABLE");
            setQuantity("1");
            setUnit("service");
            setSmart(freshSmart(seedRef.current));
            setDrafts({});
            setPricingTouched(false);
            setNotes("");
            setTripDirection("DELIVERY");
            setTruckPlate("");
            setDriverName("");
            setDriverContact("");
            setTruckSize("");
            setTailgateRequired(false);
            setManpower("");
            setTransportNotes("");
            setLogisticsVisible(true);
        } catch (error: any) {
            toast.error(error.message || "Failed to add line item");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0"
                onKeyDown={(e) => {
                    // Enter in any text input submits the form (owner smoke feedback).
                    // Textareas keep their newline behaviour; Select triggers (buttons)
                    // are unaffected.
                    if (
                        e.key === "Enter" &&
                        (e.target as HTMLElement).tagName === "INPUT" &&
                        !createLineItem.isPending
                    ) {
                        e.preventDefault();
                        void handleAdd();
                    }
                }}
            >
                <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
                    <DialogTitle>Add Custom Line Item</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    <div>
                        <Label>
                            Description <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Rush Design Fee, Special Packaging"
                            maxLength={200}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>
                                Category <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={category}
                                onValueChange={(value) => setCategory(value as ServiceCategory)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ASSEMBLY">ASSEMBLY</SelectItem>
                                    <SelectItem value="EQUIPMENT">EQUIPMENT</SelectItem>
                                    <SelectItem value="HANDLING">HANDLING</SelectItem>
                                    <SelectItem value="RESKIN">RESKIN</SelectItem>
                                    <SelectItem value="TRANSPORT">TRANSPORT</SelectItem>
                                    <SelectItem value="OTHER">OTHER</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>
                                Billing Mode <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={billingMode}
                                onValueChange={(value) =>
                                    setBillingMode(value as LineItemBillingMode)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select billing mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BILLABLE">BILLABLE</SelectItem>
                                    <SelectItem value="NON_BILLABLE">NON-BILLABLE</SelectItem>
                                    <SelectItem value="COMPLIMENTARY">COMPLIMENTARY</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ── Pricing — Model D smart compute; every figure visible + linked ── */}
                    <div className="space-y-3 rounded-md border border-primary/30 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Pricing
                            </p>
                            <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                Entity seed {fmtPct(seedMarginPercent)}%
                            </span>
                        </div>

                        {/* Model D explainer — what the dimmed "auto" field means. */}
                        {isBillable ? (
                            <div className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
                                <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded border border-primary/40 bg-primary/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                    <RefreshCw className="h-2.5 w-2.5" />
                                    Smart
                                </span>
                                <span>
                                    The <span className="font-medium text-foreground">dimmed</span>{" "}
                                    field is the one that recalculates — set the two you know, it
                                    solves the third.
                                </span>
                            </div>
                        ) : null}

                        {/* Row 1 — Qty | Unit */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>
                                    Qty <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="1"
                                />
                            </div>
                            <div>
                                <Label>
                                    Unit <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="service"
                                    maxLength={20}
                                />
                            </div>
                        </div>

                        {/* Row 2 — Buy / Unit | Buy Total */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>
                                    Buy / Unit ({currency}){" "}
                                    <span className="text-destructive">*</span>
                                    {fieldMarker("buy")}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={drafts.buy ?? buyStr}
                                    placeholder="200.00"
                                    className={cn(
                                        "text-right font-mono tabular-nums",
                                        buyIsDerived && derivedCell
                                    )}
                                    onChange={(e) => {
                                        setDraft("buy", e.target.value);
                                        routeBuy("buy", e.target.value);
                                    }}
                                    onBlur={() => clearDraft("buy")}
                                />
                                {buyRequiredHint ? (
                                    <p className="mt-1 text-[10px] font-medium text-destructive">
                                        Required at submit
                                    </p>
                                ) : null}
                            </div>
                            <div>
                                <Label>Buy Total ({currency})</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                        drafts.buyTotal ??
                                        (buyTotal != null ? buyTotal.toFixed(2) : "")
                                    }
                                    placeholder="—"
                                    className="text-right font-mono tabular-nums"
                                    onChange={(e) => {
                                        setDraft("buyTotal", e.target.value);
                                        routeBuy("buyTotal", e.target.value);
                                    }}
                                    onBlur={() => clearDraft("buyTotal")}
                                />
                            </div>
                        </div>

                        {/* Row 3 — Sell / Unit | Sell Total */}
                        <div className={cn("grid grid-cols-2 gap-3", !isBillable && "opacity-60")}>
                            <div>
                                <Label>
                                    Sell / Unit ({currency}){fieldMarker("sell")}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={!isBillable ? "0.00" : (drafts.sell ?? sellStr)}
                                    placeholder="0.00"
                                    disabled={!isBillable}
                                    className={cn(
                                        "text-right font-mono tabular-nums",
                                        !isBillable && "bg-muted",
                                        sellIsDerived && derivedCell
                                    )}
                                    onChange={(e) => {
                                        setDraft("sell", e.target.value);
                                        routeSell("sell", e.target.value);
                                    }}
                                    onBlur={() => clearDraft("sell")}
                                />
                            </div>
                            <div>
                                <Label>Sell Total ({currency})</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                        !isBillable
                                            ? "0.00"
                                            : (drafts.sellTotal ??
                                              (sellTotal != null ? sellTotal.toFixed(2) : ""))
                                    }
                                    placeholder="—"
                                    disabled={!isBillable}
                                    className={cn(
                                        "text-right font-mono tabular-nums",
                                        !isBillable && "bg-muted"
                                    )}
                                    onChange={(e) => {
                                        setDraft("sellTotal", e.target.value);
                                        routeSell("sellTotal", e.target.value);
                                    }}
                                    onBlur={() => clearDraft("sellTotal")}
                                />
                            </div>
                        </div>

                        {/* Row 4 — Margin % | Margin Amount | Line Total */}
                        <div className={cn("grid grid-cols-3 gap-3", !isBillable && "opacity-60")}>
                            <div>
                                <Label>Margin %{fieldMarker("margin")}</Label>
                                {marginIsFee && isBillable ? (
                                    <Input
                                        value="Fee"
                                        readOnly
                                        tabIndex={-1}
                                        className="bg-muted text-center"
                                    />
                                ) : (
                                    <Input
                                        type="number"
                                        step="1"
                                        value={
                                            !isBillable
                                                ? ""
                                                : (drafts.margin ?? (marginDash ? "" : marginStr))
                                        }
                                        placeholder={
                                            isBillable && !marginDash
                                                ? `${fmtPct(seedMarginPercent)}`
                                                : "—"
                                        }
                                        disabled={!isBillable}
                                        className={cn(
                                            "text-right font-mono tabular-nums",
                                            !isBillable && "bg-muted",
                                            marginGhost && "italic text-muted-foreground",
                                            marginIsDerived && derivedCell
                                        )}
                                        onChange={(e) => {
                                            setDraft("margin", e.target.value);
                                            routeMargin(e.target.value);
                                        }}
                                        onBlur={() => clearDraft("margin")}
                                    />
                                )}
                            </div>
                            <div>
                                <Label>Margin Amount ({currency})</Label>
                                <Input
                                    type={isBillable ? "number" : "text"}
                                    step="0.01"
                                    value={
                                        !isBillable
                                            ? "—"
                                            : (drafts.marginAmount ??
                                              (marginAmount != null ? marginAmount.toFixed(2) : ""))
                                    }
                                    placeholder="—"
                                    disabled={!isBillable}
                                    className={cn(
                                        "text-right font-mono tabular-nums",
                                        !isBillable && "bg-muted"
                                    )}
                                    onChange={(e) => {
                                        setDraft("marginAmount", e.target.value);
                                        routeSell("marginAmount", e.target.value);
                                    }}
                                    onBlur={() => clearDraft("marginAmount")}
                                />
                            </div>
                            <div>
                                <Label>Line Total ({currency})</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                        !isBillable
                                            ? "0.00"
                                            : (drafts.lineTotal ??
                                              (lineTotal != null ? lineTotal.toFixed(2) : ""))
                                    }
                                    placeholder="—"
                                    disabled={!isBillable}
                                    className={cn(
                                        "text-right font-mono text-base font-semibold tabular-nums",
                                        !isBillable && "bg-muted"
                                    )}
                                    onChange={(e) => {
                                        setDraft("lineTotal", e.target.value);
                                        routeSell("lineTotal", e.target.value);
                                    }}
                                    onBlur={() => clearDraft("lineTotal")}
                                />
                            </div>
                        </div>

                        {/* Context line — reflects the omit-vs-send submit behaviour. */}
                        {!isBillable ? (
                            <p className="text-[11px] leading-snug text-muted-foreground">
                                {billingMode === "COMPLIMENTARY"
                                    ? "Complimentary — shown to the client as complimentary; charged 0.00."
                                    : "Non-billable — internal cost only; never shown or charged to the client."}
                            </p>
                        ) : smart.buy == null ? (
                            <p className="text-[11px] leading-snug text-muted-foreground">
                                Buy is the <span className="font-medium text-primary">auto</span>{" "}
                                field — enter the Sell and Margin you know and it fills in backward.
                                Buy is required to add the line.
                            </p>
                        ) : sellSent ? (
                            <p className="text-[11px] leading-snug text-muted-foreground">
                                Sell is set explicitly — it will be sent as this line&rsquo;s sell
                                price.
                            </p>
                        ) : (
                            <p className="text-[11px] leading-snug text-muted-foreground">
                                Sell follows the entity margin (auto) — the server stamps it;
                                nothing extra is sent.
                            </p>
                        )}
                    </div>

                    {isTransportCategory && (
                        <div className="space-y-4 rounded-md border border-border p-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Transport Metadata
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label>Trip Direction</Label>
                                    <Select
                                        value={tripDirection}
                                        onValueChange={(value) =>
                                            setTripDirection(
                                                value as
                                                    | "DELIVERY"
                                                    | "PICKUP"
                                                    | "ACCESS"
                                                    | "TRANSFER"
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DELIVERY">Delivery</SelectItem>
                                            <SelectItem value="PICKUP">Pickup</SelectItem>
                                            <SelectItem value="ACCESS">Access</SelectItem>
                                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Truck License Plate</Label>
                                    <Input
                                        value={truckPlate}
                                        onChange={(event) => setTruckPlate(event.target.value)}
                                        placeholder="e.g., ABC-1234"
                                        maxLength={80}
                                    />
                                </div>
                                <div>
                                    <Label>Driver Name</Label>
                                    <Input
                                        value={driverName}
                                        onChange={(event) => setDriverName(event.target.value)}
                                        placeholder="Driver full name"
                                        maxLength={120}
                                    />
                                </div>
                                <div>
                                    <Label>Driver Contact Number</Label>
                                    <Input
                                        value={driverContact}
                                        onChange={(event) => setDriverContact(event.target.value)}
                                        placeholder="+971..."
                                        maxLength={80}
                                    />
                                </div>
                                <div>
                                    <Label>Truck Size</Label>
                                    <Input
                                        value={truckSize}
                                        onChange={(event) => setTruckSize(event.target.value)}
                                        placeholder="e.g., 3 Ton"
                                        maxLength={80}
                                    />
                                </div>
                                <div>
                                    <Label>Manpower</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={manpower}
                                        onChange={(event) => setManpower(event.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="custom-transport-tailgate"
                                    checked={tailgateRequired}
                                    onCheckedChange={(value) => setTailgateRequired(!!value)}
                                />
                                <Label htmlFor="custom-transport-tailgate">Tailgate Required</Label>
                            </div>
                            <div>
                                <Label>Transport Notes</Label>
                                <Textarea
                                    value={transportNotes}
                                    onChange={(event) => setTransportNotes(event.target.value)}
                                    placeholder="Operational notes for logistics team..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    {/* F5: logistics-visibility toggle sits ABOVE Notes so it's always
                        visible without scrolling. Off strips this line from the
                        warehouse view entirely. */}
                    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Label className="text-sm">Visible to logistics</Label>
                        <span className="ml-auto mr-2 text-[11px] text-muted-foreground">
                            off = hidden from the warehouse view
                        </span>
                        <Switch checked={logisticsVisible} onCheckedChange={setLogisticsVisible} />
                    </div>

                    <div>
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Internal notes..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createLineItem.isPending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleAdd} disabled={createLineItem.isPending}>
                        {createLineItem.isPending ? "Adding..." : "Add Custom Item"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
