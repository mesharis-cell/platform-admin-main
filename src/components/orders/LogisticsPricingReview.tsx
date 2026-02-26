"use client";

/**
 * Logistics Pricing Review Component
 * For PRICING_REVIEW status - Logistics adds line items and submits to Admin
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRecalculateBaseOps } from "@/hooks/use-orders";
import { OrderLineItemsList } from "./OrderLineItemsList";
import { AddCatalogLineItemModal } from "./AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "./AddCustomLineItemModal";
import { canManageLineItems } from "@/lib/order-helpers";
import type { OrderPricing } from "@/types/hybrid-pricing";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";

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
    const canRecalculate = ["PRICING_REVIEW", "PENDING_APPROVAL"].includes(order?.order_status);
    const recalculate = useRecalculateBaseOps();
    const volume = parseFloat(order?.calculated_totals?.volume || "0");

    const handleRecalculate = async () => {
        try {
            await recalculate.mutateAsync(order.id);
            toast.success("Base operations recalculated");
            _onSubmitSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to recalculate");
        }
    };

    const pricing = order?.order_pricing as OrderPricing | undefined;
    return (
        <div className="space-y-6">
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
                            <div className="p-2 bg-muted/30 rounded space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Base Operations ({volume.toFixed(3)} m³)
                                    </span>
                                    <span className="font-mono">
                                        {pricing.base_ops_total || 0} AED
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    {volume === 0 && (
                                        <span className="text-xs text-amber-600">
                                            Update asset dimensions if needed
                                        </span>
                                    )}
                                    {volume > 0 && <span />}
                                    {canRecalculate && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-primary gap-1"
                                            onClick={handleRecalculate}
                                            disabled={recalculate.isPending}
                                        >
                                            <RefreshCw
                                                className={`h-3 w-3 ${recalculate.isPending ? "animate-spin" : ""}`}
                                            />
                                            {recalculate.isPending
                                                ? "Recalculating..."
                                                : "Recalculate"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {pricing.line_items?.catalog_total ? (
                                <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Service Line Item</span>
                                    <span className="font-mono">
                                        {pricing.line_items?.catalog_total?.toFixed(2) || 0} AED
                                    </span>
                                </div>
                            ) : null}
                            {pricing.line_items?.custom_total ? (
                                <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Custom Charges</span>
                                    <span className="font-mono">
                                        {Number(pricing.line_items.custom_total).toFixed(2)} AED
                                    </span>
                                </div>
                            ) : null}
                            {pricing.margin && (
                                <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">
                                        Platform Margin ({pricing.margin.percent}%)
                                    </span>
                                    <span className="font-mono">
                                        {Number(pricing.margin.amount || 0).toFixed(2)} AED
                                    </span>
                                </div>
                            )}
                            <div className="border-t border-border my-2"></div>
                            <div className="flex justify-between font-semibold">
                                <span>Client Total</span>
                                <span className="font-mono">
                                    {Number(
                                        pricing.sell?.final_total ?? pricing.final_total ?? 0
                                    ).toFixed(2)}{" "}
                                    AED
                                </span>
                            </div>
                            {pricing.calculated_at && (
                                <p className="text-xs text-muted-foreground text-right">
                                    Last calculated:{" "}
                                    {new Date(pricing.calculated_at).toLocaleString()}
                                </p>
                            )}
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
