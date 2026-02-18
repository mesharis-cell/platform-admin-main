"use client";

/**
 * Phase 8: A2 Pricing Review Interface
 * A2 Staff reviews orders in PRICING_REVIEW status and approves standard pricing or adjusts pricing
 */

import Link from "next/link";
import { ChevronLeft, Calendar, MapPin, Package, DollarSign } from "lucide-react";
import { useAdminOrders } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeader } from "@/components/admin-header";

export default function PricingReviewPage() {
    const { data, isLoading, error } = useAdminOrders({ order_status: "PRICING_REVIEW" });

    if (error) {
        return (
            <div className="min-h-screen bg-background">
                <div className="border-b border-border bg-card">
                    <div className="container mx-auto px-4 py-4">
                        <Link
                            href="/admin/orders"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Orders
                        </Link>
                        <h1 className="text-2xl font-bold">Pricing Review</h1>
                    </div>
                </div>
                <div className="container mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-destructive">
                                Error loading orders: {(error as Error).message}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={DollarSign}
                title="PRICING REVIEW QUEUE"
                description="A2 Review · Standard Pricing · Adjustments"
                stats={data ? { label: "PENDING REVIEW", value: data?.data?.length } : undefined}
                actions={
                    <Link href="/orders">
                        <Button variant="outline" className="gap-2 font-mono">
                            <ChevronLeft className="h-4 w-4" />
                            BACK TO ORDERS
                        </Button>
                    </Link>
                }
            />

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i}>
                                <CardContent className="p-6">
                                    <Skeleton className="h-6 w-1/3 mb-2" />
                                    <Skeleton className="h-4 w-2/3" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : !data || data?.data?.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Orders for Review</h3>
                            <p className="text-sm text-muted-foreground">
                                There are currently no orders waiting for pricing review.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {data?.data?.map((order: any) => (
                            <Card
                                key={order.id}
                                className="hover:border-primary/50 transition-colors"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg font-mono">
                                                {order?.order_id}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {order?.company?.name}
                                            </p>
                                        </div>
                                        <Badge>{order?.order_status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Order Details */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>Event Date</span>
                                            </div>
                                            <p className="font-medium">
                                                {new Date(
                                                    order.event_start_date
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                <MapPin className="h-4 w-4" />
                                                <span>Venue</span>
                                            </div>
                                            <p className="font-medium">
                                                {order?.venue_city},{order?.venue_name}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                <Package className="h-4 w-4" />
                                                <span>Volume</span>
                                            </div>
                                            <p className="font-medium">
                                                {order?.calculated_totals.volume} m³
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                <DollarSign className="h-4 w-4" />
                                                <span>Base Price</span>
                                            </div>
                                            <p className="font-medium font-mono">
                                                {Number(order.order_pricing?.base_ops_total).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-2">
                                        <Button variant="default" asChild>
                                            <Link href={`/orders/${order.order_id}`}>
                                                View Full Details
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
