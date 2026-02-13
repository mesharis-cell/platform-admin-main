"use client";

/**
 * Full Pricing Display (Admin View)
 * Complete breakdown with all components for admin review
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import type { OrderPricing, OrderLineItem } from "@/types/hybrid-pricing";

interface FullPricingDisplayProps {
    pricing: OrderPricing;
    lineItems?: OrderLineItem[];
}

export function FullPricingDisplay({ pricing, lineItems = [] }: FullPricingDisplayProps) {
    const catalogItems = lineItems.filter(
        (item) => item.lineItemType === "CATALOG" && !item.isVoided
    );
    const customItems = lineItems.filter(
        (item) => item.lineItemType === "CUSTOM" && !item.isVoided
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Base Operations */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">
                            BASE OPERATIONS
                        </h4>
                        <Badge variant="outline">Auto-calculated</Badge>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                        <span>
                            Warehouse Operations ({pricing.base_operations.volume.toFixed(1)} m³ ×{" "}
                            {pricing.base_operations.rate.toFixed(2)})
                        </span>
                        <span className="font-mono font-semibold">
                            {pricing.base_operations.total.toFixed(2)} AED
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-2">
                        Covers: Picking + Handling Out + Handling In
                    </p>
                </div>

                {/* Transport */}
                <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">TRANSPORT</h4>
                    <div className="flex justify-between text-sm p-2 bg-muted/30 rounded">
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
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 ml-2">
                            Vehicle upgraded: {pricing.transport.vehicle_change_reason}
                        </p>
                    )}
                </div>

                {/* Catalog Line Items */}
                {catalogItems.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                            CATALOG SERVICES
                        </h4>
                        <div className="space-y-1">
                            {catalogItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between text-sm p-2 bg-muted/30 rounded"
                                >
                                    <span>
                                        {item.description}
                                        {item.quantity && ` (${item.quantity} ${item.unit})`}
                                    </span>
                                    <span className="font-mono">{item.total.toFixed(2)} AED</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border-t border-border my-3"></div>

                {/* Logistics Subtotal */}
                <div className="flex justify-between text-sm font-semibold p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <span>LOGISTICS SUBTOTAL</span>
                    <span className="font-mono">{pricing.logistics_subtotal.toFixed(2)} AED</span>
                </div>

                {/* Margin (Service Fee) */}
                <div className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                    <span>
                        Platform Margin ({pricing.margin.percent.toFixed(1)}%)
                        {pricing.margin.is_override && (
                            <Badge variant="outline" className="ml-2 text-xs">
                                Override
                            </Badge>
                        )}
                    </span>
                    <span className="font-mono font-semibold">
                        {pricing.margin.amount.toFixed(2)} AED
                    </span>
                </div>
                {pricing.margin.is_override && pricing.margin.override_reason && (
                    <p className="text-xs text-muted-foreground ml-2">
                        Override reason: {pricing.margin.override_reason}
                    </p>
                )}

                <div className="border-t border-border my-3"></div>

                {/* Custom Line Items */}
                {customItems.length > 0 && (
                    <>
                        <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                CUSTOM CHARGES
                            </h4>
                            <div className="space-y-1">
                                {customItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between text-sm p-2 bg-amber-50/30 dark:bg-amber-950/10 rounded"
                                    >
                                        <span>{item.description}</span>
                                        <span className="font-mono">
                                            {item.total.toFixed(2)} AED
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ml-2">
                                Base cost inputs (margin is included in quote totals)
                            </p>
                        </div>
                        <div className="border-t border-border my-3"></div>
                    </>
                )}

                {/* Final Total */}
                <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-lg font-bold">CLIENT TOTAL</span>
                    <span className="text-2xl font-bold font-mono text-primary">
                        {pricing.final_total.toFixed(2)} AED
                    </span>
                </div>

                {/* Calculated metadata */}
                <p className="text-xs text-muted-foreground text-center">
                    Calculated: {new Date(pricing.calculated_at).toLocaleString()}
                </p>
            </CardContent>
        </Card>
    );
}
