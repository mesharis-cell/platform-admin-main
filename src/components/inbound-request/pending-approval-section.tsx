"use client";

/**
 * PENDING_APPROVAL Section (Admin Review) for Inbound Requests
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus } from "lucide-react";
import { toast } from "sonner";
import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { PricingBreakdownTabs } from "@/components/pricing/PricingBreakdownTabs";
import { ReturnInboundRequestToLogisticsModal } from "./return-to-logistics-modal";
import { useAdminApproveInboundRequest } from "@/hooks/use-inbound-requests";
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
    isRefetching,
}: InboundRequestPendingApprovalSectionProps) {
    const adminApproveRequest = useAdminApproveInboundRequest();

    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const [marginOverride, setMarginOverride] = useState(false);
    // Default margin from pricing
    const [marginPercent, setMarginPercent] = useState<any>(
        Number(request?.request_pricing?.margin?.percent || 0)
    );
    const [marginReason, setMarginReason] = useState("");
    const [returnToLogisticsOpen, setReturnToLogisticsOpen] = useState(false);

    const pricing = request.request_pricing as any;
    const currentMarginPercent = Number(pricing?.margin?.percent || 0);
    const projections = pricing?.projections || {
        admin: pricing || null,
        logistics: null,
        client: null,
    };

    const handleApprove = async () => {
        if (marginOverride && Math.abs(Number(marginPercent) - currentMarginPercent) < 0.0001) {
            toast.error("Margin is same as current margin");
            return;
        }

        if (marginOverride && !marginReason.trim()) {
            toast.error("Please provide reason for margin override");
            return;
        }

        try {
            await adminApproveRequest.mutateAsync({
                id: requestId,
                marginOverridePercent: marginOverride ? Number(marginPercent) : undefined,
                marginOverrideReason: marginOverride ? marginReason : undefined,
            });
            toast.success("Request approved and sent to client");
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve request");
        }
    };

    const isPendingApproval = request.request_status === "PENDING_APPROVAL";

    return (
        <div className="space-y-6">
            {/* Service Line Items */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Service Line Items
                        </CardTitle>
                        {isPendingApproval && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddCatalogOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Catalog Service
                                </Button>
                                <Button size="sm" onClick={() => setAddCustomOpen(true)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Custom Charge
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <OrderLineItemsList
                        targetId={requestId}
                        canManage={isPendingApproval}
                        purposeType="INBOUND_REQUEST"
                    />
                </CardContent>
            </Card>

            {/* Tabbed pricing breakdown — three role views from the same snapshot */}
            <PricingBreakdownTabs
                projections={projections}
                calculatedAt={pricing?.calculated_at}
                onRefresh={onRefresh}
                isRefetching={isRefetching}
            />

            {isPendingApproval && (
                <Card>
                    <CardHeader>
                        <CardTitle>Approve Quote</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="marginOverride"
                                    checked={marginOverride}
                                    onCheckedChange={(checked) =>
                                        setMarginOverride(checked as boolean)
                                    }
                                />
                                <Label htmlFor="marginOverride" className="cursor-pointer">
                                    Override platform margin
                                </Label>
                            </div>

                            {marginOverride && (
                                <div className="space-y-3 pl-6 border-l-2 border-primary">
                                    <div>
                                        <Label>Margin Percent (%)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={marginPercent}
                                            onChange={(e) =>
                                                setMarginPercent(Number(e.target.value || 0))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label>Reason for Override</Label>
                                        <Textarea
                                            value={marginReason}
                                            onChange={(e) => setMarginReason(e.target.value)}
                                            placeholder="e.g., High-value request, premium service justifies higher margin"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleApprove}
                                disabled={adminApproveRequest.isPending}
                                className="flex-1"
                            >
                                {adminApproveRequest.isPending
                                    ? "Approving..."
                                    : "Approve & Send Quote to Client"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setReturnToLogisticsOpen(true)}
                            >
                                Return to Logistics
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modals */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={requestId}
                purposeType="INBOUND_REQUEST"
            />
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                targetId={requestId}
                purposeType="INBOUND_REQUEST"
            />

            {/* Return to Logistics Modal */}
            <ReturnInboundRequestToLogisticsModal
                open={returnToLogisticsOpen}
                onOpenChange={setReturnToLogisticsOpen}
                onSuccess={onRefresh}
                requestId={requestId}
            />
        </div>
    );
}
