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
    purposeType?: "ORDER" | "INBOUND_REQUEST";
}

export function OrderLineItemsList({ targetId, canManage = false, purposeType = "ORDER" }: OrderLineItemsListProps) {
    const { data: lineItems, isLoading } = useListLineItems(targetId, purposeType);
    const voidLineItem = useVoidLineItem(targetId);

    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<OrderLineItem | null>(null);

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
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        No margin applied (final amount)
                                    </p>
                                    {item.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Note: {item.notes}
                                        </p>
                                    )}
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
