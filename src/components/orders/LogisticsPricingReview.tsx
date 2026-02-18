"use client";

/**
 * Logistics Pricing Review Component
 * For PRICING_REVIEW status - Logistics adds line items and submits to Admin
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus } from "lucide-react";
import { OrderLineItemsList } from "./OrderLineItemsList";
import { AddCatalogLineItemModal } from "./AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "./AddCustomLineItemModal";
import { canManageLineItems } from "@/lib/order-helpers";
import type { OrderPricing } from "@/types/hybrid-pricing";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { MaintenancePromptCard } from "./MaintenancePromptCard";

interface LogisticsPricingReviewProps {
    orderId: string;
    order: any;
    onSubmitSuccess?: () => void;
}

export function LogisticsPricingReview({
    orderId,
    order,
    onSubmitSuccess: _onSubmitSuccess,
}: LogisticsPricingReviewProps) {
    const { user } = useToken();
    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const canManagePricing = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersPricingAdjust);
    const canManageServiceItems = canManageLineItems(order?.order_status) && canManagePricing;

    const pricing = order?.order_pricing as OrderPricing | undefined;
    const hasRebrandRequests = order?.items?.some((item: any) => item.isReskinRequest);
    const damagedItemCount =
        order?.items?.filter((item: any) => {
            const condition = item?.asset?.condition || item?.condition || "";
            return condition === "ORANGE" || condition === "RED";
        }).length || 0;

    return (
        <div className="space-y-6">
            {/* Rebrand Notice */}
            {hasRebrandRequests && (
                <Card className="border-amber-500/30 bg-amber-500/10">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold text-amber-500 mb-1">
                            🔄 This order includes rebrand requests
                        </p>
                        <p className="text-xs text-amber-500">
                            Admin or Logistics can process rebrand pricing in this phase.
                            Fabrication completion happens later in AWAITING_FABRICATION.
                        </p>
                    </CardContent>
                </Card>
            )}

            <MaintenancePromptCard
                damagedItemCount={damagedItemCount}
                canManage={canManageServiceItems}
                onAddCustomLine={() => setAddCustomOpen(true)}
            />

            {/* Service Line Items */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Service Line Items</CardTitle>
                        {canManageServiceItems && (
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => setAddCatalogOpen(true)}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Catalog Service
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddCustomOpen(true)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Custom Service
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <OrderLineItemsList
                        targetId={orderId}
                        canManage={
                            canManageLineItems(order?.orderStatus || order?.order_status) &&
                            canManagePricing
                        }
                    />
                    <p className="text-xs text-muted-foreground mt-3">
                        Add catalog or custom services. Custom totals are derived as qty × unit
                        rate.
                    </p>
                </CardContent>
            </Card>

            {/* Pricing Breakdown (Read-only for Logistics) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Pricing Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!pricing && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-sm font-semibold text-destructive mb-2">
                                ⚠️ Pricing calculation failed
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                                This order may be missing required pricing configuration.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Please contact your Platform Admin to complete pricing setup.
                            </p>
                        </div>
                    )}
                    {pricing && (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between p-2 bg-muted/30 rounded">
                                <span className="text-muted-foreground">
                                    Base Operations ({order?.calculated_totals?.volume || 0} m³)
                                </span>
                                <span className="font-mono">{pricing.base_ops_total || 0} AED</span>
                            </div>
                            {pricing.line_items?.catalog_total ? (
                                <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Service Line Item</span>
                                    <span className="font-mono">
                                        {pricing.line_items?.catalog_total?.toFixed(2) || 0} AED
                                    </span>
                                </div>
                            ) : null}
                            <div className="border-t border-border my-2"></div>
                            <div className="flex justify-between font-semibold">
                                <span>Estimated Subtotal</span>
                                <span className="font-mono">
                                    {pricing.logistics_sub_total || 0} AED
                                </span>
                            </div>
                            {/* <p className="text-xs text-muted-foreground">
                                + Platform margin ({pricing.margin?.percent || 25}%) will be added
                                by Admin
                            </p> */}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={orderId}
            />
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                targetId={orderId}
            />
        </div>
    );
}
