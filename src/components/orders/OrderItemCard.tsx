"use client";

import Link from "next/link";
import { AlertTriangle, Package, XCircle } from "lucide-react";
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
            condition_notes?: string | null;
            images?: string[];
            on_display_image?: string | null;
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

const PRE_FULFILLMENT_STATUSES = [
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "AWAITING_FABRICATION",
];

const CONDITION_STYLES: Record<string, { banner: string; icon: typeof AlertTriangle }> = {
    RED: {
        banner: "bg-red-500/10 border-red-500/30 text-red-600",
        icon: XCircle,
    },
    ORANGE: {
        banner: "bg-amber-500/10 border-amber-500/30 text-amber-600",
        icon: AlertTriangle,
    },
};

export function OrderItemCard({ item, orderId, orderStatus, onRefresh }: OrderItemCardProps) {
    const createServiceRequest = useCreateServiceRequest();

    const thumbnail =
        item.asset?.on_display_image ||
        (item.asset?.images && item.asset.images.length > 0 ? item.asset.images[0] : null);

    const isDamaged = item.asset?.condition !== "GREEN" && item.asset?.condition !== undefined;
    const conditionStyle = isDamaged
        ? (CONDITION_STYLES[item.asset!.condition] ?? CONDITION_STYLES.RED)
        : null;
    const ConditionIcon = conditionStyle?.icon;

    const showWarning = PRE_FULFILLMENT_STATUSES.includes(orderStatus) && isDamaged;
    const showAction =
        showWarning && item.asset?.status !== "MAINTENANCE" && item.asset?.condition === "RED";

    const handleCreateLinkedServiceRequest = async () => {
        if (!item?.asset?.id || !item?.order_item?.id) return;
        try {
            const requestType = "MAINTENANCE";
            await createServiceRequest.mutateAsync({
                request_type: requestType,
                billing_mode: "INTERNAL_ONLY",
                link_mode: ["DRAFT", "PRICING_REVIEW", "PENDING_APPROVAL", "QUOTED"].includes(
                    orderStatus
                )
                    ? "BUNDLED_WITH_ORDER"
                    : "SEPARATE_CHANGE_REQUEST",
                blocks_fulfillment: item.asset.condition === "RED",
                title: `${requestType} for ${item.asset.name || "asset"}`,
                description: `Asset condition is ${item.asset.condition}. Created from order workflow.`,
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
            toast.error(error.message || "Failed to create linked service request");
        }
    };

    return (
        <div
            className={`rounded border p-3 flex gap-3 transition-colors ${
                isDamaged
                    ? item.asset?.condition === "RED"
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-amber-500/5 border-amber-500/20"
                    : "bg-muted/30 border-border"
            }`}
        >
            {/* Thumbnail */}
            <Link href={`/assets/${item.asset?.id}`} className="shrink-0 block">
                <div className="w-14 h-14 rounded overflow-hidden border border-border bg-muted flex items-center justify-center">
                    {thumbnail ? (
                        <img
                            src={thumbnail}
                            alt={item.asset?.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
            </Link>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <Link
                        href={`/assets/${item.asset?.id}`}
                        className="font-mono text-sm font-medium hover:underline truncate"
                    >
                        {item.asset?.name}
                    </Link>
                    <PrintQrAction qrCode={item.asset?.qr_code} assetName={item.asset?.name} />
                </div>

                <p className="font-mono text-xs text-muted-foreground mt-1">
                    QTY: {item?.order_item?.quantity} | VOL: {item?.order_item?.total_volume}m³ |
                    WT: {item?.order_item?.total_weight}kg
                </p>

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

                {showWarning && conditionStyle && ConditionIcon && (
                    <div
                        className={`flex items-start gap-2 rounded border p-2 mt-3 font-mono text-xs ${conditionStyle.banner}`}
                    >
                        <ConditionIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <div>
                            <span className="font-semibold">
                                {item.asset?.condition === "RED" ? "Damaged" : "Needs attention"}
                            </span>
                            {item.asset?.refurbishment_days_estimate ? (
                                <span>
                                    {" "}
                                    — refurbishment est.{" "}
                                    <strong>{item.asset.refurbishment_days_estimate}d</strong>
                                </span>
                            ) : null}
                            {item.asset?.condition_notes && (
                                <p className="mt-0.5 opacity-80">{item.asset.condition_notes}</p>
                            )}
                        </div>
                    </div>
                )}

                {showAction && (
                    <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs font-mono mt-2 h-7"
                        onClick={handleCreateLinkedServiceRequest}
                        disabled={createServiceRequest.isPending}
                    >
                        {createServiceRequest.isPending
                            ? "Creating…"
                            : "Create Linked Service Request"}
                    </Button>
                )}
            </div>
        </div>
    );
}
