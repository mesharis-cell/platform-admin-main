"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
    useAdminSelfPickupDetails,
    useAdminSelfPickupStatusHistory,
    useSubmitForApproval,
    useMarkReadyForPickup,
    useUpdateSelfPickupJobNumber,
} from "@/hooks/use-self-pickups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Phone, Mail, Clock, Package, Edit, Save, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { WorkflowRequestsCard } from "@/components/shared/workflow-requests-card";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { SelfPickupPendingApprovalSection } from "./hybrid-sections";
import { CancelSelfPickupModal } from "@/components/self-pickups/CancelSelfPickupModal";
import { MarkAsNoCostButton } from "@/components/self-pickups/MarkAsNoCostButton";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";

const MARK_NO_COST_STATUSES = ["PRICING_REVIEW", "PENDING_APPROVAL"];

const CANCELLABLE_STATUSES = [
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "READY_FOR_PICKUP",
];

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
    AWAITING_RETURN: {
        label: "Awaiting Return",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700 border-gray-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function SelfPickupDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user } = useToken();
    const { data: pickupData, isLoading, refetch } = useAdminSelfPickupDetails(id);
    const { data: historyData } = useAdminSelfPickupStatusHistory(id);
    const submitForApproval = useSubmitForApproval();
    const markReady = useMarkReadyForPickup();
    const updateJobNumber = useUpdateSelfPickupJobNumber();

    const [cancelOpen, setCancelOpen] = useState(false);
    const [isEditingJobNumber, setIsEditingJobNumber] = useState(false);
    const [jobNumber, setJobNumber] = useState("");

    const pickup = pickupData?.data;
    const history = historyData?.data || [];

    // Initialize job number state on first load
    if (pickup && !jobNumber && pickup.job_number) {
        setJobNumber(pickup.job_number);
    }

    const canCancel = hasPermission(user, ADMIN_ACTION_PERMISSIONS.selfPickupsCancel);
    // Reuse orders' add_job_number permission (pricing/approval context).
    const canEditJobNumber = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersAddJobNumber);
    const canMarkNoCost = hasPermission(user, ADMIN_ACTION_PERMISSIONS.selfPickupsMarkNoCost);

    const handleJobNumberSave = async () => {
        if (!pickup) return;
        try {
            await updateJobNumber.mutateAsync({
                id: pickup.id,
                job_number: jobNumber || null,
            });
            setIsEditingJobNumber(false);
            toast.success("Job number updated");
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to update job number");
        }
    };

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
        <div className="min-h-screen bg-background">
            {/* Sticky Header — mirrors admin orders detail container pattern */}
            <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <Link href="/self-pickups">
                                <Button variant="ghost" size="icon" className="shrink-0">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold truncate">
                                    {pickup.self_pickup_id}
                                </h1>
                                <p className="text-sm text-muted-foreground truncate">
                                    {company?.name || ""}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 ml-auto md:ml-2">
                                <Badge variant="outline" className={statusConfig.color}>
                                    {statusConfig.label}
                                </Badge>
                                {pickup.pricing_mode === "NO_COST" && (
                                    <Badge
                                        variant="secondary"
                                        className="bg-neutral-500/10 text-neutral-700 border-neutral-400/60 font-mono text-xs"
                                    >
                                        NO COST
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {pickup.self_pickup_status === "PRICING_REVIEW" && (
                                <Button
                                    onClick={() => {
                                        submitForApproval.mutate(id, {
                                            onSuccess: () =>
                                                toast.success("Submitted for approval"),
                                            onError: (e: unknown) =>
                                                toast.error((e as Error).message),
                                        });
                                    }}
                                    disabled={submitForApproval.isPending}
                                >
                                    Submit for Approval
                                </Button>
                            )}
                            {canMarkNoCost &&
                                pickup.pricing_mode === "STANDARD" &&
                                MARK_NO_COST_STATUSES.includes(pickup.self_pickup_status) && (
                                    <MarkAsNoCostButton
                                        entityType="SELF_PICKUP"
                                        entityId={pickup.id}
                                        entityIdReadable={pickup.self_pickup_id}
                                        onSuccess={() => refetch()}
                                    />
                                )}
                            {pickup.self_pickup_status === "CONFIRMED" && (
                                <Button
                                    onClick={() => {
                                        markReady.mutate(id, {
                                            onSuccess: () =>
                                                toast.success("Marked as ready for pickup"),
                                            onError: (e: unknown) =>
                                                toast.error((e as Error).message),
                                        });
                                    }}
                                    disabled={markReady.isPending}
                                >
                                    Ready for Pickup
                                </Button>
                            )}
                            {canCancel &&
                                CANCELLABLE_STATUSES.includes(pickup.self_pickup_status) && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => setCancelOpen(true)}
                                    >
                                        Cancel Pickup
                                    </Button>
                                )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8 space-y-6">
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
                                            Pickup: {new Date(pickupWindow.start).toLocaleString()}{" "}
                                            - {new Date(pickupWindow.end).toLocaleString()}
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
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {pickup.notes}
                                    </p>
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
                                                    Qty: {item.quantity} | Vol: {item.total_volume}{" "}
                                                    m3 | Wt: {item.total_weight} kg
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

                        {/* Pricing / line-items area.
                            NO_COST pickups: hide the entire pricing + line-items
                            surface and render a single neutral info card. Line
                            items are voided server-side + backend rejects any
                            new inserts (getLineItemEditability choke point).
                            STANDARD pickups: behave as before — pricing-approve
                            card on PENDING_APPROVAL, bare line items otherwise. */}
                        {pickup.pricing_mode === "NO_COST" ? (
                            <Card className="border-neutral-400/40 bg-neutral-50/50">
                                <CardHeader>
                                    <CardTitle className="text-base text-neutral-700">
                                        Approved at No Cost
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    This pickup is approved at no cost. Line items and pricing are
                                    disabled.
                                </CardContent>
                            </Card>
                        ) : pickup.self_pickup_status === "PENDING_APPROVAL" ? (
                            <SelfPickupPendingApprovalSection
                                pickup={pickup}
                                selfPickupId={pickup.id}
                                onRefresh={() => refetch()}
                            />
                        ) : (
                            <OrderLineItemsList
                                targetId={pickup.id}
                                purposeType="SELF_PICKUP"
                                canManage={pickup.self_pickup_status === "PRICING_REVIEW"}
                            />
                        )}
                    </div>

                    {/* Sidebar: Job Number + PO Number + Status History */}
                    <div className="space-y-6">
                        {/* Job Number Card (mirrors orders detail) */}
                        <Card className="border-2 border-primary/20 bg-primary/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            PLATFORM JOB NUMBER
                                        </Label>
                                        {isEditingJobNumber && canEditJobNumber ? (
                                            <Input
                                                value={jobNumber}
                                                onChange={(e) => setJobNumber(e.target.value)}
                                                placeholder="JOB-XXXX"
                                                className="mt-2 font-mono"
                                            />
                                        ) : (
                                            <p className="mt-2 font-mono text-lg font-bold">
                                                {jobNumber || "—"}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center gap-2">
                                        {isEditingJobNumber && canEditJobNumber ? (
                                            <>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setIsEditingJobNumber(false)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    disabled={updateJobNumber.isPending}
                                                    onClick={handleJobNumberSave}
                                                >
                                                    {updateJobNumber.isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </>
                                        ) : canEditJobNumber ? (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setIsEditingJobNumber(true)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {pickup.po_number && (
                            <Card className="border border-border/60 bg-card/60">
                                <CardContent className="pt-6">
                                    <Label className="font-mono text-xs text-muted-foreground">
                                        PO NUMBER
                                    </Label>
                                    <p className="mt-2 font-mono text-lg font-bold">
                                        {pickup.po_number}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {pickup.decline_reason && (
                            <Card className="border border-destructive/30 bg-destructive/5">
                                <CardContent className="pt-6">
                                    <Label className="font-mono text-xs text-destructive">
                                        DECLINE REASON
                                    </Label>
                                    <p className="mt-2 text-sm">{pickup.decline_reason}</p>
                                </CardContent>
                            </Card>
                        )}

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

            {/* Cancel modal */}
            <CancelSelfPickupModal
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                selfPickupId={pickup.id}
                selfPickupIdReadable={pickup.self_pickup_id}
                companyName={company?.name || ""}
                currentStatus={pickup.self_pickup_status}
                itemCount={items.length}
            />
        </div>
    );
}
