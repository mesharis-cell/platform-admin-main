"use client";

/**
 * Hybrid Pricing Sections for Order Detail
 * Sections to be integrated into main order detail page
 */

import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { CancelOrderModal } from "@/components/orders/CancelOrderModal";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { ReturnToLogisticsModal } from "@/components/orders/ReturnToLogisticsModal";
import { PricingBreakdownTabs } from "@/components/pricing/PricingBreakdownTabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminApproveQuote } from "@/hooks/use-orders";
import { canManageLineItems } from "@/lib/order-helpers";

import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { AlertTriangle, DollarSign, Plus } from "lucide-react";
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
export function PendingApprovalSection({
    order,
    orderId,
    onRefresh,
    isRefetching,
}: HybridPricingSectionProps) {
    const { user } = useToken();
    const adminApproveQuote = useAdminApproveQuote();

    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    // When the order is already QUOTED, adding/editing/voiding a line item pulls the sent quote
    // back to PENDING_APPROVAL for admin re-review (financial_status -> QUOTE_REVISED) and notifies
    // the client. Gate the add actions behind an explicit confirm so the revert is never a surprise.
    const isQuoted = order.order_status === "QUOTED";
    const [pendingAdd, setPendingAdd] = useState<"catalog" | "custom" | null>(null);
    const openAdd = (type: "catalog" | "custom") => {
        if (isQuoted) {
            setPendingAdd(type);
            return;
        }
        if (type === "catalog") setAddCatalogOpen(true);
        else setAddCustomOpen(true);
    };
    const confirmPendingAdd = () => {
        if (pendingAdd === "catalog") setAddCatalogOpen(true);
        else if (pendingAdd === "custom") setAddCustomOpen(true);
        setPendingAdd(null);
    };
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
    const pricing = order?.order_pricing;
    const pendingDecisionRequests = (order?.maintenance_decision_change_requests || []).filter(
        (request: any) => request.status === "PENDING"
    );
    // API now ships the three role projections nested under `projections`
    // for ADMIN responses (see PricingService.projectAllRolesForAdmin).
    // Fall back to the flat admin-shaped pricing for older payloads.
    const projections = pricing?.projections || {
        admin: pricing || null,
        logistics: null,
        client: null,
    };

    const handleApprove = async () => {
        if (!canApproveQuote) return;
        if (pendingDecisionRequests.length > 0) {
            toast.error("Resolve pending maintenance decision requests before sending quote");
            return;
        }
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
                                    onClick={() => openAdd("catalog")}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Catalog Service
                                </Button>
                                <Button size="sm" onClick={() => openAdd("custom")}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Custom Charge
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isQuoted && (
                        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                            <span>
                                This quote has already been sent to the client. Adding, editing, or
                                voiding a line item will pull the order back to admin re-approval
                                and mark the quote as being revised — the client&apos;s estimate
                                download is paused until you re-approve and re-issue the quote.
                            </span>
                        </div>
                    )}
                    <OrderLineItemsList
                        targetId={orderId}
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

            {/* PENDING_APPROVAL action card (margin override + approve/return).
                Only renders when the order is awaiting admin action. Sits below
                the breakdown so admin can review across role tabs first, then act. */}
            {order.order_status === "PENDING_APPROVAL" && canApproveQuote && (
                <Card>
                    <CardHeader>
                        <CardTitle>Approve Quote</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pendingDecisionRequests.length > 0 && (
                            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
                                Resolve {pendingDecisionRequests.length} maintenance decision{" "}
                                {pendingDecisionRequests.length === 1 ? "request" : "requests"}{" "}
                                before sending this quote.
                            </div>
                        )}
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
                                            placeholder="e.g., High-value order, premium service justifies higher margin"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleApprove}
                                disabled={
                                    adminApproveQuote.isPending ||
                                    pendingDecisionRequests.length > 0
                                }
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

            {/* Confirm pulling back a sent quote before opening an add-item modal. Only gates the
                QUOTED state; pre-quote statuses open the modal directly (no revert happens). */}
            <AlertDialog
                open={pendingAdd !== null}
                onOpenChange={(open) => !open && setPendingAdd(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pull back the sent quote?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This order is currently <strong>QUOTED</strong>. Adding a line item will
                            return it to <strong>admin approval</strong> for re-review, mark the
                            quote as being revised, and notify the client. Their current cost
                            estimate download is paused until you re-approve and re-issue the quote.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmPendingAdd}>
                            Continue & add item
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
