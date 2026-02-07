"use client";

/**
 * Return to Logistics Modal (Inbound Request)
 * Modal for sending an inbound request back to the Logistics team for revision
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
import { useReturnInboundRequestToLogistics } from "@/hooks/use-inbound-requests";

interface ReturnToLogisticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onSuccess?: () => void;
}

export function ReturnInboundRequestToLogisticsModal({
  open,
  onOpenChange,
  requestId,
  onSuccess,
}: ReturnToLogisticsModalProps) {
  const returnToLogistics = useReturnInboundRequestToLogistics();
  const [returnReason, setReturnReason] = useState("");

  const handleSubmit = async () => {
    if (!returnReason.trim() || returnReason.trim().length < 10) {
      toast.error("Please provide a reason (min 10 characters)");
      return;
    }

    try {
      await returnToLogistics.mutateAsync({ id: requestId, reason: returnReason.trim() });
      toast.success("Request returned to Logistics for revision");
      onOpenChange(false);
      setReturnReason("");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to return request");
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
            This will send the request back to the Logistics team for revision.
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
              placeholder="Explain why this request needs to be returned to Logistics (min 10 characters)..."
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
