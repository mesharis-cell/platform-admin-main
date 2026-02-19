"use client";

/**
 * Hybrid Pricing Sections for Order Detail
 * Sections to be integrated into main order detail page
 */

import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { CancelOrderModal } from "@/components/orders/CancelOrderModal";
import { LogisticsPricingReview } from "@/components/orders/LogisticsPricingReview";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { ReturnToLogisticsModal } from "@/components/orders/ReturnToLogisticsModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminApproveQuote } from "@/hooks/use-orders";
import { canManageLineItems } from "@/lib/order-helpers";
import { getOrderPrice } from "@/lib/utils/helper";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { DollarSign, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface HybridPricingSectionProps {
    order: any;
    orderId: string;
    onRefresh?: () => void;
}

/**
 * PENDING_APPROVAL Section (Admin Review)
 */
export function PendingApprovalSection({ order, orderId, onRefresh }: HybridPricingSectionProps) {
    const { user } = useToken();
    const adminApproveQuote = useAdminApproveQuote();

    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const [marginOverride, setMarginOverride] = useState(false);
    const currentMarginPercent = Number(
        order?.order_pricing?.margin?.percent ?? order?.company?.platform_margin_percent ?? 0
    );
    const [marginPercent, setMarginPercent] = useState(currentMarginPercent);
    const [marginReason, setMarginReason] = useState("");
    const [returnToLogisticsOpen, setReturnToLogisticsOpen] = useState(false);
    const canManagePricing = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersPricingAdjust);
    const canApproveQuote = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersPricingAdminApprove);
    const canManageServiceItems = canManageLineItems(order.order_status) && canManagePricing;

    const effectiveMarginPercent = marginOverride
        ? Number(marginPercent || 0)
        : currentMarginPercent;
    const { total, marginAmount } = getOrderPrice(order?.order_pricing, effectiveMarginPercent);

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
                    <OrderLineItemsList targetId={orderId} canManage={canManageServiceItems} />
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
                                <span className="text-muted-foreground">Catalog Services</span>
                                <span className="font-mono">
                                    {Number(
                                        order?.order_pricing?.line_items?.catalog_total
                                    ).toFixed(2)}{" "}
                                    AED
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Custom (Include Reskin) Services
                                </span>
                                <span className="font-mono">
                                    {Number(order?.order_pricing?.line_items?.custom_total).toFixed(
                                        2
                                    )}{" "}
                                    AED
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Margin ({effectiveMarginPercent}%)
                                </span>
                                <span className="font-mono">
                                    {Number(marginAmount).toFixed(2)} AED
                                </span>
                            </div>
                            <div className="border-t border-border my-2"></div>
                            <div className="flex justify-between font-semibold">
                                <span>Total</span>
                                <span className="font-mono">{Number(total).toFixed(2)} AED</span>
                            </div>
                        </div>
                    )}

                    {order.order_status === "PENDING_APPROVAL" && canApproveQuote && (
                        <div>
                            {/* Margin Override */}
                            <div className="space-y-3 border-t border-border pt-4">
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
                                    onClick={() => setReturnToLogisticsOpen(true)}
                                >
                                    Return to Logistics
                                </Button>
                            </div>
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

            {/* Return to Logistics Modal */}
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
 * PRICING_REVIEW Section (Logistics Review)
 */
export function PricingReviewSection({ order, orderId, onRefresh }: HybridPricingSectionProps) {
    return (
        <div className="space-y-6">
            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="">📋 Pricing Review</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        Review the order details, add service line items if needed, and submit to
                        Admin for approval.
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
                    <CardTitle className="text-blue-500">⏳ Order Awaiting Fabrication</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-blue-500">
                        Complete pending reskin/fabrication requests. When all requests are
                        resolved, the order auto-progresses to IN_PREPARATION.
                    </p>
                    <p className="text-xs text-blue-500 mt-2">
                        Process/complete actions are available to Admin and Logistics. Cancellation
                        remains Admin-only.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Linked Service Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {Array.isArray(order?.linked_service_requests) &&
                    order.linked_service_requests.length > 0 ? (
                        order.linked_service_requests.map((sr: any) => (
                            <div
                                key={sr.id}
                                className="text-xs font-mono border rounded p-2 bg-muted/20"
                            >
                                {sr.service_request_id} | {sr.request_status} |{" "}
                                {sr.commercial_status}
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            No linked service requests yet.
                        </p>
                    )}
                </CardContent>
            </Card>
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
        "AWAITING_FABRICATION",
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
