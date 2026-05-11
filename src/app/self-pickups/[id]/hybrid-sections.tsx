"use client";

/**
 * Hybrid Pricing Sections for Self-Pickup Detail.
 * Direct port of app/orders/[id]/hybrid-sections.tsx — identical layout,
 * identical pricing card, identical margin override UX. Swaps entity-scoped
 * imports (ORDER → SELF_PICKUP) + related hook/modal/permission names only.
 * See SP3 in .claude/plans/tender-knitting-avalanche.md.
 */

import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { ReturnToLogisticsSelfPickupModal } from "@/components/self-pickups/ReturnToLogisticsSelfPickupModal";
import { PricingBreakdownTabs } from "@/components/pricing/PricingBreakdownTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminApproveQuote } from "@/hooks/use-self-pickups";

import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { DollarSign, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface HybridPricingSectionProps {
    pickup: any;
    selfPickupId: string;
    onRefresh?: () => void;
    isRefetching?: boolean;
}

const LINE_ITEM_MANAGEABLE_STATUSES = ["PRICING_REVIEW", "PENDING_APPROVAL"];

/**
 * PENDING_APPROVAL Section (Admin Review).
 * Renders the full pricing review card + approve/return-to-logistics actions.
 */
export function SelfPickupPendingApprovalSection({
    pickup,
    selfPickupId,
    onRefresh,
    isRefetching,
}: HybridPricingSectionProps) {
    const { user } = useToken();
    const adminApproveQuote = useAdminApproveQuote();

    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const [marginOverride, setMarginOverride] = useState(false);
    const currentMarginPercent = Number(
        pickup?.self_pickup_pricing?.margin?.percent ??
            pickup?.company?.platform_margin_percent ??
            0
    );
    const [marginPercent, setMarginPercent] = useState(currentMarginPercent);
    const [marginReason, setMarginReason] = useState("");
    const [returnToLogisticsOpen, setReturnToLogisticsOpen] = useState(false);
    const canManagePricing = hasPermission(user, ADMIN_ACTION_PERMISSIONS.selfPickupsPricingAdjust);
    const canApproveQuote = hasPermission(
        user,
        ADMIN_ACTION_PERMISSIONS.selfPickupsPricingAdminApprove
    );
    const canManageServiceItems =
        LINE_ITEM_MANAGEABLE_STATUSES.includes(pickup.self_pickup_status) && canManagePricing;
    const pricing = pickup?.self_pickup_pricing;
    const projections = pricing?.projections || {
        admin: pricing || null,
        logistics: null,
        client: null,
    };

    const handleApprove = async () => {
        if (!canApproveQuote) return;
        if (marginOverride && Math.abs(Number(marginPercent) - currentMarginPercent) < 0.0001) {
            toast.error("Margin is same as company margin");
            return;
        }

        if (marginOverride && !marginReason.trim()) {
            toast.error("Please provide reason for margin override");
            return;
        }

        try {
            await adminApproveQuote.mutateAsync({
                id: selfPickupId,
                marginOverridePercent: marginOverride ? marginPercent : undefined,
                marginOverrideReason: marginOverride ? marginReason : undefined,
            });
            toast.success("Quote approved and sent to client");
            onRefresh?.();
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to approve quote");
        }
    };

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
                        {canManageServiceItems && (
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
                        targetId={selfPickupId}
                        purposeType="SELF_PICKUP"
                        canManage={canManageServiceItems}
                        allowClientVisibilityControls
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

            {pickup.self_pickup_status === "PENDING_APPROVAL" && canApproveQuote && (
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
                                            placeholder="e.g., High-value pickup, premium service justifies higher margin"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleApprove}
                                disabled={adminApproveQuote.isPending}
                                className="flex-1"
                            >
                                {adminApproveQuote.isPending
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
                targetId={selfPickupId}
                purposeType="SELF_PICKUP"
            />
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                targetId={selfPickupId}
                purposeType="SELF_PICKUP"
            />

            {/* Return to Logistics Modal */}
            <ReturnToLogisticsSelfPickupModal
                open={returnToLogisticsOpen}
                onOpenChange={setReturnToLogisticsOpen}
                onSuccess={onRefresh}
                selfPickupId={selfPickupId}
            />
        </div>
    );
}
