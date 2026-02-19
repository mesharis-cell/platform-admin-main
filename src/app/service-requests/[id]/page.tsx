"use client";

import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
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
    useApplyServiceRequestConcession,
    useCancelServiceRequest,
    useDownloadServiceRequestCostEstimate,
    useGenerateServiceRequestInvoice,
    useServiceRequestDetails,
    useUpdateServiceRequestCommercialStatus,
    useUpdateServiceRequestStatus,
} from "@/hooks/use-service-requests";
import type { ServiceRequestCommercialStatus, ServiceRequestStatus } from "@/types/service-request";
import { ArrowLeft, Download, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
    const invoicingEnabled = platform?.features?.enable_kadence_invoicing === true;
    const { data, isLoading, refetch } = useServiceRequestDetails(routeId || null);
    const updateStatus = useUpdateServiceRequestStatus();
    const updateCommercialStatus = useUpdateServiceRequestCommercialStatus();
    const cancelRequest = useCancelServiceRequest();
    const applyConcession = useApplyServiceRequestConcession();
    const generateInvoice = useGenerateServiceRequestInvoice();
    const downloadCostEstimate = useDownloadServiceRequestCostEstimate();
    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const [statusValue, setStatusValue] = useState<ServiceRequestStatus>("SUBMITTED");
    const [statusNote, setStatusNote] = useState("");
    const [completionNotes, setCompletionNotes] = useState("");
    const [commercialStatusValue, setCommercialStatusValue] =
        useState<ServiceRequestCommercialStatus>("INTERNAL");
    const [commercialNote, setCommercialNote] = useState("");
    const [concessionReason, setConcessionReason] = useState("");
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

    const handleGenerateInvoice = async () => {
        if (!request) return;

        try {
            await generateInvoice.mutateAsync(request.id);
            toast.success("Invoice generated for service request");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Failed to generate invoice");
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

    const handleApplyConcession = async () => {
        if (!request) return;
        if (!concessionReason.trim() || concessionReason.trim().length < 10) {
            toast.error("Concession reason must be at least 10 characters");
            return;
        }
        try {
            await applyConcession.mutateAsync({
                id: request.id,
                payload: { concession_reason: concessionReason.trim() },
            });
            toast.success("Concession applied");
            setConcessionReason("");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Failed to apply concession");
        }
    };

    if (isLoading)
        return <div className="p-6 text-muted-foreground">Loading service request...</div>;
    if (!request) return <div className="p-6 text-destructive">Service request not found.</div>;

    const commercialStatusOptions =
        request.billing_mode === "INTERNAL_ONLY"
            ? INTERNAL_ONLY_COMMERCIAL_STATUS_OPTIONS
            : COMMERCIAL_STATUS_OPTIONS;

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
                                        <div key={item.id} className="rounded-md border p-3">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium">{item.asset_name}</p>
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

                                <Separator />

                                <div className="space-y-2">
                                    <Label>Cancel Request</Label>
                                    <Textarea
                                        value={cancellationReason}
                                        onChange={(e) => setCancellationReason(e.target.value)}
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
                                    {invoicingEnabled && (
                                        <Button
                                            variant="outline"
                                            onClick={handleGenerateInvoice}
                                            disabled={generateInvoice.isPending}
                                        >
                                            {generateInvoice.isPending
                                                ? "Generating..."
                                                : "Generate Invoice"}
                                        </Button>
                                    )}
                                </div>
                                {request.billing_mode === "CLIENT_BILLABLE" &&
                                    request.blocks_fulfillment && (
                                        <div className="space-y-2 border rounded p-3 bg-amber-500/5">
                                            <Label>Concession Reason (sets client sell to 0)</Label>
                                            <Textarea
                                                value={concessionReason}
                                                onChange={(e) =>
                                                    setConcessionReason(e.target.value)
                                                }
                                                placeholder="Explain why concession is required..."
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={handleApplyConcession}
                                                disabled={applyConcession.isPending}
                                            >
                                                {applyConcession.isPending
                                                    ? "Applying..."
                                                    : "Apply Client Concession"}
                                            </Button>
                                        </div>
                                    )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                        Service Line Items
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setAddCatalogOpen(true)}
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Catalog
                                        </Button>
                                        <Button size="sm" onClick={() => setAddCustomOpen(true)}>
                                            <Plus className="h-3 w-3 mr-1" />
                                            Custom
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <OrderLineItemsList
                                    targetId={request.id}
                                    purposeType="SERVICE_REQUEST"
                                    canManage={
                                        request.request_status !== "COMPLETED" &&
                                        request.request_status !== "CANCELLED"
                                    }
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="lg:sticky lg:top-24">
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                    Status History
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {request.status_history?.length ? (
                                    request.status_history.map((entry) => (
                                        <div key={entry.id} className="rounded-md border p-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <p className="font-medium">
                                                    {(entry.from_status || "NONE").replace(
                                                        /_/g,
                                                        " "
                                                    )}
                                                    {" -> "}
                                                    {entry.to_status.replace(/_/g, " ")}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {new Date(entry.changed_at).toLocaleString()}
                                                </p>
                                            </div>
                                            {entry.note && (
                                                <p className="text-sm mt-1">{entry.note}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                By:{" "}
                                                {entry.changed_by_user?.name || entry.changed_by}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground">No history yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={request.id}
                purposeType="SERVICE_REQUEST"
            />
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                targetId={request.id}
                purposeType="SERVICE_REQUEST"
            />
        </div>
    );
}
