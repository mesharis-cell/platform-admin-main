"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useListOrderLineItems, useVoidLineItem } from "@/hooks/use-order-line-items";
import type { OrderLineItem } from "@/types/hybrid-pricing";

interface OrderLineItemsListProps {
    orderId: string;
    canManage?: boolean;
}

export function OrderLineItemsList({ orderId, canManage = false }: OrderLineItemsListProps) {
    const { data: lineItems, isLoading } = useListOrderLineItems(orderId);
    const voidLineItem = useVoidLineItem(orderId);

    const handleVoid = async (item: OrderLineItem) => {
        const reason = prompt("Reason for removing this line item:");
        if (!reason || reason.trim().length < 10) {
            toast.error("Void reason required (min 10 characters)");
            return;
        }

        try {
            await voidLineItem.mutateAsync({
                itemId: item.id,
                data: { void_reason: reason.trim() },
            });
            toast.success("Line item removed");
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
                                            onClick={() => handleVoid(item)}
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
                                            onClick={() => handleVoid(item)}
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
        </div>
    );
}
