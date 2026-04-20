"use client";

import { use } from "react";
import Link from "next/link";
import {
    useAdminSelfPickupDetails,
    useAdminSelfPickupStatusHistory,
    useSubmitForApproval,
    useAdminApproveQuote,
    useMarkReadyForPickup,
    useCancelSelfPickup,
    useUpdateSelfPickupJobNumber,
} from "@/hooks/use-self-pickups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Phone, Mail, Clock, Package, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin-header";
import { WorkflowRequestsCard } from "@/components/shared/workflow-requests-card";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";

const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    PRICING_REVIEW: {
        label: "Pricing Review",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    PENDING_APPROVAL: {
        label: "Pending Approval",
        color: "bg-orange-100 text-orange-700 border-orange-300",
    },
    QUOTED: { label: "Quoted", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 border-red-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    READY_FOR_PICKUP: {
        label: "Ready for Pickup",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    PICKED_UP: { label: "Picked Up", color: "bg-teal-100 text-teal-700 border-teal-300" },
    IN_USE: { label: "In Use", color: "bg-purple-100 text-purple-700 border-purple-300" },
    AWAITING_RETURN: {
        label: "Awaiting Return",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    RETURNED: { label: "Returned", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700 border-gray-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function SelfPickupDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: pickupData, isLoading } = useAdminSelfPickupDetails(id);
    const { data: historyData } = useAdminSelfPickupStatusHistory(id);
    const submitForApproval = useSubmitForApproval();
    const approveQuote = useAdminApproveQuote();
    const markReady = useMarkReadyForPickup();
    const cancelPickup = useCancelSelfPickup();

    const pickup = pickupData?.data;
    const history = historyData?.data || [];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!pickup) {
        return <div className="text-center py-12 text-muted-foreground">Self-pickup not found</div>;
    }

    const statusConfig = PICKUP_STATUS_CONFIG[pickup.self_pickup_status] || {
        label: pickup.self_pickup_status,
        color: "bg-gray-100 text-gray-700",
    };
    const pickupWindow = pickup.pickup_window as any;
    const items = pickup.items || [];
    const company = pickup.company as any;

    return (
        <div className="space-y-6">
            {/* Sticky Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/self-pickups">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{pickup.self_pickup_id}</h1>
                        <p className="text-sm text-muted-foreground">{company?.name || ""}</p>
                    </div>
                    <Badge variant="outline" className={statusConfig.color}>
                        {statusConfig.label}
                    </Badge>
                </div>

                <div className="flex gap-2">
                    {pickup.self_pickup_status === "PRICING_REVIEW" && (
                        <Button
                            onClick={() => {
                                submitForApproval.mutate(id, {
                                    onSuccess: () => toast.success("Submitted for approval"),
                                    onError: (e: unknown) => toast.error((e as Error).message),
                                });
                            }}
                            disabled={submitForApproval.isPending}
                        >
                            Submit for Approval
                        </Button>
                    )}
                    {pickup.self_pickup_status === "PENDING_APPROVAL" && (
                        <Button
                            onClick={() => {
                                approveQuote.mutate(id, {
                                    onSuccess: () => toast.success("Quote approved"),
                                    onError: (e: unknown) => toast.error((e as Error).message),
                                });
                            }}
                            disabled={approveQuote.isPending}
                        >
                            Approve Quote
                        </Button>
                    )}
                    {pickup.self_pickup_status === "CONFIRMED" && (
                        <Button
                            onClick={() => {
                                markReady.mutate(id, {
                                    onSuccess: () => toast.success("Marked as ready for pickup"),
                                    onError: (e: unknown) => toast.error((e as Error).message),
                                });
                            }}
                            disabled={markReady.isPending}
                        >
                            Ready for Pickup
                        </Button>
                    )}
                </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Collector Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Collector Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{pickup.collector_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{pickup.collector_phone}</span>
                            </div>
                            {pickup.collector_email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{pickup.collector_email}</span>
                                </div>
                            )}
                            {pickupWindow && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        Pickup: {new Date(pickupWindow.start).toLocaleString()} -{" "}
                                        {new Date(pickupWindow.end).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {pickup.expected_return_at && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        Expected return:{" "}
                                        {new Date(pickup.expected_return_at).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {pickup.notes && (
                                <p className="text-sm text-muted-foreground mt-2">{pickup.notes}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Workflows */}
                    <WorkflowRequestsCard entityType="SELF_PICKUP" entityId={pickup.id} />

                    {/* Attachments */}
                    <EntityAttachmentsCard entityType="SELF_PICKUP" entityId={pickup.id} />

                    {/* Pickup Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Pickup Items ({items.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {items.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{item.asset_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Qty: {item.quantity} | Vol: {item.total_volume} m3 |
                                                Wt: {item.total_weight} kg
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            <Package className="h-3 w-3 mr-1" />
                                            {item.quantity}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Line Items (reuse orders component) */}
                    <OrderLineItemsList
                        targetId={pickup.id}
                        purposeType="SELF_PICKUP"
                        canManage={["PRICING_REVIEW", "PENDING_APPROVAL"].includes(
                            pickup.self_pickup_status
                        )}
                    />
                </div>

                {/* Sidebar: Status History */}
                <div className="space-y-6">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-base">Status History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {history.map((entry: any) => {
                                    const entryConfig = PICKUP_STATUS_CONFIG[entry.status] || {
                                        label: entry.status,
                                        color: "bg-gray-100 text-gray-700",
                                    };
                                    return (
                                        <div key={entry.id} className="flex gap-3 items-start">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                                            <div className="flex-1">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs ${entryConfig.color}`}
                                                >
                                                    {entryConfig.label}
                                                </Badge>
                                                {entry.notes && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {entry.notes}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {entry.updated_by_name} -{" "}
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {history.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No status history yet
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
