"use client";

import { StatusHistoryTimeline } from "@/components/orders/StatusHistoryTimeline";
import { PricingLedger } from "@/components/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { usePlatform } from "@/contexts/platform-context";
import {
    useCancelServiceRequest,
    useDownloadServiceRequestCostEstimate,
    useServiceRequestDetails,
    useUpdateServiceRequestCommercialStatus,
    useUpdateServiceRequestStatus,
} from "@/hooks/use-service-requests";
import type { ServiceRequestCommercialStatus, ServiceRequestStatus } from "@/types/service-request";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { WorkflowRequestsCard } from "@/components/shared/workflow-requests-card";

const STATUS_OPTIONS: ServiceRequestStatus[] = [
    "SUBMITTED",
    "IN_REVIEW",
    "APPROVED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
];

const COMMERCIAL_STATUS_OPTIONS: ServiceRequestCommercialStatus[] = [
    "INTERNAL",
    "PENDING_QUOTE",
    "QUOTED",
    "QUOTE_APPROVED",
    "INVOICED",
    "PAID",
    "CANCELLED",
];
const INTERNAL_ONLY_COMMERCIAL_STATUS_OPTIONS: ServiceRequestCommercialStatus[] = [
    "INTERNAL",
    "INVOICED",
    "PAID",
    "CANCELLED",
];

export default function ServiceRequestDetailsPage() {
    const params = useParams<{ id: string }>();
    const routeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const { platform } = usePlatform();
    const { data, isLoading, refetch } = useServiceRequestDetails(routeId || null);
    const updateStatus = useUpdateServiceRequestStatus();
    const updateCommercialStatus = useUpdateServiceRequestCommercialStatus();
    const cancelRequest = useCancelServiceRequest();
    const downloadCostEstimate = useDownloadServiceRequestCostEstimate();
    const [statusValue, setStatusValue] = useState<ServiceRequestStatus>("SUBMITTED");
    const [statusNote, setStatusNote] = useState("");
    const [completionNotes, setCompletionNotes] = useState("");
    const [commercialStatusValue, setCommercialStatusValue] =
        useState<ServiceRequestCommercialStatus>("INTERNAL");
    const [commercialNote, setCommercialNote] = useState("");
    const [cancellationReason, setCancellationReason] = useState("");

    const request = data?.data;

    useEffect(() => {
        if (!request) return;
        setStatusValue(request.request_status);
        const allowedCommercialStatuses =
            request.billing_mode === "INTERNAL_ONLY"
                ? INTERNAL_ONLY_COMMERCIAL_STATUS_OPTIONS
                : COMMERCIAL_STATUS_OPTIONS;
        if (allowedCommercialStatuses.includes(request.commercial_status))
            setCommercialStatusValue(request.commercial_status);
        else setCommercialStatusValue(allowedCommercialStatuses[0]);
    }, [request]);

    const handleStatusUpdate = async () => {
        if (!request) return;
        if (request.is_repair_before_event && statusValue === "COMPLETED") {
            const photos = Array.isArray((request as any).photos) ? (request as any).photos : [];
            if (!completionNotes.trim()) {
                toast.error("Completion notes are required for Repair Before Event tasks");
                return;
            }
            if (photos.length === 0) {
                toast.error("At least one work photo is required before completion");
                return;
            }
        }

        try {
            await updateStatus.mutateAsync({
                id: request.id,
                payload: {
                    to_status: statusValue,
                    note: statusNote.trim() || undefined,
                    completion_notes:
                        statusValue === "COMPLETED"
                            ? completionNotes.trim() || undefined
                            : undefined,
                },
            });
            setStatusNote("");
            setCompletionNotes("");
            toast.success("Operational status updated");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Failed to update status");
        }
    };

    const handleCommercialUpdate = async () => {
        if (!request) return;

        try {
            await updateCommercialStatus.mutateAsync({
                id: request.id,
                payload: {
                    commercial_status: commercialStatusValue,
                    note: commercialNote.trim() || undefined,
                },
            });
            setCommercialNote("");
            toast.success("Commercial status updated");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Failed to update commercial status");
        }
    };

    const handleCancel = async () => {
        if (!request) return;
        if (cancellationReason.trim().length < 10)
            return toast.error("Cancellation reason must be at least 10 characters");

        try {
            await cancelRequest.mutateAsync({
                id: request.id,
                payload: { cancellation_reason: cancellationReason.trim() },
            });
            setCancellationReason("");
            toast.success("Service request cancelled");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel request");
        }
    };

    const handleDownloadCostEstimate = async () => {
        if (!request || !platform?.platform_id) return;
        try {
            const blob = await downloadCostEstimate.mutateAsync({
                requestId: request.service_request_id,
                platformId: platform.platform_id,
            });
            if (typeof window === "undefined") return;
            const url = window.URL.createObjectURL(blob);
            const link = window.document.createElement("a");
            link.href = url;
            link.download = `cost-estimate-${request.service_request_id}.pdf`;
            window.document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Cost estimate downloaded");
        } catch (error: any) {
            toast.error(error.message || "Failed to download cost estimate");
        }
    };

    if (isLoading)
        return <div className="p-6 text-muted-foreground">Loading service request...</div>;
    if (!request) return <div className="p-6 text-destructive">Service request not found.</div>;

    const commercialStatusOptions =
        request.billing_mode === "INTERNAL_ONLY"
            ? INTERNAL_ONLY_COMMERCIAL_STATUS_OPTIONS
            : COMMERCIAL_STATUS_OPTIONS;
    const isRepairBeforeEvent = request.is_repair_before_event === true;
    const hasFulfillmentException = !!request.fulfillment_override_applied_at;
    const workPhotoCount = Array.isArray((request as any).photos)
        ? (request as any).photos.length
        : 0;

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Link href="/service-requests">
                                <Button variant="ghost" size="sm" className="font-mono gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    SERVICE REQUESTS
                                </Button>
                            </Link>
                            <Separator orientation="vertical" className="h-6" />
                            <div>
                                <h1 className="text-lg font-bold font-mono">
                                    {request.service_request_id}
                                </h1>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {request.title}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {isRepairBeforeEvent && (
                                <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20">
                                    Repair Before Event
                                </Badge>
                            )}
                            {hasFulfillmentException && (
                                <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                                    Exception Approved
                                </Badge>
                            )}
                            <Badge variant="secondary">
                                {request.request_status.replace(/_/g, " ")}
                            </Badge>
                            <Badge variant="outline">
                                {request.commercial_status.replace(/_/g, " ")}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {isRepairBeforeEvent && (
                            <Card className="border-orange-500/30 bg-orange-500/5">
                                <CardHeader>
                                    <CardTitle className="font-mono text-sm uppercase tracking-wide text-orange-700">
                                        Repair Before Event
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <p className="text-muted-foreground">
                                        This is an internal repair task linked to an order item. It
                                        blocks fulfillment until completed or exception-approved
                                        from the order blocker panel.
                                    </p>
                                    <p>
                                        Due:{" "}
                                        {request.requested_due_at
                                            ? new Date(request.requested_due_at).toLocaleString()
                                            : "Delivery not scheduled"}
                                    </p>
                                    <p>Work photos: {workPhotoCount}</p>
                                    {hasFulfillmentException && (
                                        <div className="rounded border border-blue-500/20 bg-blue-500/5 p-3">
                                            <p className="font-medium text-blue-700">
                                                Exception approved
                                            </p>
                                            <p className="mt-1 text-muted-foreground">
                                                {request.fulfillment_override_reason}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                    Request Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p className="font-medium">
                                        {request.request_type.replace(/_/g, " ")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Billing</p>
                                    <p className="font-medium">
                                        {request.billing_mode.replace(/_/g, " ")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Link Mode</p>
                                    <p className="font-medium">
                                        {request.link_mode.replace(/_/g, " ")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Blocks Fulfillment</p>
                                    <p className="font-medium">
                                        {request.blocks_fulfillment ? "Yes" : "No"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Company ID</p>
                                    <p className="font-mono">{request.company_id}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Created</p>
                                    <p>{new Date(request.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Requested Start</p>
                                    <p>
                                        {request.requested_start_at
                                            ? new Date(request.requested_start_at).toLocaleString()
                                            : "Not set"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Requested Due</p>
                                    <p>
                                        {request.requested_due_at
                                            ? new Date(request.requested_due_at).toLocaleString()
                                            : "Not set"}
                                    </p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-muted-foreground">Description</p>
                                    <p>{request.description || "No description"}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                    Requested Items
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {request.items?.length ? (
                                    request.items.map((item) => (
                                        <div key={item.id} className="rounded-md bg-muted/40 p-3">
                                            <div className="flex items-center justify-between">
                                                {item.asset_id ? (
                                                    <Link
                                                        href={`/assets/${item.asset_id}`}
                                                        className="font-medium hover:underline text-primary"
                                                    >
                                                        {item.asset_name}
                                                    </Link>
                                                ) : (
                                                    <p className="font-medium">{item.asset_name}</p>
                                                )}
                                                <p className="text-sm text-muted-foreground">
                                                    Qty: {item.quantity}
                                                </p>
                                            </div>
                                            {item.refurb_days_estimate !== null && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Refurb days: {item.refurb_days_estimate}
                                                </p>
                                            )}
                                            {item.notes && (
                                                <p className="text-sm mt-1">{item.notes}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground">
                                        No items on this request.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <WorkflowRequestsCard
                            entityType="SERVICE_REQUEST"
                            entityId={request.id}
                            title="Workflows"
                        />

                        <EntityAttachmentsCard
                            entityType="SERVICE_REQUEST"
                            entityId={request.id}
                            title="Supporting Documents"
                        />

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                    Operational Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Operational Status</Label>
                                        <Select
                                            value={statusValue}
                                            onValueChange={(value) =>
                                                setStatusValue(value as ServiceRequestStatus)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status.replace(/_/g, " ")}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Note</Label>
                                        <Input
                                            value={statusNote}
                                            onChange={(e) => setStatusNote(e.target.value)}
                                            placeholder="Optional status note"
                                        />
                                    </div>
                                </div>

                                {statusValue === "COMPLETED" && (
                                    <div>
                                        <Label>Completion Notes</Label>
                                        <Textarea
                                            value={completionNotes}
                                            onChange={(e) => setCompletionNotes(e.target.value)}
                                            placeholder="Add completion details..."
                                        />
                                    </div>
                                )}

                                <Button
                                    onClick={handleStatusUpdate}
                                    disabled={updateStatus.isPending}
                                >
                                    {updateStatus.isPending
                                        ? "Updating..."
                                        : "Update Operational Status"}
                                </Button>

                                {!isRepairBeforeEvent && (
                                    <>
                                        <Separator />

                                        <div className="space-y-2">
                                            <Label>Cancel Request</Label>
                                            <Textarea
                                                value={cancellationReason}
                                                onChange={(e) =>
                                                    setCancellationReason(e.target.value)
                                                }
                                                placeholder="Cancellation reason (minimum 10 characters)"
                                            />
                                            <Button
                                                variant="destructive"
                                                onClick={handleCancel}
                                                disabled={cancelRequest.isPending}
                                            >
                                                {cancelRequest.isPending
                                                    ? "Cancelling..."
                                                    : "Cancel Request"}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                    Commercial Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Commercial Status</Label>
                                        <Select
                                            value={commercialStatusValue}
                                            onValueChange={(value) =>
                                                setCommercialStatusValue(
                                                    value as ServiceRequestCommercialStatus
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {commercialStatusOptions.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status.replace(/_/g, " ")}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Commercial Note</Label>
                                        <Input
                                            value={commercialNote}
                                            onChange={(e) => setCommercialNote(e.target.value)}
                                            placeholder="Optional note"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        onClick={handleCommercialUpdate}
                                        disabled={updateCommercialStatus.isPending}
                                    >
                                        {updateCommercialStatus.isPending
                                            ? "Updating..."
                                            : "Update Commercial Status"}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={handleDownloadCostEstimate}
                                        disabled={downloadCostEstimate.isPending}
                                    >
                                        <Download className="h-4 w-4 mr-1" />
                                        {downloadCostEstimate.isPending
                                            ? "Downloading..."
                                            : "Cost Estimate"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    To waive charges, use the{" "}
                                    <span className="font-medium">No cost</span> action in the
                                    Pricing Ledger below (captures the concession reason).
                                </p>
                            </CardContent>
                        </Card>

                        {/* The single editable money table: line items + role-preview
                            lenses + footer totals + add / bulk-margin / no-cost
                            actions. SR money editability keys off the COMMERCIAL
                            status (dual-status model): the ledger self-gates editable
                            pre-QUOTE_APPROVED and locks at QUOTE_APPROVED / INVOICED /
                            PAID, mirroring the API's getLineItemEditability SR branch.
                            The `◎ No cost` footer action captures the concession reason
                            and posts the SR concession route (P1-8). No approve slot —
                            SR commercial status is driven by the dropdown above. */}
                        <PricingLedger
                            purposeType="SERVICE_REQUEST"
                            entityId={request.id}
                            entityStatus={request.commercial_status}
                            pricingMode={
                                (request as { pricing_mode?: "STANDARD" | "NO_COST" })
                                    .pricing_mode || "STANDARD"
                            }
                        />
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="lg:sticky lg:top-24">
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                    Status History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatusHistoryTimeline
                                    entries={(request.status_history || []).map(
                                        (entry, idx, arr) => ({
                                            id: entry.id,
                                            label: entry.from_status
                                                ? `${entry.from_status.replace(/_/g, " ")} → ${entry.to_status.replace(/_/g, " ")}`
                                                : entry.to_status.replace(/_/g, " "),
                                            timestamp: entry.changed_at,
                                            user:
                                                entry.changed_by_user?.name ||
                                                entry.changed_by ||
                                                null,
                                            note: entry.note || null,
                                            isActive: idx === arr.length - 1,
                                        })
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
