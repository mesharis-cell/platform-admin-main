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
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// margin% display token from buy + sell. buy=0 with sell>0 = "Fee".
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

export function AddCustomLineItemModal({
    open,
    onOpenChange,
    targetId,
    purposeType = "ORDER",
}: AddCustomLineItemModalProps) {
    const createLineItem = useCreateCustomLineItem(targetId, purposeType);

    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ServiceCategory>("OTHER");
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>("BILLABLE");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState("service");
    const [unitRate, setUnitRate] = useState("");
    // Optional per-unit sell override. Blank = no override (blanket-margin
    // math). A value is sent as sell_unit_rate on create.
    const [sellUnitRate, setSellUnitRate] = useState("");
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
    // Per-line policy. Defaults to standard (with-margin, visible to all).
    // Admin flips one or both for fuel-surcharge style pass-through lines.
    const [applyMargin, setApplyMargin] = useState(true);
    const [logisticsVisible, setLogisticsVisible] = useState(true);
    const quantityNum = Number(quantity || 0);
    const unitRateNum = Number(unitRate || 0);
    const isTransportCategory = category === "TRANSPORT";
    const derivedTotal =
        Number.isFinite(quantityNum) && Number.isFinite(unitRateNum)
            ? quantityNum * unitRateNum
            : 0;

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
            toast.error("Please enter a valid unit rate");
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

        // Optional per-unit sell override. Blank = omit (blanket-margin math).
        const sellTrimmed = sellUnitRate.trim();
        let sellOverride: number | undefined;
        if (sellTrimmed !== "") {
            const sellNum = Number(sellTrimmed);
            if (!Number.isFinite(sellNum) || sellNum < 0) {
                toast.error("Please enter a valid sell rate");
                return;
            }
            sellOverride = sellNum;
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
                apply_margin: applyMargin,
                logistics_visible: logisticsVisible,
                ...(sellOverride !== undefined ? { sell_unit_rate: sellOverride } : {}),
            });
            toast.success("Custom line item added");
            onOpenChange(false);
            setDescription("");
            setCategory("OTHER");
            setBillingMode("BILLABLE");
            setQuantity("1");
            setUnit("service");
            setUnitRate("");
            setSellUnitRate("");
            setNotes("");
            setTripDirection("DELIVERY");
            setTruckPlate("");
            setDriverName("");
            setDriverContact("");
            setTruckSize("");
            setTailgateRequired(false);
            setManpower("");
            setTransportNotes("");
            setApplyMargin(true);
            setLogisticsVisible(true);
        } catch (error: any) {
            toast.error(error.message || "Failed to add line item");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Custom Line Item</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
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
                            onValueChange={(value) => setBillingMode(value as LineItemBillingMode)}
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

                    <div className="grid grid-cols-3 gap-3">
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
                        <div>
                            <Label>
                                Unit Rate (AED) <span className="text-destructive">*</span>
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
                    </div>

                    <div>
                        <Label>Derived Total (AED)</Label>
                        <Input value={derivedTotal.toFixed(2)} readOnly className="bg-muted" />
                        <p className="text-xs text-muted-foreground mt-1">
                            Total is calculated as qty × unit rate and margin is applied later.
                        </p>
                    </div>

                    {/* Optional per-unit sell override. Buy above (Unit Rate) is
                        the cost. Enter a Sell (or Margin %) to override the
                        blanket-margin math for this line; leave blank for auto.
                          • edit Margin % → Sell = Buy × (1 + margin%/100)
                          • edit Sell     → Margin % re-derives
                        Buy = 0 shows "Fee" (margin % undefined). */}
                    {(() => {
                        const sellTrimmed = sellUnitRate.trim();
                        const hasSell = sellTrimmed !== "";
                        const sellNum = hasSell ? Number(sellTrimmed) : NaN;
                        const margin = deriveMargin(unitRateNum, hasSell ? sellNum : unitRateNum);
                        const marginValue =
                            hasSell && margin.percent != null ? String(margin.percent) : "";
                        const onMargin = (value: string) => {
                            const t = value.trim();
                            if (t === "") {
                                setSellUnitRate("");
                                return;
                            }
                            const pct = Number(t);
                            if (!Number.isFinite(pct) || !(unitRateNum > 0)) return;
                            setSellUnitRate(String(roundMoney(unitRateNum * (1 + pct / 100))));
                        };
                        return (
                            <div className="space-y-2 rounded-md border border-border p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Sell override (optional)
                                    </p>
                                    {hasSell && (
                                        <button
                                            type="button"
                                            className="text-[11px] text-muted-foreground hover:text-foreground underline"
                                            onClick={() => setSellUnitRate("")}
                                        >
                                            Reset to auto
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-[11px] text-muted-foreground">
                                            Buy (AED)
                                        </Label>
                                        <Input
                                            value={unitRate || "0"}
                                            readOnly
                                            className="bg-muted"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] text-muted-foreground">
                                            Sell (AED)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={sellUnitRate}
                                            placeholder="auto"
                                            onChange={(e) => setSellUnitRate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] text-muted-foreground">
                                            Margin %
                                        </Label>
                                        {margin.isFee ? (
                                            <Input
                                                value="Fee"
                                                readOnly
                                                className="bg-muted text-center"
                                            />
                                        ) : (
                                            <Input
                                                type="number"
                                                step="1"
                                                value={marginValue}
                                                placeholder={hasSell ? "—" : "auto"}
                                                onChange={(e) => onMargin(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    {hasSell
                                        ? "Sell override set — this line ignores blanket-margin math."
                                        : "Blank sell = blanket-margin calculation. Set a sell or margin % to override."}
                                </p>
                            </div>
                        );
                    })()}

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

                    {/* Per-line policy controls. apply_margin off = pass-through
                        (sell = buy). logistics_visible off = warehouse won't
                        see this line. Combined, they enable fuel-surcharge
                        style admin-to-client pass-through fees. */}
                    <div className="space-y-3 rounded-md border border-border p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Line Policy
                        </p>
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Apply margin</Label>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    When off, the typed amount IS what the client pays (buy = sell,
                                    no markup).
                                </p>
                            </div>
                            <Switch checked={applyMargin} onCheckedChange={setApplyMargin} />
                        </div>
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Visible to Logistics</Label>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    When off, this line is stripped from the warehouse view
                                    entirely.
                                </p>
                            </div>
                            <Switch
                                checked={logisticsVisible}
                                onCheckedChange={setLogisticsVisible}
                            />
                        </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                        <p className="text-xs text-primary">
                            ℹ️ Custom and reskin amounts are treated as base cost inputs, then
                            margin is applied once by the pricing engine (unless Apply margin is off
                            above).
                        </p>
                    </div>
                </div>

                <DialogFooter>
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
