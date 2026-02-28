"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    targetId?: string;
    orderId?: string;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
}

export function AddCatalogLineItemModal({
    open,
    onOpenChange,
    targetId,
    orderId,
    purposeType = "ORDER",
}: AddCatalogLineItemModalProps) {
    const resolvedTargetId = targetId || orderId || "";
    const createLineItem = useCreateCatalogLineItem(resolvedTargetId, purposeType);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const [billingMode, setBillingMode] = useState<LineItemBillingMode>("BILLABLE");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [quantitiesById, setQuantitiesById] = useState<Record<string, string>>({});
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

    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    useEffect(() => {
        if (!open) {
            setSearch("");
            setDebouncedSearch("");
            setPage(1);
            setSelectedIds([]);
            setQuantitiesById({});
            setBillingMode("BILLABLE");
            setNotes("");
            setTripDirection("DELIVERY");
            setTruckPlate("");
            setDriverName("");
            setDriverContact("");
            setTruckSize("");
            setTailgateRequired(false);
            setManpower("");
            setTransportNotes("");
        }
    }, [open]);

    const { data: serviceTypesResponse, isFetching } = useListServiceTypes({
        page: String(page),
        limit: String(limit),
        search_term: debouncedSearch || undefined,
    });

    const serviceTypes = serviceTypesResponse?.data || [];
    const total = Number(serviceTypesResponse?.meta?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const selectedServices = useMemo(
        () => serviceTypes.filter((service: any) => selectedIds.includes(service.id)),
        [serviceTypes, selectedIds]
    );

    const hasTransportSelected = selectedServices.some(
        (service: any) => service.category === "TRANSPORT"
    );

    const allCurrentPageSelected =
        serviceTypes.length > 0 &&
        serviceTypes.every((service: any) => selectedIds.includes(service.id));

    const toggleSelectAllOnPage = (checked: boolean) => {
        if (checked) {
            const idsToAdd = serviceTypes.map((service: any) => service.id);
            setSelectedIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
            setQuantitiesById((prev) => {
                const next = { ...prev };
                idsToAdd.forEach((id) => {
                    if (!next[id]) next[id] = "1";
                });
                return next;
            });
        } else {
            const idsOnPage = new Set<string>(
                serviceTypes.map((service: any) => String(service.id))
            );
            setSelectedIds((prev) => prev.filter((id) => !idsOnPage.has(id)));
            setQuantitiesById((prev) => {
                const next = { ...prev };
                idsOnPage.forEach((id) => delete next[id]);
                return next;
            });
        }
    };

    const toggleServiceSelection = (serviceId: string, checked: boolean) => {
        if (checked) {
            setSelectedIds((prev) => Array.from(new Set([...prev, serviceId])));
            setQuantitiesById((prev) => ({ ...prev, [serviceId]: prev[serviceId] || "1" }));
            return;
        }

        setSelectedIds((prev) => prev.filter((id) => id !== serviceId));
        setQuantitiesById((prev) => {
            const next = { ...prev };
            delete next[serviceId];
            return next;
        });
    };

    const buildTransportMetadata = (): TransportLineItemMetadata => {
        const metadata: TransportLineItemMetadata = {
            trip_direction: tripDirection,
            truck_plate: truckPlate.trim() || undefined,
            driver_name: driverName.trim() || undefined,
            driver_contact: driverContact.trim() || undefined,
            truck_size: truckSize.trim() || undefined,
            tailgate_required: tailgateRequired,
            notes: transportNotes.trim() || undefined,
        };

        if (manpower.trim()) {
            metadata.manpower = Number(manpower);
        }

        return metadata;
    };

    const handleAddSelected = async () => {
        if (!resolvedTargetId) {
            toast.error("Missing target ID");
            return;
        }
        if (selectedIds.length === 0) {
            toast.error("Select at least one service");
            return;
        }

        const transportMetadata = buildTransportMetadata();

        try {
            for (const selectedId of selectedIds) {
                const service = serviceTypes.find((row: any) => row.id === selectedId);
                const quantityValue = Number(quantitiesById[selectedId] || "1");

                if (!service) continue;
                if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
                    toast.error(`Invalid quantity for ${service.name}`);
                    return;
                }

                await createLineItem.mutateAsync({
                    service_type_id: selectedId,
                    quantity: quantityValue,
                    billing_mode: billingMode,
                    notes: notes || undefined,
                    metadata: service.category === "TRANSPORT" ? transportMetadata : undefined,
                });
            }

            toast.success(`${selectedIds.length} service line item(s) added`);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to add selected services");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Add Catalog Services</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-full md:flex-1 space-y-1">
                            <Label className="text-xs">Search services</Label>
                            <Input
                                placeholder="Search by name, category, or unit..."
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <div className="w-full md:w-40 space-y-1">
                            <Label className="text-xs">Page size</Label>
                            <Select
                                value={String(limit)}
                                onValueChange={(value) => {
                                    setLimit(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 40, 80].map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-md border border-border overflow-hidden">
                        <div className="max-h-[320px] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0 z-10">
                                    <tr className="border-b border-border">
                                        <th className="w-10 px-3 py-2 text-left">
                                            <Checkbox
                                                checked={allCurrentPageSelected}
                                                onCheckedChange={(checked) =>
                                                    toggleSelectAllOnPage(Boolean(checked))
                                                }
                                            />
                                        </th>
                                        <th className="px-3 py-2 text-left">Service</th>
                                        <th className="px-3 py-2 text-left">Category</th>
                                        <th className="px-3 py-2 text-left">Unit</th>
                                        <th className="px-3 py-2 text-left">Default Rate</th>
                                        <th className="px-3 py-2 text-left">Qty</th>
                                        <th className="px-3 py-2 text-left">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isFetching ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-8 text-center text-muted-foreground"
                                            >
                                                Loading services...
                                            </td>
                                        </tr>
                                    ) : serviceTypes.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-8 text-center text-muted-foreground"
                                            >
                                                No services found
                                            </td>
                                        </tr>
                                    ) : (
                                        serviceTypes.map((service: any) => {
                                            const checked = selectedIds.includes(service.id);
                                            return (
                                                <tr
                                                    key={service.id}
                                                    className="border-b border-border/70 hover:bg-muted/30"
                                                >
                                                    <td className="px-3 py-2 align-top">
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={(value) =>
                                                                toggleServiceSelection(
                                                                    service.id,
                                                                    Boolean(value)
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 align-top font-medium">
                                                        {service.name}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        {service.category}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        {service.unit}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        {(
                                                            Number(service.default_rate) || 0
                                                        ).toFixed(2)}{" "}
                                                        AED
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            step={1}
                                                            className="h-8 w-20"
                                                            disabled={!checked}
                                                            value={
                                                                quantitiesById[service.id] || "1"
                                                            }
                                                            onChange={(event) =>
                                                                setQuantitiesById((prev) => ({
                                                                    ...prev,
                                                                    [service.id]:
                                                                        event.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-muted-foreground">
                                                        {service.description || "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            Selected: {selectedIds.length} service
                            {selectedIds.length === 1 ? "" : "s"}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={page <= 1}
                            >
                                Prev
                            </Button>
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={page >= totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
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

                        <div className="space-y-2">
                            <Label>Notes (applies to all selected)</Label>
                            <Textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                rows={3}
                                placeholder="Internal note for these line items"
                            />
                        </div>
                    </div>

                    {hasTransportSelected && (
                        <div className="space-y-3 rounded-md border border-border p-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Transport Metadata (applies to selected transport lines)
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
                                    />
                                </div>
                                <div>
                                    <Label>Driver Name</Label>
                                    <Input
                                        value={driverName}
                                        onChange={(event) => setDriverName(event.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Driver Contact Number</Label>
                                    <Input
                                        value={driverContact}
                                        onChange={(event) => setDriverContact(event.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Truck Size</Label>
                                    <Input
                                        value={truckSize}
                                        onChange={(event) => setTruckSize(event.target.value)}
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
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}
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
                    <Button
                        type="button"
                        onClick={handleAddSelected}
                        disabled={createLineItem.isPending || selectedIds.length === 0}
                    >
                        {createLineItem.isPending
                            ? "Adding..."
                            : `Add Selected (${selectedIds.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
