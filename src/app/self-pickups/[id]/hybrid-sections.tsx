"use client";

/**
 * Hybrid Pricing Section for Self-Pickup Detail.
 *
 * Mirrors app/orders/[id]/hybrid-sections.tsx (Phase 2): the PricingLedger
 * (purposeType SELF_PICKUP) owns the entire line-item + pricing + preview-lens +
 * add / bulk-margin / no-cost surface. This section only supplies the SP approve
 * mutation + Return-to-Logistics action, surfaced while the pickup awaits admin
 * decision (PENDING_APPROVAL). The ledger self-gates editability off the SP status
 * (editable through QUOTED via PRICING_EDITABLE_STATUSES; locked at NO_COST /
 * financial lock / terminal).
 */

import { ReturnToLogisticsSelfPickupModal } from "@/components/self-pickups/ReturnToLogisticsSelfPickupModal";
import { PricingLedger } from "@/components/pricing";
import { Button } from "@/components/ui/button";
import { useAdminApproveQuote } from "@/hooks/use-self-pickups";

import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { useState } from "react";
import { toast } from "sonner";

interface HybridPricingSectionProps {
    pickup: any;
    selfPickupId: string;
    onRefresh?: () => void;
    isRefetching?: boolean;
}

/**
 * Self-pickup pricing section. Renders for every non-NO_COST status; the ledger
 * shows read-only lenses once the pickup is past the editable band. The approve
 * slot + Return-to-Logistics appear only at PENDING_APPROVAL.
 */
export function SelfPickupPendingApprovalSection({
    pickup,
    selfPickupId,
    onRefresh,
}: HybridPricingSectionProps) {
    const { user } = useToken();
    const adminApproveQuote = useAdminApproveQuote();
    const [returnToLogisticsOpen, setReturnToLogisticsOpen] = useState(false);

    const canApproveQuote = hasPermission(
        user,
        ADMIN_ACTION_PERMISSIONS.selfPickupsPricingAdminApprove
    );
    // Approve + Return-to-Logistics are admin actions surfaced only while the
    // pickup awaits admin decision. (LOGISTICS may also approve SP quotes, but
    // this is the ADMIN app — middleware-gated; the API accepts both roles.)
    const isPendingApproval = pickup.self_pickup_status === "PENDING_APPROVAL";
    const showAdminActions = isPendingApproval && canApproveQuote;

    const handleApprove = async () => {
        if (!canApproveQuote) return;
        try {
            await adminApproveQuote.mutateAsync({ id: selfPickupId });
            toast.success("Quote approved and sent to client");
            onRefresh?.();
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to approve quote");
        }
    };

    return (
        <div className="space-y-6">
            {/* The single editable money table: line items + role-preview lenses +
                footer totals + add / bulk-margin / no-cost actions. Owns the QUOTED
                pull-back confirm + post-quote banner internally. */}
            <PricingLedger
                purposeType="SELF_PICKUP"
                entityId={selfPickupId}
                entityStatus={pickup.self_pickup_status}
                pricingMode={pickup.pricing_mode || "STANDARD"}
                onApprove={showAdminActions ? handleApprove : undefined}
                approveLabel="Approve & Send Quote to Client"
                approveBusy={adminApproveQuote.isPending}
            />

            {/* Return-to-Logistics: hands a pending-approval pickup back for
                revision. Not a pricing action, so it sits beside the ledger. */}
            {showAdminActions && (
                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setReturnToLogisticsOpen(true)}>
                        Return to Logistics
                    </Button>
                </div>
            )}

            <ReturnToLogisticsSelfPickupModal
                open={returnToLogisticsOpen}
                onOpenChange={setReturnToLogisticsOpen}
                onSuccess={onRefresh}
                selfPickupId={selfPickupId}
            />
        </div>
    );
}
