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
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
}

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
            });
            toast.success("Custom line item added");
            onOpenChange(false);
            setDescription("");
            setCategory("OTHER");
            setBillingMode("BILLABLE");
            setQuantity("1");
            setUnit("service");
            setUnitRate("");
            setNotes("");
            setTripDirection("DELIVERY");
            setTruckPlate("");
            setDriverName("");
            setDriverContact("");
            setTruckSize("");
            setTailgateRequired(false);
            setManpower("");
            setTransportNotes("");
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

                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                        <p className="text-xs text-primary">
                            ℹ️ Custom and reskin amounts are treated as base cost inputs, then
                            margin is applied once by the pricing engine.
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
