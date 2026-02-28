"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Edit, Eye, EyeOff, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
    useListLineItems,
    usePatchEntityLineItemsClientVisibility,
    usePatchLineItemClientVisibility,
    usePatchLineItemMetadata,
    useUpdateLineItem,
    useVoidLineItem,
} from "@/hooks/use-order-line-items";
import { VoidLineItemDialog } from "./VoidLineItemDialog";
import type {
    LineItemBillingMode,
    OrderLineItem,
    TransportLineItemMetadata,
} from "@/types/hybrid-pricing";

interface OrderLineItemsListProps {
    targetId: string;
    canManage?: boolean;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
    allowClientVisibilityControls?: boolean;
}

type EditDraft = {
    quantity: string;
    unitRate: string;
    billingMode: LineItemBillingMode;
    notes: string;
    truckPlate: string;
    driverName: string;
    driverContact: string;
    truckSize: string;
    manpower: string;
    tailgateRequired: boolean;
    transportNotes: string;
};

const EMPTY_DRAFT: EditDraft = {
    quantity: "1",
    unitRate: "0",
    billingMode: "BILLABLE",
    notes: "",
    truckPlate: "",
    driverName: "",
    driverContact: "",
    truckSize: "",
    manpower: "",
    tailgateRequired: false,
    transportNotes: "",
};

const mapDraftFromItem = (item: OrderLineItem): EditDraft => {
    const metadata = (item.metadata || {}) as TransportLineItemMetadata;
    return {
        quantity: String(item.quantity ?? 1),
        unitRate: String(item.unitRate ?? 0),
        billingMode: (item.billingMode || "BILLABLE") as LineItemBillingMode,
        notes: item.notes || "",
        truckPlate: String(metadata.truck_plate || ""),
        driverName: String(metadata.driver_name || ""),
        driverContact: String(metadata.driver_contact || ""),
        truckSize: String(metadata.truck_size || ""),
        manpower:
            metadata.manpower !== undefined && metadata.manpower !== null
                ? String(metadata.manpower)
                : "",
        tailgateRequired: Boolean(metadata.tailgate_required),
        transportNotes: String(metadata.notes || ""),
    };
};

const buildTransportMetadata = (draft: EditDraft) => {
    const metadata: Record<string, unknown> = {
        truck_plate: draft.truckPlate.trim() || undefined,
        driver_name: draft.driverName.trim() || undefined,
        driver_contact: draft.driverContact.trim() || undefined,
        truck_size: draft.truckSize.trim() || undefined,
        notes: draft.transportNotes.trim() || undefined,
        tailgate_required: draft.tailgateRequired,
    };

    if (draft.manpower.trim()) {
        metadata.manpower = Number(draft.manpower);
    }

    return metadata;
};

export function OrderLineItemsList({
    targetId,
    canManage = false,
    purposeType = "ORDER",
    allowClientVisibilityControls = false,
}: OrderLineItemsListProps) {
    const { data: lineItems, isLoading } = useListLineItems(targetId, purposeType);
    const voidLineItem = useVoidLineItem(targetId, purposeType);
    const updateLineItem = useUpdateLineItem(targetId, purposeType);
    const patchLineItemMetadata = usePatchLineItemMetadata(targetId, purposeType);
    const patchLineVisibility = usePatchLineItemClientVisibility(targetId, purposeType);
    const patchBulkVisibility = usePatchEntityLineItemsClientVisibility(targetId, purposeType);

    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<OrderLineItem | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [draft, setDraft] = useState<EditDraft>(EMPTY_DRAFT);

    const activeItems = useMemo(
        () => lineItems?.filter((item: OrderLineItem) => !item.isVoided) || [],
        [lineItems]
    );

    const catalogItems = activeItems.filter(
        (item: OrderLineItem) => item.lineItemType === "CATALOG"
    );
    const customItems = activeItems.filter((item: OrderLineItem) => item.lineItemType === "CUSTOM");

    const allClientVisible =
        activeItems.length > 0 && activeItems.every((item) => item.clientPriceVisible);

    const renderTransportMetadata = (metadata: OrderLineItem["metadata"]) => {
        if (!metadata || typeof metadata !== "object") return null;
        const details = metadata as Record<string, unknown>;
        const formatBool = (value: unknown) =>
            value === true ? "Yes" : value === false ? "No" : "N/A";
        const info = [
            { label: "Direction", value: details.trip_direction },
            { label: "Truck Plate", value: details.truck_plate },
            { label: "Driver", value: details.driver_name },
            { label: "Driver Contact", value: details.driver_contact },
            { label: "Truck Size", value: details.truck_size },
            { label: "Manpower", value: details.manpower },
            { label: "Tailgate", value: formatBool(details.tailgate_required) },
            { label: "Transport Notes", value: details.notes },
        ].filter(
            (entry) => entry.value !== undefined && entry.value !== null && entry.value !== ""
        );

        if (!info.length) return null;

        return (
            <div className="mt-2 rounded border border-border/60 bg-background/60 p-2 text-xs">
                <p className="font-medium text-muted-foreground mb-1">Transport Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {info.map((entry) => (
                        <p key={entry.label} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{entry.label}:</span>{" "}
                            {String(entry.value)}
                        </p>
                    ))}
                </div>
            </div>
        );
    };

    const openVoidDialog = (item: OrderLineItem) => {
        setSelectedItem(item);
        setVoidDialogOpen(true);
    };

    const startEdit = (item: OrderLineItem) => {
        setEditingItemId(item.id);
        setDraft(mapDraftFromItem(item));
    };

    const cancelEdit = () => {
        setEditingItemId(null);
        setDraft(EMPTY_DRAFT);
    };

    const handleVoid = async (reason: string) => {
        if (!selectedItem) return;

        try {
            await voidLineItem.mutateAsync({
                itemId: selectedItem.id,
                data: { void_reason: reason },
            });
            toast.success("Line item removed");
            setVoidDialogOpen(false);
            setSelectedItem(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to void line item");
        }
    };

    const handleSaveEdit = async (item: OrderLineItem) => {
        const isTransport = item.category === "TRANSPORT";
        const metadata = isTransport ? buildTransportMetadata(draft) : item.metadata || undefined;

        try {
            if (item.canEditPricingFields === false) {
                await patchLineItemMetadata.mutateAsync({
                    itemId: item.id,
                    data: {
                        notes: draft.notes || undefined,
                        metadata,
                    },
                });
                toast.success("Metadata updated");
            } else {
                const quantityNumber = Number(draft.quantity || 0);
                const unitRateNumber = Number(draft.unitRate || 0);
                if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
                    toast.error("Quantity must be greater than 0");
                    return;
                }
                if (!Number.isFinite(unitRateNumber) || unitRateNumber < 0) {
                    toast.error("Unit rate must be a valid number");
                    return;
                }

                await updateLineItem.mutateAsync({
                    itemId: item.id,
                    data: {
                        quantity: quantityNumber,
                        unitRate: unitRateNumber,
                        billingMode: draft.billingMode,
                        notes: draft.notes || undefined,
                        metadata,
                    },
                });
                toast.success("Line item updated");
            }

            cancelEdit();
        } catch (error: any) {
            toast.error(error.message || "Failed to update line item");
        }
    };

    const handleToggleLineVisibility = async (itemId: string, next: boolean) => {
        try {
            await patchLineVisibility.mutateAsync({
                itemId,
                data: { clientPriceVisible: next },
            });
            toast.success(next ? "Line price shown to client" : "Line price hidden from client");
        } catch (error: any) {
            toast.error(error.message || "Failed to update client visibility");
        }
    };

    const handleBulkVisibility = async (next: boolean) => {
        try {
            await patchBulkVisibility.mutateAsync({
                clientPriceVisible: next,
                lineItemIds: activeItems.map((item) => item.id),
            });
            toast.success(
                next ? "All line prices shown to client" : "All line prices hidden from client"
            );
        } catch (error: any) {
            toast.error(error.message || "Failed to update client visibility");
        }
    };

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">Loading line items...</p>;
    }

    if (activeItems.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground text-sm">
                No service line items added yet
            </div>
        );
    }

    const renderLineItem = (item: OrderLineItem, highlighted = false) => {
        const isEditing = editingItemId === item.id;
        const isTransport = item.category === "TRANSPORT";
        const pricingLocked = item.canEditPricingFields === false;
        const visibilityBusy = patchLineVisibility.isPending || patchBulkVisibility.isPending;

        return (
            <div
                key={item.id}
                className={`p-3 border border-border rounded-md ${highlighted ? "bg-amber-50/30 dark:bg-amber-950/10" : "bg-muted/30"}`}
            >
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{item.description}</span>
                    <Badge variant="outline" className="text-xs">
                        {item.category}
                    </Badge>
                    {item.billingMode && (
                        <Badge variant="secondary" className="text-xs">
                            {item.billingMode.replaceAll("_", " ")}
                        </Badge>
                    )}
                    <Badge variant={pricingLocked ? "outline" : "default"} className="text-xs">
                        {pricingLocked ? "Pricing Locked" : "Pricing Editable"}
                    </Badge>
                    {allowClientVisibilityControls && canManage ? (
                        <div className="ml-auto flex items-center gap-2 rounded-md border border-border px-2 py-1">
                            <Label className="text-[11px] text-muted-foreground">
                                Client price
                            </Label>
                            <Switch
                                checked={Boolean(item.clientPriceVisible)}
                                onCheckedChange={(next) =>
                                    handleToggleLineVisibility(item.id, next)
                                }
                                disabled={visibilityBusy}
                            />
                            {item.clientPriceVisible ? (
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                        </div>
                    ) : null}
                </div>

                {pricingLocked && item.lockReason ? (
                    <p className="text-[11px] text-muted-foreground mt-1">{item.lockReason}</p>
                ) : null}

                {!isEditing ? (
                    <>
                        <p className="text-xs text-muted-foreground mt-1">
                            {item.quantity || 0} {item.unit || "unit"} ×{" "}
                            {item.unitRate?.toFixed(2) || "0.00"} AED
                        </p>
                        {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">Note: {item.notes}</p>
                        )}
                        {isTransport && renderTransportMetadata(item.metadata)}
                    </>
                ) : (
                    <div className="mt-3 space-y-3 rounded-md border border-border/80 bg-background p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Quantity</Label>
                                <Input
                                    value={draft.quantity}
                                    type="number"
                                    min={1}
                                    step={1}
                                    disabled={pricingLocked}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            quantity: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Unit Rate (AED)</Label>
                                <Input
                                    value={draft.unitRate}
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    disabled={pricingLocked}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            unitRate: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Billing Mode</Label>
                                <Select
                                    value={draft.billingMode}
                                    disabled={pricingLocked}
                                    onValueChange={(value) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            billingMode: value as LineItemBillingMode,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BILLABLE">BILLABLE</SelectItem>
                                        <SelectItem value="NON_BILLABLE">NON-BILLABLE</SelectItem>
                                        <SelectItem value="COMPLIMENTARY">COMPLIMENTARY</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {isTransport ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Truck Plate</Label>
                                    <Input
                                        value={draft.truckPlate}
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                truckPlate: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Driver Name</Label>
                                    <Input
                                        value={draft.driverName}
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                driverName: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Driver Contact</Label>
                                    <Input
                                        value={draft.driverContact}
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                driverContact: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Truck Size</Label>
                                    <Input
                                        value={draft.truckSize}
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                truckSize: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Manpower</Label>
                                    <Input
                                        value={draft.manpower}
                                        type="number"
                                        min={0}
                                        step={1}
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                manpower: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <Switch
                                        checked={draft.tailgateRequired}
                                        onCheckedChange={(next) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                tailgateRequired: next,
                                            }))
                                        }
                                    />
                                    <Label className="text-xs">Tailgate required</Label>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs">Transport Notes</Label>
                                    <Textarea
                                        value={draft.transportNotes}
                                        rows={2}
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                transportNotes: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                                value={draft.notes}
                                rows={2}
                                onChange={(event) =>
                                    setDraft((prev) => ({ ...prev, notes: event.target.value }))
                                }
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mt-3">
                    <span className="font-mono font-semibold">{item.total.toFixed(2)} AED</span>
                    {canManage ? (
                        <div className="flex items-center gap-1">
                            {isEditing ? (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelEdit}
                                        disabled={
                                            updateLineItem.isPending ||
                                            patchLineItemMetadata.isPending
                                        }
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSaveEdit(item)}
                                        disabled={
                                            updateLineItem.isPending ||
                                            patchLineItemMetadata.isPending
                                        }
                                    >
                                        <Save className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openVoidDialog(item)}
                                disabled={voidLineItem.isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {allowClientVisibilityControls && canManage ? (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkVisibility(!allClientVisible)}
                        disabled={patchBulkVisibility.isPending}
                    >
                        {allClientVisible ? "Hide all from client" : "Show all to client"}
                    </Button>
                </div>
            ) : null}

            {catalogItems.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                        Catalog Services
                    </h4>
                    <div className="space-y-2">
                        {catalogItems.map((item) => renderLineItem(item))}
                    </div>
                </div>
            )}

            {customItems.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                        Custom Charges
                    </h4>
                    <div className="space-y-2">
                        {customItems.map((item) => renderLineItem(item, true))}
                    </div>
                </div>
            )}

            <VoidLineItemDialog
                open={voidDialogOpen}
                onOpenChange={setVoidDialogOpen}
                item={selectedItem}
                onConfirm={handleVoid}
                isPending={voidLineItem.isPending}
            />
        </div>
    );
}
