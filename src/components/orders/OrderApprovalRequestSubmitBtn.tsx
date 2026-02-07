"use client";

/**
 * Approval Request Submit Button
 * A standalone button component for submitting orders or inbound requests for admin approval
 */

import { Button } from "@/components/ui/button";
import { useSubmitInboundRequestForApproval } from "@/hooks/use-inbound-requests";
import { useSubmitForApproval } from "@/hooks/use-orders";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface OrderApprovalRequestSubmitBtnProps {
  orderId: string;
  onSubmitSuccess?: () => void;
  isVisible?: boolean;
  type?: "ORDER" | "INBOUND_REQUEST";
}

export function OrderApprovalRequestSubmitBtn({
  orderId,
  onSubmitSuccess,
  isVisible,
  type = "ORDER"
}: OrderApprovalRequestSubmitBtnProps) {
  const submitOrderForApproval = useSubmitForApproval();
  const submitInboundRequestForApproval = useSubmitInboundRequestForApproval();

  const isPending = type === "ORDER"
    ? submitOrderForApproval.isPending
    : submitInboundRequestForApproval.isPending;

  const handleSubmit = async () => {
    try {
      if (type === "ORDER") {
        await submitOrderForApproval.mutateAsync(orderId);
        toast.success("Order submitted to Admin for approval!");
      } else {
        await submitInboundRequestForApproval.mutateAsync(orderId);
        toast.success("Inbound Request submitted to Admin for approval!");
      }

      onSubmitSuccess?.();
      // window.location.reload(); // Removed reload as react-query should handle updates
    } catch (error: any) {
      toast.error(error.message || `Failed to submit ${type === "ORDER" ? "order" : "request"}`);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${isVisible ? "block" : "hidden"}`}>
      <Button
        onClick={handleSubmit}
        disabled={isPending}
        size="lg"
        className="gap-2"
      >
        <Send className="h-5 w-5" />
        {isPending ? "Submitting..." : "Submit for Admin Approval"}
      </Button>
      <p className="text-xs text-muted-foreground">
        After submission, Admin will review pricing, process any rebrand requests, and send
        the final quote to the client.
      </p>
    </div>
  );
}
