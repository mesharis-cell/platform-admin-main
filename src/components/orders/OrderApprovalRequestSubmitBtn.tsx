"use client";

/**
 * Order Approval Request Submit Button
 * A standalone button component for submitting orders for admin approval
 */

import { Button } from "@/components/ui/button";
import { useSubmitForApproval } from "@/hooks/use-orders";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface OrderApprovalRequestSubmitBtnProps {
  orderId: string;
  onSubmitSuccess?: () => void;
}

export function OrderApprovalRequestSubmitBtn({
  orderId,
  onSubmitSuccess
}: OrderApprovalRequestSubmitBtnProps) {
  const submitForApproval = useSubmitForApproval();

  const handleSubmit = async () => {
    try {
      await submitForApproval.mutateAsync(orderId);
      toast.success("Order submitted to Admin for approval!");
      onSubmitSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit order");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleSubmit}
        disabled={submitForApproval.isPending}
        size="lg"
        className="gap-2"
      >
        <Send className="h-5 w-5" />
        {submitForApproval.isPending ? "Submitting..." : "Submit for Admin Approval"}
      </Button>
      <p className="text-xs text-muted-foreground">
        After submission, Admin will review pricing, process any rebrand requests, and send
        the final quote to the client.
      </p>
    </div>
  );
}
