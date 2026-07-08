"use client";

import { useState } from "react";
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
import { Eye } from "lucide-react";
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
    // Entity margin seed (prices.margin_percent → company default) — used to
    // DISPLAY the derived sell/margin as real numbers (owner: never "auto").
    seedMarginPercent?: number;
    currency?: string;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// Trimmed percent for display: 12.5 → "12.5", 30 → "30".
const fmtPct = (value: number) => String(Number(value.toFixed(2)));

// margin% display token from buy + sell. buy=0 with sell>0 = "Fee".
const deriveMargin = (
    buy: number,
    sell: number
): { display: string; isFee: boolean; percent: number | null } => {
    if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
        return { display: "—", isFee: false, percent: null };
    }
    if (buy > 0) {
        const pct = Math.round(((sell - buy) / buy) * 10000) / 100;
        return { display: `${Number(pct.toFixed(2))}%`, isFee: false, percent: pct };
    }
    if (sell > 0) return { display: "Fee", isFee: true, percent: null };
    return { display: "—", isFee: false, percent: null };
};

/**
 * Add Custom Line Item — Layout A ("single pricing strip", owner pick) with the
 * owner's row organization:
 *   Row 1  Qty | Unit
 *   Row 2  Buy / Unit | Buy Total
 *   Row 3  Sell / Unit | Sell Total
 *   Row 4  Margin % | Margin Amount | Line Total
 *
 * ALL inputs are linked bidirectionally: units are the canonical state and
 * every other figure back-derives them — Buy Total ⇒ Buy/Unit (÷ qty), Sell
 * Total / Line Total ⇒ Sell/Unit (÷ qty), Margin Amount ⇒ sell total = buy
 * total + amount, Margin % ⇔ Sell/Unit. Editing any field recomputes the rest.
 * Sell-side figures always SHOW their computed values (seeded from the entity
 * margin) — never an "auto" placeholder. Until edited they are derived (muted,
 * live-recomputing as Buy/Qty change); editing any sell-side figure stamps an
 * override (amber marker + reset). Payload contract unchanged: derived mode
 * omits sell_unit_rate; override sends it (BILLABLE only).
 */
export function AddCustomLineItemModal({
    open,
    onOpenChange,
    targetId,
    purposeType = "ORDER",
    seedMarginPercent = 0,
    currency = "AED",
}: AddCustomLineItemModalProps) {
    const createLineItem = useCreateCustomLineItem(targetId, purposeType);

    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ServiceCategory>("OTHER");
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>("BILLABLE");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState("service");
    const [unitRate, setUnitRate] = useState("");
    // Per-unit sell. null = DERIVED (seeded from the entity margin, recomputes
    // live as Buy changes and is OMITTED from the payload — the server stamps
    // the same seed-derived value). A string = OVERRIDDEN (sent on create).
    const [sellOverride, setSellOverride] = useState<string | null>(null);
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

    const quantityNum = Number(quantity || 0);
    const unitRateNum = Number(unitRate || 0);
    // Sell overrides only apply to BILLABLE lines (server rejects a sell rate on
    // NON_BILLABLE/COMPLIMENTARY with a 400). Gate the fields + the payload so a
    // non-billable line can never send one. Mirrors AddCatalogLineItemModal.
    const isBillable = billingMode === "BILLABLE";
    const isTransportCategory = category === "TRANSPORT";

    // --- linked live computation (all rows recompute across inputs) ---
    const isOverridden = sellOverride !== null;
    const derivedSellUnit = roundMoney(unitRateNum * (1 + seedMarginPercent / 100));
    const overrideNum = isOverridden ? Number(sellOverride) : NaN;
    const effectiveSellUnit =
        isOverridden && Number.isFinite(overrideNum) ? overrideNum : derivedSellUnit;
    const margin = deriveMargin(unitRateNum, effectiveSellUnit);
    const buyTotal =
        Number.isFinite(quantityNum) && Number.isFinite(unitRateNum)
            ? roundMoney(quantityNum * unitRateNum)
            : 0;
    const sellTotal =
        isBillable && Number.isFinite(quantityNum) && Number.isFinite(effectiveSellUnit)
            ? roundMoney(quantityNum * effectiveSellUnit)
            : 0;
    const marginAmount = isBillable ? roundMoney(sellTotal - buyTotal) : 0;
    // The line's total — what it adds to the client side. Non-billable and
    // complimentary lines are never charged, so their line total is 0.
    const lineTotal = isBillable ? sellTotal : 0;

    // ── bidirectional linking (owner spec): editing ANY field recomputes the
    // rest. Units are canonical state; totals/margin back-derive the units.
    // While a derived field is being typed in, its raw text is kept as a draft
    // so the live recompute doesn't clobber the cursor; blur drops the draft
    // and the display snaps to the recomputed value.
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const setDraft = (key: string, value: string) => setDrafts((d) => ({ ...d, [key]: value }));
    const clearDraft = (key: string) =>
        setDrafts((d) => {
            if (!(key in d)) return d;
            const next = { ...d };
            delete next[key];
            return next;
        });

    // Editing Margin % is just another way to set the sell: sell = buy × (1+pct).
    const handleMarginEdit = (value: string) => {
        const t = value.trim();
        if (t === "") {
            setSellOverride(null);
            return;
        }
        const pct = Number(t);
        if (!Number.isFinite(pct) || !(unitRateNum > 0)) return;
        setSellOverride(String(roundMoney(unitRateNum * (1 + pct / 100))));
    };
    const handleSellEdit = (value: string) => {
        setSellOverride(value.trim() === "" ? null : value);
    };
    // Totals back-derive their per-unit rate (÷ qty). Buy Total drives Buy/Unit;
    // Sell Total + Line Total drive the sell override; Margin Amount targets
    // sell total = buy total + amount.
    const handleBuyTotalEdit = (value: string) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || !(quantityNum > 0)) return;
        setUnitRate(String(roundMoney(n / quantityNum)));
    };
    const handleSellTotalEdit = (value: string) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || !(quantityNum > 0)) return;
        setSellOverride(String(roundMoney(n / quantityNum)));
    };
    const handleMarginAmountEdit = (value: string) => {
        const n = Number(value);
        if (!Number.isFinite(n) || !(quantityNum > 0)) return;
        const targetSellTotal = buyTotal + n;
        if (targetSellTotal < 0) return;
        setSellOverride(String(roundMoney(targetSellTotal / quantityNum)));
    };

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
        if (!Number.isFinite(unitRateNum) || unitRateNum < 0) {
            toast.error("Please enter a valid buy rate");
            return;
        }

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

        // Derived mode omits sell_unit_rate — the server seed-stamps the same
        // value from the entity margin. Overridden mode sends the typed rate.
        let sellPayload: number | undefined;
        if (isOverridden && isBillable) {
            if (!Number.isFinite(overrideNum) || overrideNum < 0) {
                toast.error("Please enter a valid sell rate");
                return;
            }
            sellPayload = roundMoney(overrideNum);
        }

        try {
            await createLineItem.mutateAsync({
                description: description.trim(),
                category,
                billing_mode: billingMode,
                quantity: quantityNum,
                unit: unit.trim(),
                unit_rate: unitRateNum,
                notes: notes || undefined,
                metadata,
                logistics_visible: logisticsVisible,
                // BILLABLE-only: never send a sell override for a non-billable line.
                ...(sellPayload !== undefined ? { sell_unit_rate: sellPayload } : {}),
            });
            toast.success("Custom line item added");
            onOpenChange(false);
            setDescription("");
            setCategory("OTHER");
            setBillingMode("BILLABLE");
            setQuantity("1");
            setUnit("service");
            setUnitRate("");
            setSellOverride(null);
            setDrafts({});
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
                className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0"
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

                    {/* ── Pricing — one card, every figure visible + live-linked ── */}
                    <div className="space-y-3 rounded-md border border-primary/30 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Pricing
                            </p>
                            {isOverridden && isBillable ? (
                                <button
                                    type="button"
                                    className="text-[11px] text-muted-foreground underline hover:text-foreground"
                                    onClick={() => setSellOverride(null)}
                                >
                                    Reset to entity margin ({fmtPct(seedMarginPercent)}%)
                                </button>
                            ) : null}
                        </div>

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
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={unitRate}
                                    onChange={(e) => setUnitRate(e.target.value)}
                                    placeholder="200.00"
                                />
                            </div>
                            <div>
                                <Label>Buy Total ({currency})</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={drafts.buyTotal ?? buyTotal.toFixed(2)}
                                    className="text-right font-mono tabular-nums"
                                    onChange={(e) => {
                                        setDraft("buyTotal", e.target.value);
                                        handleBuyTotalEdit(e.target.value);
                                    }}
                                    onBlur={() => clearDraft("buyTotal")}
                                />
                            </div>
                        </div>

                        {/* Row 3 — Sell / Unit | Sell Total */}
                        <div className={cn("grid grid-cols-2 gap-3", !isBillable && "opacity-60")}>
                            <div>
                                <Label>
                                    Sell / Unit ({currency})
                                    {isOverridden && isBillable ? (
                                        <span className="ml-1 text-[10px] font-medium text-amber-600">
                                            overridden
                                        </span>
                                    ) : null}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                        isBillable
                                            ? isOverridden
                                                ? (sellOverride ?? "")
                                                : derivedSellUnit.toFixed(2)
                                            : "0.00"
                                    }
                                    disabled={!isBillable}
                                    className={cn(
                                        "text-right font-mono tabular-nums",
                                        !isBillable && "bg-muted",
                                        isBillable && !isOverridden && "text-muted-foreground",
                                        isBillable &&
                                            isOverridden &&
                                            "border-amber-400/70 focus-visible:ring-amber-400/40"
                                    )}
                                    onChange={(e) => handleSellEdit(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Sell Total ({currency})</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                        isBillable
                                            ? (drafts.sellTotal ?? sellTotal.toFixed(2))
                                            : "0.00"
                                    }
                                    disabled={!isBillable}
                                    className={cn(
                                        "text-right font-mono tabular-nums",
                                        !isBillable && "bg-muted",
                                        isBillable && !isOverridden && "text-muted-foreground"
                                    )}
                                    onChange={(e) => {
                                        setDraft("sellTotal", e.target.value);
                                        handleSellTotalEdit(e.target.value);
                                    }}
                                    onBlur={() => clearDraft("sellTotal")}
                                />
                            </div>
                        </div>

                        {/* Row 4 — Margin % | Margin Amount | Line Total */}
                        <div className={cn("grid grid-cols-3 gap-3", !isBillable && "opacity-60")}>
                            <div>
                                <Label>
                                    Margin %
                                    {isOverridden && isBillable ? (
                                        <span className="ml-1 text-[10px] font-medium text-amber-600">
                                            overridden
                                        </span>
                                    ) : null}
                                </Label>
                                {margin.isFee && isBillable ? (
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
                                            drafts.marginPct ??
                                            (isBillable && margin.percent != null
                                                ? String(margin.percent)
                                                : "")
                                        }
                                        placeholder={isBillable ? "" : "—"}
                                        disabled={!isBillable || !(unitRateNum > 0)}
                                        className={cn(
                                            "text-right font-mono tabular-nums",
                                            (!isBillable || !(unitRateNum > 0)) && "bg-muted",
                                            isBillable && !isOverridden && "text-muted-foreground",
                                            isBillable &&
                                                isOverridden &&
                                                "border-amber-400/70 focus-visible:ring-amber-400/40"
                                        )}
                                        onChange={(e) => {
                                            setDraft("marginPct", e.target.value);
                                            handleMarginEdit(e.target.value);
                                        }}
                                        onBlur={() => clearDraft("marginPct")}
                                    />
                                )}
                            </div>
                            <div>
                                <Label>Margin Amount ({currency})</Label>
                                <Input
                                    type={isBillable ? "number" : "text"}
                                    step="0.01"
                                    value={
                                        isBillable
                                            ? (drafts.marginAmount ?? marginAmount.toFixed(2))
                                            : "—"
                                    }
                                    disabled={!isBillable}
                                    className={cn(
                                        "text-right font-mono tabular-nums",
                                        !isBillable && "bg-muted",
                                        isBillable && !isOverridden && "text-muted-foreground"
                                    )}
                                    onChange={(e) => {
                                        setDraft("marginAmount", e.target.value);
                                        handleMarginAmountEdit(e.target.value);
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
                                        isBillable
                                            ? (drafts.lineTotal ?? lineTotal.toFixed(2))
                                            : "0.00"
                                    }
                                    disabled={!isBillable}
                                    className={cn(
                                        "text-right font-mono text-base font-semibold tabular-nums",
                                        !isBillable && "bg-muted"
                                    )}
                                    onChange={(e) => {
                                        setDraft("lineTotal", e.target.value);
                                        handleSellTotalEdit(e.target.value);
                                    }}
                                    onBlur={() => clearDraft("lineTotal")}
                                />
                            </div>
                        </div>

                        <p className="text-[11px] leading-snug text-muted-foreground">
                            {!isBillable
                                ? billingMode === "COMPLIMENTARY"
                                    ? "Complimentary — shown to the client as complimentary; charged 0.00."
                                    : "Non-billable — internal cost only; never shown or charged to the client."
                                : isOverridden
                                  ? "Sell overridden for this line — it no longer follows the entity margin."
                                  : `Every figure is linked — edit any and the rest recompute. Sell seeds from the entity margin (${fmtPct(seedMarginPercent)}%); editing any sell-side figure overrides this line.`}
                        </p>
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

                    <div>
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Internal notes..."
                            rows={2}
                        />
                    </div>

                    {/* One-line visibility toggle (replaces the old Line Policy card).
                        Off strips this line from the warehouse view entirely. */}
                    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Label className="text-sm">Visible to logistics</Label>
                        <span className="ml-auto mr-2 text-[11px] text-muted-foreground">
                            off = hidden from the warehouse view
                        </span>
                        <Switch checked={logisticsVisible} onCheckedChange={setLogisticsVisible} />
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
