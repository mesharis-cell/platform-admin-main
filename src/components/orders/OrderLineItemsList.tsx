"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useListLineItems, useVoidLineItem } from "@/hooks/use-order-line-items";
import { VoidLineItemDialog } from "./VoidLineItemDialog";
import type { OrderLineItem } from "@/types/hybrid-pricing";

interface OrderLineItemsListProps {
    targetId: string;
    canManage?: boolean;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
}

export function OrderLineItemsList({
    targetId,
    canManage = false,
    purposeType = "ORDER",
}: OrderLineItemsListProps) {
    const { data: lineItems, isLoading } = useListLineItems(targetId, purposeType);
    const voidLineItem = useVoidLineItem(targetId, purposeType);

    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<OrderLineItem | null>(null);

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

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">Loading line items...</p>;
    }

    const activeItems = lineItems?.filter((item: OrderLineItem) => !item.isVoided) || [];
    const catalogItems = activeItems.filter(
        (item: OrderLineItem) => item.lineItemType === "CATALOG"
    );
    const customItems = activeItems.filter((item: OrderLineItem) => item.lineItemType === "CUSTOM");

    if (activeItems.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground text-sm">
                No service line items added yet
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Catalog Items */}
            {catalogItems.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                        Catalog Services
                    </h4>
                    <div className="space-y-2">
                        {catalogItems.map((item: OrderLineItem) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {item.description}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {item.category}
                                        </Badge>
                                        {item.billingMode && (
                                            <Badge variant="secondary" className="text-xs">
                                                {item.billingMode.replaceAll("_", " ")}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {item.quantity} {item.unit} × {item.unitRate?.toFixed(2)}{" "}
                                        AED
                                    </p>
                                    {item.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Note: {item.notes}
                                        </p>
                                    )}
                                    {item.category === "TRANSPORT" &&
                                        renderTransportMetadata(item.metadata)}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-semibold">
                                        {item.total.toFixed(2)} AED
                                    </span>
                                    {canManage && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openVoidDialog(item)}
                                            disabled={voidLineItem.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Items */}
            {customItems.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                        Custom Charges
                    </h4>
                    <div className="space-y-2">
                        {customItems.map((item: OrderLineItem) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 border border-border rounded-md bg-amber-50/30 dark:bg-amber-950/10"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {item.description}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {item.category}
                                        </Badge>
                                        {item.billingMode && (
                                            <Badge variant="secondary" className="text-xs">
                                                {item.billingMode.replaceAll("_", " ")}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {item.quantity || 0} {item.unit || "unit"} ×{" "}
                                        {item.unitRate?.toFixed(2) || "0.00"} AED
                                    </p>
                                    {item.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Note: {item.notes}
                                        </p>
                                    )}
                                    {item.category === "TRANSPORT" &&
                                        renderTransportMetadata(item.metadata)}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-semibold">
                                        {item.total.toFixed(2)} AED
                                    </span>
                                    {canManage && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openVoidDialog(item)}
                                            disabled={voidLineItem.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Void Line Item Dialog */}
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
