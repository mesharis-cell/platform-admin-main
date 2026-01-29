"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useListReskinRequests } from "@/hooks/use-reskin-requests";

interface OrderItemCardProps {
  item: {
    id: string;
    asset?: {
      name?: string;
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
}

export function OrderItemCard({
  item,
  orderId,
  orderStatus,
  onProcessReskin,
  onRejectReskin,
}: OrderItemCardProps) {
  const { data: reskinRequests } = useListReskinRequests(orderId || "");

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

  return (
    <div className="bg-muted/30 rounded border border-border p-3">
      <div className="flex-1">
        {/* Asset Name */}
        <p className="font-mono text-sm font-medium">
          {item.asset?.name}
        </p>

        {/* Quantity, Volume, Weight */}
        <p className="font-mono text-xs text-muted-foreground mt-1">
          QTY: {item?.order_item?.quantity} | VOL:{" "}
          {item?.order_item?.total_volume}m³ | WT:{" "}
          {item?.order_item?.total_weight}kg
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

        {/* Reskin Request for PRICING_REVIEW status */}
        {orderStatus === "PRICING_REVIEW" && item?.order_item?.is_reskin_request && (
          <div className="bg-primary/10 p-2 rounded border border-primary/20 mt-4 font-mono text-xs text-muted-foreground">
            <p>Target brand: {item?.order_item?.reskin_target_brand_name}</p>
            <p className="mt-2">Client instructions: {item?.order_item?.reskin_notes}</p>
            <p className="mt-2">Status: ⏳ Pending Admin Action</p>
          </div>
        )}

        {/* Reskin Request for PENDING_APPROVAL status */}
        {orderStatus === "PENDING_APPROVAL" && item?.order_item?.is_reskin_request && (
          <div className="bg-primary/10 p-2 rounded border border-primary/20 mt-4 font-mono text-xs text-muted-foreground">
            <p className="mt-2">Client instructions: {item?.order_item?.reskin_notes}</p>
            <p className="mt-2">Status: ⏳ Awaiting Processing</p>

            {!reskinRequest && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="default"
                  className="text-xs font-mono"
                  onClick={handleProcessReskin}
                >
                  Rebrand Request
                </Button>
                <Button
                  variant="outline"
                  className="text-xs font-mono"
                  onClick={handleRejectReskin}
                >
                  Reject & Contact Client
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
