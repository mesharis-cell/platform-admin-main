"use client";

/**
 * Hybrid Pricing Sections for Order Detail
 * Sections to be integrated into main order detail page
 */

import { CancelOrderModal } from "@/components/orders/CancelOrderModal";
import { ReturnToLogisticsModal } from "@/components/orders/ReturnToLogisticsModal";
import { PricingLedger } from "@/components/pricing";
import { Button } from "@/components/ui/button";
import { useAdminApproveQuote } from "@/hooks/use-orders";

import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { useState } from "react";
import { toast } from "sonner";

interface HybridPricingSectionProps {
    order: any;
    orderId: string;
    onRefresh?: () => void;
    isRefetching?: boolean;
}

/**
 * PENDING_APPROVAL Section (Admin Review)
 */
export function PendingApprovalSection({ order, orderId, onRefresh }: HybridPricingSectionProps) {
    const { user } = useToken();
    const adminApproveQuote = useAdminApproveQuote();
    const [returnToLogisticsOpen, setReturnToLogisticsOpen] = useState(false);

    const canApproveQuote = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersPricingAdminApprove);
    const pendingDecisionRequests = (order?.maintenance_decision_change_requests || []).filter(
        (request: any) => request.status === "PENDING"
    );
    // The approve slot + Return-to-Logistics are admin-only actions surfaced only
    // while the order awaits admin decision. All pricing (add/edit/void/bulk-margin/
    // no-cost/preview lenses/QUOTED pull-back) now lives inside the PricingLedger.
    const isPendingApproval = order.order_status === "PENDING_APPROVAL";
    const showAdminActions = isPendingApproval && canApproveQuote;

    const handleApprove = async () => {
        if (!canApproveQuote) return;
        if (pendingDecisionRequests.length > 0) {
            toast.error("Resolve pending maintenance decision requests before sending quote");
            return;
        }
        try {
            await adminApproveQuote.mutateAsync({ orderId });
            toast.success("Quote approved and sent to client");
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve quote");
        }
    };

    return (
        <div className="space-y-6">
            {showAdminActions && pendingDecisionRequests.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
                    Resolve {pendingDecisionRequests.length} maintenance decision{" "}
                    {pendingDecisionRequests.length === 1 ? "request" : "requests"} before sending
                    this quote.
                </div>
            )}

            {/* The single editable money table: line items + role-preview lenses +
                footer totals + add/bulk-margin/no-cost actions. Owns the QUOTED
                pull-back confirm + post-quote banner internally. */}
            <PricingLedger
                purposeType="ORDER"
                entityId={orderId}
                entityStatus={order.order_status}
                pricingMode={order.pricing_mode || "STANDARD"}
                onApprove={showAdminActions ? handleApprove : undefined}
                approveLabel="Approve & Send Quote to Client"
                approveDisabled={pendingDecisionRequests.length > 0}
                approveBusy={adminApproveQuote.isPending}
            />

            {/* Return-to-Logistics: hands a pending-approval order back for revision.
                Not a pricing action, so it sits beside the ledger, not inside it. */}
            {showAdminActions && (
                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setReturnToLogisticsOpen(true)}>
                        Return to Logistics
                    </Button>
                </div>
            )}

            <ReturnToLogisticsModal
                open={returnToLogisticsOpen}
                onOpenChange={setReturnToLogisticsOpen}
                onSuccess={onRefresh}
                orderId={orderId}
            />
        </div>
    );
}

/**
 * Cancel Order Button (shows if order can be cancelled)
 */
export function CancelOrderButton({ order, orderId }: HybridPricingSectionProps) {
    const { user } = useToken();
    const [cancelOpen, setCancelOpen] = useState(false);

    const CANCELLABLE_STATUSES = [
        "DRAFT",
        "SUBMITTED",
        "PRICING_REVIEW",
        "PENDING_APPROVAL",
        "QUOTED",
        "CONFIRMED",
        "IN_PREPARATION",
    ];

    const canCancel = CANCELLABLE_STATUSES.includes(order.order_status);
    const canCancelOrder = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersCancel);

    if (!canCancel || !canCancelOrder) return null;

    return (
        <>
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel Order
            </Button>

            <CancelOrderModal
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                orderId={orderId}
                orderIdReadable={order.order_id}
                companyName={order.company?.name}
                currentStatus={order.order_status}
                itemCount={order.items?.length || 0}
                pendingReskinCount={0}
            />
        </>
    );
}
