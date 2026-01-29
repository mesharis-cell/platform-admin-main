"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import type { ReskinRequest } from "@/types/hybrid-pricing";

type ReskinStatus = "pending" | "complete" | "cancelled";

interface ReskinItemCardProps {
  reskin: ReskinRequest & {
    id: string;
    originalAssetName: string;
    targetBrandCustom?: string;
    newAssetName?: string;
    clientNotes?: string;
    completedAt?: string;
    cancellationReason?: string;
  };
  status: ReskinStatus;
  onMarkComplete?: (reskin: any) => void;
  onCancel?: (reskin: any) => void;
  orderStatus?: string;
}

export function ReskinItemCard({
  reskin,
  status,
  onMarkComplete,
  onCancel,
  orderStatus,
}: ReskinItemCardProps) {
  const showActionButton = orderStatus === "AWAITING_FABRICATION" && reskin.completedAt === null;

  if (status === "pending") {
    return (
      <div className="border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10 rounded-md p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span className="font-semibold text-sm">
              {reskin.originalAssetName} →{" "}
              {reskin.targetBrandCustom || "Brand"}
            </span>
          </div>
          <Badge className="bg-amber-500">Pending</Badge>
        </div>

        <div className="text-sm space-y-1 mb-3">
          <p className="text-muted-foreground">Client Notes:</p>
          <p className="text-sm">{reskin.clientNotes}</p>
        </div>

        {showActionButton && <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onMarkComplete?.(reskin)}
          >
            Mark Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel?.(reskin)}
          >
            Cancel Reskin
          </Button>
        </div>}
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="border border-green-500/30 bg-green-50/50 dark:bg-green-950/10 rounded-md p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="font-semibold text-sm">
            {reskin.originalAssetName} → {reskin.newAssetName}
          </span>
          <Badge className="bg-green-500 ml-auto">Complete</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Completed: {reskin.completedAt ? new Date(reskin.completedAt).toLocaleDateString() : "N/A"}
        </p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="border border-border bg-muted/30 rounded-md p-4">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm text-muted-foreground line-through">
            {reskin.originalAssetName}
          </span>
          <Badge variant="outline" className="ml-auto">
            Cancelled
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Reason: {reskin.cancellationReason}
        </p>
      </div>
    );
  }

  return null;
}
