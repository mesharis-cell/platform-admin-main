"use client";

/**
 * Pricing Section for Inbound Requests (New Stock Requests).
 *
 * Mirrors app/orders/[id]/hybrid-sections.tsx (Phase 2): the PricingLedger
 * (purposeType INBOUND_REQUEST) owns the entire line-item + pricing + preview-lens
 * + add / bulk-margin / no-cost surface. This section supplies the inbound approve
 * mutation + Return-to-Logistics action, surfaced only while the request awaits
 * admin decision (PENDING_APPROVAL). The ledger self-gates editability off the
 * request status (editable through QUOTED via PRICING_EDITABLE_STATUSES; locked at
 * NO_COST / financial lock / terminal — CONFIRMED / DECLINED / COMPLETED /
 * CANCELLED).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PricingLedger } from "@/components/pricing";
import { ReturnInboundRequestToLogisticsModal } from "./return-to-logistics-modal";
import { useAdminApproveInboundRequest } from "@/hooks/use-inbound-requests";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import type { InboundRequestDetails } from "@/types/inbound-request";

interface InboundRequestPendingApprovalSectionProps {
    request: InboundRequestDetails;
    requestId: string;
    onRefresh?: () => void;
    isRefetching?: boolean;
}

export function PendingApprovalSection({
    request,
    requestId,
    onRefresh,
}: InboundRequestPendingApprovalSectionProps) {
    const { user } = useToken();
    const adminApproveRequest = useAdminApproveInboundRequest();
    const [returnToLogisticsOpen, setReturnToLogisticsOpen] = useState(false);

    // The approve-request route enforces inbound_requests:update — gate on the
    // same key so the button never shows to a user the API would 403.
    const canApproveQuote = hasPermission(user, ADMIN_ACTION_PERMISSIONS.inboundRequestsUpdate);
    const isPendingApproval = request.request_status === "PENDING_APPROVAL";
    const showAdminActions = isPendingApproval && canApproveQuote;

    const handleApprove = async () => {
        if (!canApproveQuote) return;
        try {
            await adminApproveRequest.mutateAsync({ id: requestId });
            toast.success("Request approved and sent to client");
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve request");
        }
    };

    return (
        <div className="space-y-6">
            {/* The single editable money table: line items + role-preview lenses +
                footer totals + add / bulk-margin / no-cost actions. Owns the QUOTED
                pull-back confirm + post-quote banner internally. */}
            <PricingLedger
                purposeType="INBOUND_REQUEST"
                entityId={requestId}
                entityStatus={request.request_status}
                pricingMode={
                    (request as { pricing_mode?: "STANDARD" | "NO_COST" }).pricing_mode ||
                    "STANDARD"
                }
                onApprove={showAdminActions ? handleApprove : undefined}
                approveLabel="Approve & Send Quote to Client"
                approveBusy={adminApproveRequest.isPending}
            />

            {/* Return-to-Logistics: hands a pending-approval request back for
                revision. Not a pricing action, so it sits beside the ledger. */}
            {showAdminActions && (
                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setReturnToLogisticsOpen(true)}>
                        Return to Logistics
                    </Button>
                </div>
            )}

            <ReturnInboundRequestToLogisticsModal
                open={returnToLogisticsOpen}
                onOpenChange={setReturnToLogisticsOpen}
                onSuccess={onRefresh}
                requestId={requestId}
            />
        </div>
    );
}
