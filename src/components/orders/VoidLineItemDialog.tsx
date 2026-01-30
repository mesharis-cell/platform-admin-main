"use client";

/**
 * Void Line Item Dialog Component
 * For entering a reason when voiding/removing a line item
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import type { OrderLineItem } from "@/types/hybrid-pricing";

interface VoidLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OrderLineItem | null;
  onConfirm: (reason: string) => Promise<void>;
  isPending: boolean;
}

export function VoidLineItemDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
  isPending,
}: VoidLineItemDialogProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    await onConfirm(reason.trim());
    setReason("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  const isValid = reason.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md font-mono">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Trash2 className="h-4 w-4" />
            <span>Line Item / Void</span>
          </div>
          <DialogTitle className="text-xl">Remove Line Item</DialogTitle>
          <DialogDescription>
            Please provide a reason for removing this line item. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Info */}
          {item && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Item
              </p>
              <p className="mt-1 font-semibold">{item.description}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.total.toFixed(2)} AED
              </p>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label
              htmlFor="void-reason"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Reason for removal *
            </Label>
            <Textarea
              id="void-reason"
              placeholder="Enter the reason for removing this line item..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none font-mono text-sm"
            />
            {reason.trim().length > 0 && reason.trim().length < 10 && (
              <p className="text-xs text-destructive">
                Reason must be at least 10 characters ({reason.trim().length}/10)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="font-mono"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || !isValid}
            className="gap-2 font-mono"
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? "Removing..." : "Remove Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
