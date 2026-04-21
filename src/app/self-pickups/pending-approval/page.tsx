"use client";

/**
 * Pending Approval Queue Page (self-pickup variant).
 * Direct port of /orders/pending-approval/page.tsx — same layout, same
 * AdminHeader, same Card/grid, same empty-state, same card structure.
 * Admin reviews self-pickups submitted by Logistics for pricing approval.
 * See SP4 in .claude/plans/tender-knitting-avalanche.md.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Clock, Package } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { useAdminSelfPickups } from "@/hooks/use-self-pickups";

export default function SelfPickupPendingApprovalPage() {
    const { data, isLoading, error } = useAdminSelfPickups({
        self_pickup_status: "PENDING_APPROVAL",
        limit: 100,
    });

    const pickups = data?.data?.self_pickups || [];

    if (error) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-destructive">
                                Error loading self-pickups: {(error as Error).message}
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
                description="Self-Pickups · Admin Review · Approve Quotes"
                stats={{ label: "AWAITING APPROVAL", value: pickups.length }}
                actions={
                    <Link href="/self-pickups">
                        <Button variant="outline" className="gap-2 font-mono">
                            <ChevronLeft className="h-4 w-4" />
                            BACK TO SELF-PICKUPS
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
                ) : pickups.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                No Self-Pickups Pending Approval
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                There are currently no self-pickups waiting for Admin approval.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {pickups.map((pickup: any) => {
                            const pickupWindow = pickup.pickup_window as
                                | { start?: string; end?: string }
                                | undefined;
                            const totals = pickup.calculated_totals as
                                | { volume?: string; weight?: string }
                                | undefined;
                            return (
                                <Card
                                    key={pickup.id}
                                    className="hover:border-primary/50 transition-colors"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg font-mono">
                                                    {pickup.self_pickup_id}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {pickup.company_name}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge>{pickup.self_pickup_status}</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Pickup Date</p>
                                                <p className="font-medium">
                                                    {pickupWindow?.start
                                                        ? new Date(
                                                              pickupWindow.start
                                                          ).toLocaleDateString()
                                                        : "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Collector</p>
                                                <p className="font-medium">
                                                    {pickup.collector_name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Volume</p>
                                                <p className="font-medium">
                                                    {totals?.volume || "—"} m³
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button asChild className="flex-1">
                                                <Link href={`/self-pickups/${pickup.id}`}>
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
