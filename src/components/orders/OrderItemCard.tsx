"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCreateServiceRequest } from "@/hooks/use-service-requests";
import { Condition } from "@/types";
import { PrintQrAction } from "@/components/qr/PrintQrAction";
import { toast } from "sonner";

interface OrderItemCardProps {
    item: {
        id: string;
        asset?: {
            id: string;
            name?: string;
            qr_code?: string;
            condition: Condition;
            status: string;
            refurbishment_days_estimate?: number;
        };
        order_item?: {
            id: string;
            quantity: number;
            total_volume: number;
            total_weight: number;
            handling_tags?: string[];
        };
    };
    orderId: string;
    orderStatus: string;
    onRefresh?: () => void;
}

export function OrderItemCard({ item, orderId, orderStatus, onRefresh }: OrderItemCardProps) {
    const createServiceRequest = useCreateServiceRequest();

    const handleCreateLinkedServiceRequest = async () => {
        if (!item?.asset?.id || !item?.order_item?.id) return;
        try {
            const preQuoteStatuses = ["DRAFT", "PRICING_REVIEW", "PENDING_APPROVAL", "QUOTED"];
            const requestType = "MAINTENANCE";
            await createServiceRequest.mutateAsync({
                request_type: requestType,
                billing_mode: "INTERNAL_ONLY",
                link_mode: preQuoteStatuses.includes(orderStatus)
                    ? "BUNDLED_WITH_ORDER"
                    : "SEPARATE_CHANGE_REQUEST",
                blocks_fulfillment: item.asset.condition === "RED",
                title: `${requestType} for ${item.asset.name || "asset"}`,
                description:
                    item.asset.condition === "GREEN"
                        ? "Created from order workflow."
                        : `Asset condition is ${item.asset.condition}. Created from order workflow.`,
                related_asset_id: item.asset.id,
                related_order_id: orderId,
                related_order_item_id: item.order_item.id,
                items: [
                    {
                        asset_id: item.asset.id,
                        asset_name: item.asset.name || "Asset",
                        quantity: item.order_item.quantity || 1,
                    },
                ],
            });
            if (onRefresh) onRefresh();
            toast.success("Linked service request created");
        } catch (error: any) {
            console.error("Error creating linked service request:", error);
            toast.error(error.message || "Failed to create linked service request");
        }
    };

    console.log(item.asset.status);

    return (
        <div className="bg-muted/30 rounded border border-border p-3">
            <div className="flex-1">
                {/* Asset Name */}
                <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-sm font-medium">{item.asset?.name}</p>
                    <PrintQrAction qrCode={item.asset?.qr_code} assetName={item.asset?.name} />
                </div>

                {/* Quantity, Volume, Weight */}
                <p className="font-mono text-xs text-muted-foreground mt-1">
                    QTY: {item?.order_item?.quantity} | VOL: {item?.order_item?.total_volume}m³ |
                    WT: {item?.order_item?.total_weight}kg
                </p>

                {/* Handling Tags */}
                {item?.order_item?.handling_tags && item.order_item.handling_tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                        {item.order_item.handling_tags.map((tag: string) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="text-[10px] font-mono bg-amber-500/10 border-amber-500/20"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {[
                    "PRICING_REVIEW",
                    "PENDING_APPROVAL",
                    "QUOTED",
                    "CONFIRMED",
                    "AWAITING_FABRICATION",
                ].includes(orderStatus) &&
                    item.asset.condition !== "GREEN" && (
                        <div className="bg-red-500/10 p-2 rounded border border-red-500/20 mt-4 font-mono text-xs text-red-500">
                            <p>
                                This asset is damaged. Maintenance is required to restore proper
                                operation. Refurbishment estimate{" "}
                                {item?.asset?.refurbishment_days_estimate} days.
                            </p>
                        </div>
                    )}

                {[
                    "PRICING_REVIEW",
                    "PENDING_APPROVAL",
                    "QUOTED",
                    "CONFIRMED",
                    "AWAITING_FABRICATION",
                ].includes(orderStatus) &&
                    item.asset.condition !== "GREEN" &&
                    item.asset.status !== "MAINTENANCE" && (
                        <Button
                            variant="default"
                            className="text-xs font-mono mt-2"
                            onClick={handleCreateLinkedServiceRequest}
                            disabled={createServiceRequest.isPending}
                        >
                            {createServiceRequest.isPending
                                ? "Creating..."
                                : "Create Linked Service Request"}
                        </Button>
                    )}
            </div>
        </div>
    );
}
