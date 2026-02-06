"use client";

/**
 * Return to Logistics Modal
 * Modal for sending an order back to the Logistics team for revision
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useReturnToLogistics } from "@/hooks/use-orders";

interface ReturnToLogisticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
}

export function ReturnToLogisticsModal({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: ReturnToLogisticsModalProps) {
  const returnToLogistics = useReturnToLogistics();
  const [returnReason, setReturnReason] = useState("");

  const handleSubmit = async () => {
    if (!returnReason.trim() || returnReason.trim().length < 10) {
      toast.error("Please provide a reason (min 10 characters)");
      return;
    }

    try {
      await returnToLogistics.mutateAsync({ orderId, reason: returnReason.trim() });
      toast.success("Order returned to Logistics for revision");
      onOpenChange(false);
      setReturnReason("");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to return order");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setReturnReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary" />
            Return to Logistics
          </DialogTitle>
          <DialogDescription>
            This will send the order back to the Logistics team for revision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="returnReason">
              Reason for Return <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="returnReason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Explain why this order needs to be returned to Logistics (min 10 characters)..."
              rows={4}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {returnReason.trim().length}/10 characters minimum
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={returnToLogistics.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={returnToLogistics.isPending || returnReason.trim().length < 10}
          >
            {returnToLogistics.isPending ? "Returning..." : "Return to Logistics"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
