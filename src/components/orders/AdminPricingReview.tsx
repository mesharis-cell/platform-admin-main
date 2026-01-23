"use client";

/**
 * Complete Admin Pricing Review Component
 * Full-featured pricing review for PENDING_APPROVAL status
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, Plus, Truck, Package } from "lucide-react";
import { ReskinRequestsList } from "./ReskinRequestsList";
import { OrderLineItemsList } from "./OrderLineItemsList";
import { AddCatalogLineItemModal } from "./AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "./AddCustomLineItemModal";
import { useAdminApproveQuote, useReturnToLogistics } from "@/hooks/use-orders";
import { useListOrderLineItems } from "@/hooks/use-order-line-items";
import type { OrderPricing } from "@/types/hybrid-pricing";

interface AdminPricingReviewProps {
    orderId: string;
    order: any;
}

export function AdminPricingReview({ orderId, order }: AdminPricingReviewProps) {
    const adminApproveQuote = useAdminApproveQuote();
    const returnToLogistics = useReturnToLogistics();
    const { data: lineItems } = useListOrderLineItems(orderId);

    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const [marginOverride, setMarginOverride] = useState(false);
    const [marginPercent, setMarginPercent] = useState(order?.company?.platformMarginPercent || 25);
    const [marginReason, setMarginReason] = useState("");

    const pricing = order?.pricing as OrderPricing | undefined;

    // Calculate totals
    const catalogTotal =
        lineItems
            ?.filter((i: any) => i.lineItemType === "CATALOG" && !i.isVoided)
            .reduce((sum: number, item: any) => sum + item.total, 0) || 0;
    const customTotal =
        lineItems
            ?.filter((i: any) => i.lineItemType === "CUSTOM" && !i.isVoided)
            .reduce((sum: number, item: any) => sum + item.total, 0) || 0;

    const handleApprove = async () => {
        if (marginOverride && !marginReason.trim()) {
            toast.error("Please provide reason for margin override");
            return;
        }

        try {
            await adminApproveQuote.mutateAsync({
                orderId,
                marginOverridePercent: marginOverride ? marginPercent : undefined,
                marginOverrideReason: marginOverride ? marginReason.trim() : undefined,
            });
            toast.success("Quote approved and sent to client!");
        } catch (error: any) {
            toast.error(error.message || "Failed to approve quote");
        }
    };

    const handleReturn = async () => {
        const reason = prompt("Reason for returning to Logistics (min 10 characters):");
        if (!reason || reason.trim().length < 10) {
            toast.error("Please provide a detailed reason");
            return;
        }

        try {
            await returnToLogistics.mutateAsync({ orderId, reason: reason.trim() });
            toast.success("Order returned to Logistics for revision");
        } catch (error: any) {
            toast.error(error.message || "Failed to return order");
        }
    };

    return (
        <div className="space-y-6">
            {/* Reskin Requests Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Rebrand Requests
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ReskinRequestsList
                        orderId={orderId}
                        orderStatus={order?.orderStatus || order?.order_status}
                    />
                </CardContent>
            </Card>

            {/* Pricing Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Pricing Review
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Base Operations */}
                    {pricing?.base_operations && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-muted-foreground">
                                    BASE OPERATIONS
                                </h4>
                                <Badge variant="outline">Auto-calculated</Badge>
                            </div>
                            <div className="flex justify-between text-sm p-3 bg-muted/30 rounded-md">
                                <span>
                                    Warehouse Ops ({pricing.base_operations.volume.toFixed(1)} m³ ×{" "}
                                    {pricing.base_operations.rate.toFixed(2)})
                                </span>
                                <span className="font-mono font-semibold">
                                    {pricing.base_operations.total.toFixed(2)} AED
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Transport */}
                    {pricing?.transport && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                TRANSPORT
                            </h4>
                            <div className="flex justify-between text-sm p-3 bg-muted/30 rounded-md">
                                <span>
                                    {pricing.transport.emirate},{" "}
                                    {pricing.transport.trip_type === "ROUND_TRIP"
                                        ? "Round-trip"
                                        : "One-way"}{" "}
                                    ({pricing.transport.vehicle_type})
                                </span>
                                <span className="font-mono font-semibold">
                                    {pricing.transport.final_rate.toFixed(2)} AED
                                </span>
                            </div>
                            {pricing.transport.vehicle_changed && (
                                <p className="text-xs text-amber-600 ml-3">
                                    Vehicle upgraded: {pricing.transport.vehicle_change_reason}
                                </p>
                            )}
                        </div>
                    )}

                    <Separator />

                    {/* Service Line Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-muted-foreground">
                                SERVICE LINE ITEMS
                            </h4>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddCatalogOpen(true)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Catalog
                                </Button>
                                <Button size="sm" onClick={() => setAddCustomOpen(true)}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Custom
                                </Button>
                            </div>
                        </div>
                        <OrderLineItemsList orderId={orderId} canManage={true} />
                    </div>

                    <Separator />

                    {/* Pricing Summary */}
                    <div className="space-y-2 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Logistics Subtotal</span>
                            <span className="font-mono font-semibold">
                                {(
                                    (pricing?.base_operations?.total || 0) +
                                    (pricing?.transport?.final_rate || 0) +
                                    catalogTotal
                                ).toFixed(2)}{" "}
                                AED
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Platform Margin (
                                {marginOverride ? marginPercent : pricing?.margin?.percent || 25}%)
                            </span>
                            <span className="font-mono">
                                {(
                                    ((pricing?.base_operations?.total || 0) +
                                        (pricing?.transport?.final_rate || 0) +
                                        catalogTotal) *
                                    ((marginOverride
                                        ? marginPercent
                                        : pricing?.margin?.percent || 25) /
                                        100)
                                ).toFixed(2)}{" "}
                                AED
                            </span>
                        </div>
                        {customTotal > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Custom Charges (no margin)
                                </span>
                                <span className="font-mono">{customTotal.toFixed(2)} AED</span>
                            </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center">
                            <span className="font-bold">CLIENT TOTAL</span>
                            <span className="text-xl font-bold font-mono text-primary">
                                {(
                                    ((pricing?.base_operations?.total || 0) +
                                        (pricing?.transport?.final_rate || 0) +
                                        catalogTotal) *
                                        (1 +
                                            (marginOverride
                                                ? marginPercent
                                                : pricing?.margin?.percent || 25) /
                                                100) +
                                    customTotal
                                ).toFixed(2)}{" "}
                                AED
                            </span>
                        </div>
                    </div>

                    {/* Margin Override */}
                    <div className="space-y-3 border-t border-border pt-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="marginOverride"
                                checked={marginOverride}
                                onCheckedChange={(checked) => setMarginOverride(checked as boolean)}
                            />
                            <Label htmlFor="marginOverride" className="cursor-pointer font-medium">
                                Override platform margin
                            </Label>
                        </div>

                        {marginOverride && (
                            <div className="space-y-3 pl-6 border-l-2 border-primary">
                                <div>
                                    <Label>
                                        Margin Percent (%){" "}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={marginPercent}
                                        onChange={(e) =>
                                            setMarginPercent(parseFloat(e.target.value))
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Default: {order?.company?.platformMarginPercent || 25}%
                                    </p>
                                </div>
                                <div>
                                    <Label>
                                        Reason for Override{" "}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        value={marginReason}
                                        onChange={(e) => setMarginReason(e.target.value)}
                                        placeholder="e.g., High-value order justifies premium margin..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleApprove}
                            disabled={adminApproveQuote.isPending}
                            className="flex-1"
                            size="lg"
                        >
                            {adminApproveQuote.isPending
                                ? "Approving..."
                                : "Approve & Send Quote to Client"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReturn}
                            disabled={returnToLogistics.isPending}
                        >
                            Return to Logistics
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Modals */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                orderId={orderId}
            />
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                orderId={orderId}
            />
        </div>
    );
}
