"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompleteMaintenance, useSendToMaintenance } from "@/hooks/use-assets";
import { useListReskinRequests } from "@/hooks/use-reskin-requests";
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
            is_reskin_request?: boolean;
            reskin_target_brand_name?: string;
            reskin_target_brand_custom?: string;
            reskin_notes?: string;
        };
    };
    orderId: string;
    orderStatus: string;
    onProcessReskin?: (reskinData: {
        orderItemId: string;
        originalAssetName: string;
        targetBrandName: string;
        clientNotes: string;
    }) => void;
    onRejectReskin?: (orderItemId: string) => void;
    onRefresh?: () => void;
}

export function OrderItemCard({
    item,
    orderId,
    orderStatus,
    onProcessReskin,
    onRejectReskin,
    onRefresh,
}: OrderItemCardProps) {
    const { data: reskinRequests } = useListReskinRequests(orderId || "");
    const sendToMaintenance = useSendToMaintenance();
    const completeMaintenance = useCompleteMaintenance();

    const reskinRequest = reskinRequests?.find(
        (request: any) => request?.orderItemId === item?.order_item?.id
    );

    const handleProcessReskin = () => {
        if (onProcessReskin) {
            onProcessReskin({
                orderItemId: item?.order_item?.id || "",
                originalAssetName: item?.asset?.name || "",
                targetBrandName: item?.order_item?.reskin_target_brand_custom || "Linked Brand",
                clientNotes: item?.order_item?.reskin_notes || "No notes provided",
            });
        }
    };

    const handleRejectReskin = () => {
        if (onRejectReskin && item?.order_item?.id) {
            onRejectReskin(item.order_item.id);
        }
    };

    const handleSendToMaintenance = async () => {
        try {
            if (item?.asset?.id) {
                await sendToMaintenance.mutateAsync({ id: item.asset.id, orderId });
                if (onRefresh) onRefresh();
            }
            toast.success("Asset sent to maintenance");
        } catch (error: any) {
            console.error("Error sending asset to maintenance:", error);
            toast.error(error.message || "Failed to send asset to maintenance");
        }
    };

    const handleCompleteMaintenance = async () => {
        try {
            if (item?.asset?.id) {
                await completeMaintenance.mutateAsync({ id: item.asset.id, orderId });
                if (onRefresh) onRefresh();
            }
            toast.success("Asset completed maintenance");
        } catch (error: any) {
            console.error("Error completing asset maintenance:", error);
            toast.error(error.message || "Failed to complete asset maintenance");
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

                {["AWAITING_FABRICATION", "CONFIRMED"].includes(orderStatus) &&
                    item.asset.condition !== "GREEN" &&
                    item.asset.status !== "MAINTENANCE" && (
                        <Button
                            variant="default"
                            className="text-xs font-mono mt-2"
                            onClick={handleSendToMaintenance}
                            disabled={sendToMaintenance.isPending}
                        >
                            {sendToMaintenance.isPending ? "Sending..." : "Send to Maintenance"}
                        </Button>
                    )}

                {["AWAITING_FABRICATION", "CONFIRMED"].includes(orderStatus) &&
                    item.asset.condition !== "GREEN" &&
                    item.asset.status === "MAINTENANCE" && (
                        <Button
                            variant="default"
                            className="text-xs font-mono mt-2"
                            onClick={handleCompleteMaintenance}
                            disabled={completeMaintenance.isPending}
                        >
                            {completeMaintenance.isPending
                                ? "Completing..."
                                : "Complete Maintenance"}
                        </Button>
                    )}

                {["PRICING_REVIEW", "PENDING_APPROVAL"].includes(orderStatus) &&
                    item?.order_item?.is_reskin_request && (
                        <div className="bg-primary/10 p-2 rounded border border-primary/20 mt-4 font-mono text-xs text-muted-foreground">
                            <p>Target brand: {item?.order_item?.reskin_target_brand_name}</p>
                            <p className="mt-2">
                                Client instructions: {item?.order_item?.reskin_notes}
                            </p>
                            <p className="mt-2">Status: ⏳ Awaiting processing</p>

                            {!reskinRequest && (
                                <div className="mt-4">
                                    <Button
                                        variant="default"
                                        className="text-xs font-mono"
                                        onClick={handleProcessReskin}
                                    >
                                        Rebrand Request
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
            </div>
        </div>
    );
}
