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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminApproveQuote } from "@/hooks/use-self-pickups";
import { getOrderPrice } from "@/lib/utils/helper";

const roundCurrency = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
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

    const effectiveMarginPercent = marginOverride
        ? Number(marginPercent || 0)
        : currentMarginPercent;
    const pricing = pickup?.self_pickup_pricing;
    const breakdownLines = Array.isArray(pricing?.breakdown_lines)
        ? pricing.breakdown_lines.filter(
              (line: any) => !line.is_voided && (line.billing_mode || "BILLABLE") === "BILLABLE"
          )
        : [];
    const linesBuyTotal = breakdownLines.reduce(
        (sum: number, line: any) => sum + Number(line.buy_total ?? line.total ?? 0),
        0
    );
    const linesSellTotal = breakdownLines.reduce(
        (sum: number, line: any) => sum + Number(line.sell_total ?? line.total ?? 0),
        0
    );
    const baseSubtotal = Number(
        pricing?.totals?.buy_total ??
            Number(pricing?.base_ops_total ?? 0) +
                Number(pricing?.line_items?.catalog_total ?? 0) +
                Number(pricing?.line_items?.custom_total ?? 0)
    );
    const total = marginOverride
        ? roundCurrency(baseSubtotal * (1 + effectiveMarginPercent / 100))
        : Number(
              pricing?.totals?.sell_total ??
                  pricing?.sell?.final_total ??
                  pricing?.final_total ??
                  getOrderPrice(pricing).total
          );
    const marginAmount = marginOverride
        ? roundCurrency(total - baseSubtotal)
        : Number(
              pricing?.totals?.margin_amount ??
                  (pricing?.margin?.amount != null
                      ? Number(pricing.margin.amount)
                      : roundCurrency(total - baseSubtotal))
          );
    const vatPercent = Number(pricing?.vat?.percent ?? pricing?.totals?.vat_percent ?? 0);
    const vatAmount = Number(pricing?.vat?.amount ?? pricing?.totals?.vat_amount ?? 0);
    const totalWithVat =
        vatAmount > 0 ? Number(pricing?.totals?.sell_total_with_vat ?? total + vatAmount) : total;

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

            {/* Pricing Breakdown with Margin Override */}
            <Card>
                <CardHeader>
                    <CardTitle>Final Pricing Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Display current pricing if available */}
                    {pickup.self_pickup_pricing && (
                        <div className="space-y-2 text-sm">
                            {breakdownLines.length > 0 && (
                                <div className="rounded border border-border/60 overflow-hidden mt-2">
                                    <div className="grid grid-cols-12 bg-muted/30 px-3 py-2 text-xs font-medium">
                                        <span className="col-span-6">Line</span>
                                        <span className="col-span-3 text-right">Buy</span>
                                        <span className="col-span-3 text-right">Sell</span>
                                    </div>
                                    {breakdownLines.map((line: any) => (
                                        <div
                                            key={line.line_id}
                                            className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border/40"
                                        >
                                            <span className="col-span-6 truncate">
                                                {line.label} ({line.quantity} {line.unit})
                                            </span>
                                            <span className="col-span-3 text-right font-mono">
                                                {Number(line.buy_total ?? line.total ?? 0).toFixed(
                                                    2
                                                )}{" "}
                                                AED
                                            </span>
                                            <span className="col-span-3 text-right font-mono">
                                                {Number(line.sell_total ?? line.total ?? 0).toFixed(
                                                    2
                                                )}{" "}
                                                AED
                                            </span>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border font-semibold bg-muted/20">
                                        <span className="col-span-6">Total of lines</span>
                                        <span className="col-span-3 text-right font-mono">
                                            {Number(linesBuyTotal).toFixed(2)} AED
                                        </span>
                                        <span className="col-span-3 text-right font-mono">
                                            {Number(linesSellTotal).toFixed(2)} AED
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Margin ({effectiveMarginPercent}%)
                                </span>
                                <span className="font-mono">
                                    {Number(marginAmount).toFixed(2)} AED
                                </span>
                            </div>
                            <div className="border-t border-border my-2"></div>
                            {vatPercent > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {vatAmount > 0
                                            ? `VAT (${vatPercent}%)`
                                            : `VAT included (${vatPercent}%)`}
                                    </span>
                                    {vatAmount > 0 && (
                                        <span className="font-mono">
                                            {vatAmount.toFixed(2)} AED
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex justify-between font-semibold">
                                <span>Total</span>
                                <span className="font-mono">
                                    {Number(totalWithVat).toFixed(2)} AED
                                </span>
                            </div>
                        </div>
                    )}

                    {pickup.self_pickup_status === "PENDING_APPROVAL" && canApproveQuote && (
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
                                                placeholder="e.g., High-value pickup, premium service justifies higher margin"
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
