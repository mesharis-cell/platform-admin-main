"use client";

import { useState, useRef, useEffect } from "react";
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
import { useListServiceTypes } from "@/hooks/use-service-types";
import { useCreateCatalogLineItem } from "@/hooks/use-order-line-items";
import type { LineItemBillingMode, TransportLineItemMetadata } from "@/types/hybrid-pricing";

interface AddCatalogLineItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetId: string;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
}

export function AddCatalogLineItemModal({
    open,
    onOpenChange,
    targetId,
    purposeType = "ORDER",
}: AddCatalogLineItemModalProps) {
    const [serviceSearch, setServiceSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(serviceSearch), 300);
        return () => clearTimeout(debounceRef.current);
    }, [serviceSearch]);

    const serviceFilters: Record<string, string> = { limit: "100" };
    if (debouncedSearch.trim()) serviceFilters.search_term = debouncedSearch.trim();

    const { data: serviceTypes, isFetching: servicesFetching } =
        useListServiceTypes(serviceFilters);
    const createLineItem = useCreateCatalogLineItem(targetId, purposeType);

    const [serviceTypeId, setServiceTypeId] = useState("");
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>("BILLABLE");
    const [quantity, setQuantity] = useState<number | string>(1);
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

    const selectedService = serviceTypes?.data?.find((s: any) => s.id === serviceTypeId);
    const isTransportService = selectedService?.category === "TRANSPORT";

    const handleServiceChange = (id: string) => {
        setServiceTypeId(id);
        setQuantity(1);
        setTripDirection("DELIVERY");
        setTruckPlate("");
        setDriverName("");
        setDriverContact("");
        setTruckSize("");
        setTailgateRequired(false);
        setManpower("");
        setTransportNotes("");
    };

    const handleAdd = async () => {
        const qty = Number(quantity);

        if (!serviceTypeId || isNaN(qty) || qty <= 0) {
            toast.error("Please select a service and enter a valid quantity");
            return;
        }

        let metadata: TransportLineItemMetadata | undefined;
        if (isTransportService) {
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
                service_type_id: serviceTypeId,
                quantity: qty,
                billing_mode: billingMode,
                notes: notes || undefined,
                metadata,
            });
            toast.success("Service line item added");
            onOpenChange(false);
            setServiceTypeId("");
            setBillingMode("BILLABLE");
            setQuantity(1);
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
                    <DialogTitle>Add Service Line Item</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>
                            Service <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            placeholder="Search services..."
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            className="mb-2"
                        />
                        <Select value={serviceTypeId} onValueChange={handleServiceChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select service..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px]">
                                {servicesFetching && (
                                    <div className="p-2 text-xs text-muted-foreground text-center">
                                        Loading...
                                    </div>
                                )}
                                {!servicesFetching &&
                                    (!serviceTypes?.data || serviceTypes.data.length === 0) && (
                                        <div className="p-2 text-xs text-muted-foreground text-center">
                                            No services found
                                        </div>
                                    )}
                                {serviceTypes?.data?.map((service: any) => (
                                    <SelectItem key={service.id} value={service.id}>
                                        {service.name} ({service.unit})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedService && (
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <p>
                                <strong>Category:</strong> {selectedService.category}
                            </p>
                            <p>
                                <strong>Unit:</strong> {selectedService.unit} (
                                {selectedService.default_rate} AED)
                                <br />
                                <strong>Total Price:</strong>{" "}
                                {selectedService.default_rate * Number(quantity)}
                            </p>
                        </div>
                    )}

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

                    <div>
                        <Label>
                            Quantity <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            type="number"
                            step="1"
                            // min="1
                            value={quantity}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                    setQuantity("");
                                } else {
                                    setQuantity(Number(val));
                                }
                            }}
                            placeholder="4"
                        />
                    </div>

                    {isTransportService && (
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
                                    id="catalog-transport-tailgate"
                                    checked={tailgateRequired}
                                    onCheckedChange={(value) => setTailgateRequired(!!value)}
                                />
                                <Label htmlFor="catalog-transport-tailgate">
                                    Tailgate Required
                                </Label>
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
                            placeholder="Additional notes..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createLineItem.isPending}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleAdd} disabled={createLineItem.isPending}>
                        {createLineItem.isPending ? "Adding..." : "Add Line Item"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
