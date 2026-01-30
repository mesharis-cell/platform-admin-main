"use client";

/**
 * Hybrid Pricing Sections for Order Detail
 * Sections to be integrated into main order detail page
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, DollarSign, Package } from "lucide-react";
import { ReskinRequestsList } from "@/components/orders/ReskinRequestsList";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { CancelOrderModal } from "@/components/orders/CancelOrderModal";
import { LogisticsPricingReview } from "@/components/orders/LogisticsPricingReview";
import { useAdminApproveQuote, useReturnToLogistics } from "@/hooks/use-orders";
import { canManageLineItems } from "@/lib/order-helpers";

interface HybridPricingSectionProps {
    order: any;
    orderId: string;
    onRefresh?: () => void;
}

/**
 * PENDING_APPROVAL Section (Admin Review)
 */
export function PendingApprovalSection({ order, orderId, onRefresh }: HybridPricingSectionProps) {
    const adminApproveQuote = useAdminApproveQuote();
    const returnToLogistics = useReturnToLogistics();

    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const [marginOverride, setMarginOverride] = useState(false);
    const [marginPercent, setMarginPercent] = useState(order?.company?.platform_margin_percent);
    const [marginReason, setMarginReason] = useState("");

    const marginAmount = order?.order_pricing?.margin?.percent;

    const basePrice = Number(order?.order_pricing?.base_ops_total) + (Number(order?.order_pricing?.base_ops_total) * (marginAmount / 100));
    const transportPrice = Number(order?.order_pricing?.transport.final_rate) + (Number(order?.order_pricing?.transport.final_rate) * (marginAmount / 100));
    const catalogPrice = Number(order?.order_pricing?.line_items?.catalog_total) + (Number(order?.order_pricing?.line_items?.catalog_total) * (marginAmount / 100));
    const customPrice = Number(order?.order_pricing?.line_items?.custom_total)

    const servicePrice = catalogPrice + customPrice;
    const total = basePrice + transportPrice + servicePrice;


    const handleApprove = async () => {
        if (marginOverride && marginAmount === Number(marginPercent)) {
            toast.error("Margin is same as company margin");
            return;
        }

        if (marginOverride && !marginReason.trim()) {
            toast.error("Please provide reason for margin override");
            return;
        }

        try {
            await adminApproveQuote.mutateAsync({
                orderId,
                marginOverridePercent: marginOverride ? marginPercent : undefined,
                marginOverrideReason: marginOverride ? marginReason : undefined,
            });
            toast.success("Quote approved and sent to client");
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve quote");
        }
    };

    const handleReturnToLogistics = async () => {
        const reason = prompt("Reason for returning to Logistics (min 10 characters):");
        if (!reason || reason.trim().length < 10) {
            toast.error("Please provide a reason (min 10 characters)");
            return;
        }

        try {
            await returnToLogistics.mutateAsync({ orderId, reason: reason.trim() });
            toast.success("Order returned to Logistics for revision");
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to return order");
        }
    };

    return (
        <div className="space-y-6">
            {/* Reskin Requests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Rebrand Requests
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ReskinRequestsList orderId={orderId} orderStatus={order.order_status} />
                </CardContent>
            </Card>

            {/* Service Line Items */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Service Line Items
                        </CardTitle>
                        {canManageLineItems(order.order_status) && (
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
                    <OrderLineItemsList orderId={orderId} canManage={canManageLineItems(order.order_status)} />
                </CardContent>
            </Card>

            {/* Pricing Breakdown with Margin Override */}
            <Card>
                <CardHeader>
                    <CardTitle>Final Pricing Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Display current pricing if available */}
                    {order.order_pricing && (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Base Operations</span>
                                <span className="font-mono">
                                    {Number(order?.order_pricing?.base_ops_total).toFixed(2)} AED
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Transport</span>
                                <span className="font-mono">
                                    {Number(order?.order_pricing?.transport.final_rate).toFixed(2)} AED
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Catalog Services</span>
                                <span className="font-mono">
                                    {Number(order?.order_pricing?.line_items?.catalog_total).toFixed(2)} AED
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Custom (Reskin) Services</span>
                                <span className="font-mono">
                                    {Number(order?.order_pricing?.line_items?.custom_total).toFixed(2)} AED
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Margin ({order.order_pricing?.margin?.percent}%)</span>
                                <span className="font-mono">
                                    {Number(order.order_pricing?.margin?.amount).toFixed(2)} AED
                                </span>
                            </div>
                            <div className="border-t border-border my-2"></div>
                            <div className="flex justify-between font-semibold">
                                <span>Total</span>
                                <span className="font-mono">
                                    {Number(total).toFixed(2)} AED
                                </span>
                            </div>
                        </div>
                    )}

                    {order.order_status === "PENDING_APPROVAL" && <div>
                        {/* Margin Override */}
                        <div className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="marginOverride"
                                    checked={marginOverride}
                                    onCheckedChange={(checked) => setMarginOverride(checked as boolean)}
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
                                                setMarginPercent(parseFloat(e.target.value))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label>Reason for Override</Label>
                                        <Textarea
                                            value={marginReason}
                                            onChange={(e) => setMarginReason(e.target.value)}
                                            placeholder="e.g., High-value order, premium service justifies higher margin"
                                            rows={2}
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
                            >
                                {adminApproveQuote.isPending
                                    ? "Approving..."
                                    : "Approve & Send Quote to Client"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleReturnToLogistics}
                                disabled={returnToLogistics.isPending}
                            >
                                Return to Logistics
                            </Button>
                        </div>
                    </div>}
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

/**
 * PRICING_REVIEW Section (Logistics Review)
 */
export function PricingReviewSection({ order, orderId, onRefresh }: HybridPricingSectionProps) {
    return (
        <div className="space-y-6">
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader>
                    <CardTitle className="text-yellow-900 dark:text-yellow-100">
                        📋 Pricing Review
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Review the order details, add service line items if needed, and submit to Admin
                        for approval.
                    </p>
                </CardContent>
            </Card>

            <LogisticsPricingReview orderId={orderId} order={order} onSubmitSuccess={onRefresh} />
        </div>
    );
}

/**
 * AWAITING_FABRICATION Section
 */
export function AwaitingFabricationSection({ order, orderId }: HybridPricingSectionProps) {
    return (
        <div className="space-y-6">
            <Card className="border-blue-500 bg-blue-50">
                <CardHeader>
                    <CardTitle className="text-blue-500">
                        ⏳ Order Awaiting Fabrication
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-blue-500">
                        This order is confirmed but waiting for custom rebranding work to complete.
                        Once all fabrication is done, the order will automatically move to
                        IN_PREPARATION.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Cancel Order Button (shows if order can be cancelled)
 */
export function CancelOrderButton({ order, orderId }: HybridPricingSectionProps) {
    const [cancelOpen, setCancelOpen] = useState(false);

    const CANCELLABLE_STATUSES = [
        "DRAFT",
        "SUBMITTED",
        "PRICING_REVIEW",
        "PENDING_APPROVAL",
        "QUOTED",
        "CONFIRMED",
        "AWAITING_FABRICATION",
        "IN_PREPARATION",
    ];

    const canCancel = CANCELLABLE_STATUSES.includes(order.order_status);

    if (!canCancel) return null;

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
                pendingReskinCount={
                    order.reskin_requests?.filter((r: any) => r.status === "pending").length || 0
                }
            />
        </>
    );
}