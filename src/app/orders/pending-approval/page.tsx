"use client";

/**
 * Pending Approval Queue Page
 * Admin reviews orders submitted by Logistics
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Clock, Package } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { usePendingApprovalOrders } from "@/hooks/use-orders";

export default function PendingApprovalPage() {
    const { data, isLoading, error } = usePendingApprovalOrders();

    if (error) {
        return (
            <div className="min-h-screen bg-background">
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
                icon={Clock}
                title="PENDING APPROVAL QUEUE"
                description="Admin Review · Approve Quotes"
                stats={
                    data?.data ? { label: "AWAITING APPROVAL", value: data.data.length } : undefined
                }
                actions={
                    <Link href="/orders">
                        <Button variant="outline" className="gap-2 font-mono">
                            <ChevronLeft className="h-4 w-4" />
                            BACK TO ORDERS
                        </Button>
                    </Link>
                }
            />

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
                ) : !data?.data || data.data.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                No Orders Pending Approval
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                There are currently no orders waiting for Admin approval.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {data.data.map((order: any) => {
                            return (
                                <Card
                                    key={order.id}
                                    className="hover:border-primary/50 transition-colors"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg font-mono">
                                                    {order.order_id}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {order.company?.name}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge>{order.order_status}</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Order Info */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Event Date</p>
                                                <p className="font-medium">
                                                    {new Date(
                                                        order.event_start_date
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Venue</p>
                                                <p className="font-medium">
                                                    {order.venue_location?.address},
                                                    {order.venue_name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Items</p>
                                                <p className="font-medium">
                                                    {order.items?.length || 0} items
                                                </p>
                                            </div>
                                        </div>

                                        {/* Pricing Info */}
                                        {order.pricing && (
                                            <div className="text-sm">
                                                <p className="text-muted-foreground">
                                                    Estimated Total
                                                </p>
                                                <p className="text-xl font-bold font-mono">
                                                    {Number(order.pricing.final_total || 0).toFixed(
                                                        2
                                                    )}{" "}
                                                    AED
                                                </p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-2">
                                            <Button asChild className="flex-1">
                                                <Link href={`/orders/${order.order_id}`}>
                                                    Review & Approve
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
