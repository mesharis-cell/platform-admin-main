"use client";

/**
 * Admin Scanning Dashboard
 * Phase 11: QR Code Tracking System
 *
 * Quick access to orders ready for scanning workflows
 */

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAdminOrders } from "@/hooks/use-orders";
import { APIOrdersResponse } from "@/types/order";
import { ScanLine, PackageCheck, PackageOpen, Search, ChevronRight, Truck } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";

export default function AdminScanningDashboard() {
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch orders in IN_PREPARATION (ready for outbound scan)
    const { data: preparationOrdersData, isLoading: loadingPreparation } = useAdminOrders({
        order_status: "IN_PREPARATION",
        page: 1,
        limit: 20,
    });

    const preparationOrders = preparationOrdersData as APIOrdersResponse | undefined;

    // Fetch orders in AWAITING_RETURN (ready for inbound scan)
    const { data: returnOrdersData, isLoading: loadingReturn } = useAdminOrders({
        order_status: "AWAITING_RETURN",
        page: 1,
        limit: 20,
    });

    const returnOrders = returnOrdersData as APIOrdersResponse | undefined;

    const filteredPreparationOrders =
        preparationOrders?.data?.filter(
            (order) =>
                order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];

    const filteredReturnOrders =
        returnOrders?.data?.filter(
            (order) =>
                order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={ScanLine}
                title="SCANNING DASHBOARD"
                description="Outbound · Inbound · Tracking"
                actions={
                    <Badge variant="outline" className="text-primary border-primary font-mono">
                        <ScanLine className="w-4 h-4 mr-1" />
                        LIVE TRACKING
                    </Badge>
                }
            />

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search by order ID or contact name..."
                        className="pl-10 font-mono"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="font-mono text-sm flex items-center gap-2">
                                <PackageCheck className="h-5 w-5 text-primary" />
                                OUTBOUND SCANNING
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-baseline gap-2">
                                    <div className="text-4xl font-bold font-mono text-primary">
                                        {filteredPreparationOrders.length}
                                    </div>
                                    <div className="text-sm text-muted-foreground font-mono">
                                        orders ready for pickup scan
                                    </div>
                                </div>

                                {loadingPreparation ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-20 bg-muted/50 rounded animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : filteredPreparationOrders.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-muted-foreground font-mono">
                                        No orders ready for outbound scanning
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {filteredPreparationOrders.map((order) => (
                                            <Link
                                                key={order.id}
                                                href={`/scanning/outbound/${order.id}`}
                                                className="block"
                                            >
                                                <div className="p-4 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="font-mono text-sm font-bold">
                                                                {order.order_id}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {order.contact_name} •{" "}
                                                                {order.item_count} items
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="font-mono"
                                                        >
                                                            START SCAN
                                                            <ChevronRight className="w-4 h-4 ml-1" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="font-mono text-sm flex items-center gap-2">
                                <PackageOpen className="h-5 w-5 text-secondary" />
                                INBOUND SCANNING
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-baseline gap-2">
                                    <div className="text-4xl font-bold font-mono text-secondary">
                                        {filteredReturnOrders.length}
                                    </div>
                                    <div className="text-sm text-muted-foreground font-mono">
                                        orders ready for return inspection
                                    </div>
                                </div>

                                {loadingReturn ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-20 bg-muted/50 rounded animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : filteredReturnOrders.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-muted-foreground font-mono">
                                        No orders ready for inbound scanning
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {filteredReturnOrders.map((order) => (
                                            <Link
                                                key={order.id}
                                                href={`/scanning/inbound/${order.id}`}
                                                className="block"
                                            >
                                                <div className="p-4 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border hover:border-secondary/50 transition-colors cursor-pointer">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="font-mono text-sm font-bold">
                                                                {order.order_id}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {order.contact_name} •{" "}
                                                                {order.item_count} items
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="font-mono"
                                                        >
                                                            START SCAN
                                                            <ChevronRight className="w-4 h-4 ml-1" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Instructions */}
                <Card className="border-2 border-dashed">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-primary font-mono font-bold">
                                    <PackageCheck className="w-5 h-5" />
                                    OUTBOUND WORKFLOW
                                </div>
                                <ul className="text-sm space-y-1 font-mono text-muted-foreground">
                                    <li>1. Select order in IN_PREPARATION status</li>
                                    <li>2. Scan QR codes for all items leaving warehouse</li>
                                    <li>3. Capture truck loading photos (recommended)</li>
                                    <li>4. Complete scan to mark order READY_FOR_DELIVERY</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-secondary font-mono font-bold">
                                    <PackageOpen className="w-5 h-5" />
                                    INBOUND WORKFLOW
                                </div>
                                <ul className="text-sm space-y-1 font-mono text-muted-foreground">
                                    <li>1. Select order in AWAITING_RETURN status</li>
                                    <li>2. Scan QR codes + inspect condition (GREEN/ORANGE/RED)</li>
                                    <li>3. Add notes and photos for ORANGE/RED items</li>
                                    <li>4. Complete scan to close order</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
