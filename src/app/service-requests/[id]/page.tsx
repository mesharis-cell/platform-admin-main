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
import {
    AlertCircle,
    ArrowLeft,
    Ban,
    CheckCircle2,
    ClipboardList,
    Clock,
    Download,
    History,
    Package,
    PlayCircle,
    Receipt,
    Settings2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { WorkflowRequestsCard } from "@/components/shared/workflow-requests-card";
import { UpliftReviewPanel } from "@/components/service-requests/UpliftReviewPanel";
import { formatNullableDate } from "@/lib/date-display";
import {
    commercialPresentation,
    detailBadgeClass,
    serviceRequestDesk,
    statusPresentation,
    typePresentation,
    DESK_BADGE_CLASS,
    DESK_CARD_CLASS,
    DESK_ICON_CLASS,
    DESK_TITLE_CLASS,
    type DeskTone,
} from "@/lib/service-request-display";

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

/**
 * RL-013 / RL-014 — what admin may write on an UPLIFT's commercial status.
 *
 * `QUOTED` is admin issuing the quote, and `PENDING_QUOTE` is admin re-opening
 * pricing (RL-015's retry cycle after a failed visit, which then re-issues).
 * Everything else is refused by the server and is therefore not offered:
 *   - `QUOTE_APPROVED` belongs to the CLIENT's quote-response route, which opens
 *     the return flow in the same transaction. Writing it here would move
 *     commercial status and leave the coupled transitions behind (409).
 *   - `INVOICED` / `PAID` — the uplift commercial lifecycle ends at
 *     QUOTE_APPROVED in this release; invoicing is out of scope (409).
 *   - `INTERNAL` — an uplift is always CLIENT_BILLABLE.
 *   - `CANCELLED` — an uplift is cancelled through its own coupled route, which
 *     also moves the source order.
 */
const UPLIFT_COMMERCIAL_STATUS_OPTIONS: ServiceRequestCommercialStatus[] = [
    "PENDING_QUOTE",
    "QUOTED",
];

/**
 * RL-036 — `IN_REVIEW → SUBMITTED` exists on the shared transition map now, but
 * on an uplift its ONLY writer is the dedicated return-to-logistics route, which
 * enforces the required rework note, the type guard and the commercial-status
 * precondition this generic control knows nothing about. The generic route 409s
 * it, so it is not offered.
 */
function upliftStatusOptions(current: ServiceRequestStatus): ServiceRequestStatus[] {
    if (current !== "IN_REVIEW") return STATUS_OPTIONS;
    return STATUS_OPTIONS.filter((status) => status !== "SUBMITTED");
}

/** Desk banner glyph, one per tone. Presentation only. */
const DESK_ICON: Record<DeskTone, typeof AlertCircle> = {
    waiting: Clock,
    action: AlertCircle,
    inflight: PlayCircle,
    done: CheckCircle2,
    closed: Ban,
};

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
            request.request_type === "UPLIFT"
                ? UPLIFT_COMMERCIAL_STATUS_OPTIONS
                : request.billing_mode === "INTERNAL_ONLY"
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

    const isUplift = request.request_type === "UPLIFT";
    const commercialStatusOptions = isUplift
        ? UPLIFT_COMMERCIAL_STATUS_OPTIONS
        : request.billing_mode === "INTERNAL_ONLY"
          ? INTERNAL_ONLY_COMMERCIAL_STATUS_OPTIONS
          : COMMERCIAL_STATUS_OPTIONS;
    const statusOptions = isUplift ? upliftStatusOptions(request.request_status) : STATUS_OPTIONS;
    const isRepairBeforeEvent = request.is_repair_before_event === true;
    const hasFulfillmentException = !!request.fulfillment_override_applied_at;
    const workPhotoCount = Array.isArray((request as any).photos)
        ? (request as any).photos.length
        : 0;

    // Presentation only — the resolved desk, and the two axes it resolves from.
    const desk = serviceRequestDesk(request);
    const DeskIcon = DESK_ICON[desk.tone];
    const opsPresentation = statusPresentation(request.request_status);
    const comPresentation = commercialPresentation(request.commercial_status);
    const typeInfo = typePresentation(request.request_type);
    const itemCount = request.items?.length ?? 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky header — identity on the left, state on the right. */}
            <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <Link href="/service-requests">
                                <Button variant="ghost" size="sm" className="font-mono gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">SERVICE REQUESTS</span>
                                    <span className="sm:hidden">BACK</span>
                                </Button>
                            </Link>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="truncate text-lg font-bold font-mono">
                                        {request.service_request_id}
                                    </h1>
                                    <Badge
                                        className={`${detailBadgeClass(typeInfo.tone)} shrink-0 border font-mono text-[10px]`}
                                    >
                                        {typeInfo.label}
                                    </Badge>
                                </div>
                                <p className="truncate text-xs text-muted-foreground font-mono">
                                    {request.title}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            {isRepairBeforeEvent && (
                                <Badge className="border-orange-500/20 bg-orange-500/10 font-mono text-[10px] text-orange-700">
                                    Repair Before Event
                                </Badge>
                            )}
                            {hasFulfillmentException && (
                                <Badge className="border-blue-500/20 bg-blue-500/10 font-mono text-[10px] text-blue-700">
                                    Exception Approved
                                </Badge>
                            )}
                            {/* The resolved desk, alone. The two raw axes it
                                resolves from used to sit here as an `Ops` / `Comm`
                                pair, which put the same state on screen five times
                                over — twice here, once on the desk banner below and
                                once more on the `Currently` row of each action card.
                                The `Currently` rows are the ones that earn their
                                place: they sit against the control that changes the
                                value. Both cards render unconditionally, so no axis
                                becomes unreadable by dropping the pair. */}
                            <Badge
                                className={`${DESK_BADGE_CLASS[desk.tone]} border px-3 py-1 font-mono text-xs`}
                            >
                                {desk.label}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* The one thing to do now. Resolves the dual status into a
                            single "whose desk is this on" line plus the next step. */}
                        <Card className={`p-4 ${DESK_CARD_CLASS[desk.tone]}`}>
                            <div className="flex items-start gap-3">
                                <DeskIcon
                                    className={`h-5 w-5 shrink-0 mt-0.5 ${DESK_ICON_CLASS[desk.tone]}`}
                                />
                                <div className="min-w-0">
                                    <p
                                        className={`font-mono text-sm font-bold ${DESK_TITLE_CLASS[desk.tone]}`}
                                    >
                                        {desk.label}
                                    </p>
                                    {desk.next && (
                                        <p className="font-mono text-xs text-muted-foreground mt-1">
                                            {desk.next}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {isRepairBeforeEvent && (
                            <Card className="p-4 bg-orange-500/5 border-orange-500/30">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-orange-600" />
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div>
                                            <p className="font-mono text-sm font-bold text-orange-700">
                                                Repair Before Event
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground mt-1">
                                                Blocks fulfilment on the linked order until it is
                                                completed — or an exception is approved from the
                                                order.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs">
                                            <span className="text-muted-foreground">
                                                Due{" "}
                                                <span className="text-foreground">
                                                    {formatNullableDate(request.requested_due_at, {
                                                        emptyLabel: "No due date set",
                                                        withTime: true,
                                                    })}
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                Work photos{" "}
                                                <span className="text-foreground">
                                                    {workPhotoCount}
                                                </span>
                                            </span>
                                        </div>
                                        {hasFulfillmentException && (
                                            <div className="rounded border border-blue-500/20 bg-blue-500/5 p-3">
                                                <p className="font-mono text-xs font-bold text-blue-700">
                                                    Exception approved
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {request.fulfillment_override_reason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* RL-012/RL-013 — the uplift desk. Source-order link, the client's
                            requested timing, and the three coupled actions the generic
                            service-request controls cannot express. */}
                        {isUplift && <UpliftReviewPanel request={request} onChanged={refetch} />}

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 text-primary" />
                                    REQUEST DETAILS
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            TYPE
                                        </Label>
                                        <p className="font-mono text-sm mt-1">{typeInfo.label}</p>
                                    </div>
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            BILLING
                                        </Label>
                                        <p className="font-mono text-sm mt-1">
                                            {request.billing_mode === "CLIENT_BILLABLE"
                                                ? "Client billable"
                                                : "Internal only"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            LINK MODE
                                        </Label>
                                        <p className="font-mono text-sm mt-1">
                                            {request.link_mode.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            BLOCKS FULFILMENT
                                        </Label>
                                        <div className="mt-1">
                                            <Badge
                                                className={`font-mono text-xs px-3 py-1 border ${
                                                    request.blocks_fulfillment
                                                        ? "border-orange-500/40 bg-orange-500/5 text-orange-700"
                                                        : "border-border bg-muted/20 text-muted-foreground"
                                                }`}
                                            >
                                                {request.blocks_fulfillment ? "YES" : "NO"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            REQUESTED START
                                        </Label>
                                        <p className="font-mono text-sm mt-1">
                                            {formatNullableDate(request.requested_start_at, {
                                                emptyLabel: "Not set",
                                                withTime: true,
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            REQUESTED DUE
                                        </Label>
                                        <p className="font-mono text-sm mt-1">
                                            {formatNullableDate(request.requested_due_at, {
                                                emptyLabel: "Not set",
                                                withTime: true,
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            CREATED
                                        </Label>
                                        <p className="font-mono text-sm mt-1">
                                            {formatNullableDate(request.created_at, {
                                                emptyLabel: "—",
                                                withTime: true,
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <Label className="font-mono text-xs text-muted-foreground">
                                        DESCRIPTION
                                    </Label>
                                    <p className="text-sm mt-1 leading-relaxed">
                                        {request.description || (
                                            <span className="font-mono text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Package className="h-4 w-4 text-primary" />
                                    SERVICE ITEMS ({itemCount})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {itemCount ? (
                                    request.items?.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded border bg-muted/30 p-3 space-y-1"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                {item.asset_id ? (
                                                    <Link
                                                        href={`/assets/${item.asset_id}`}
                                                        className="font-mono text-sm font-bold text-primary hover:underline"
                                                    >
                                                        {item.asset_name}
                                                    </Link>
                                                ) : (
                                                    <p className="font-mono text-sm font-bold">
                                                        {item.asset_name}
                                                    </p>
                                                )}
                                                <Badge
                                                    variant="outline"
                                                    className="shrink-0 font-mono text-[10px]"
                                                >
                                                    QTY {item.quantity}
                                                </Badge>
                                            </div>
                                            {item.refurb_days_estimate !== null && (
                                                <p className="font-mono text-[11px] text-muted-foreground">
                                                    Refurb {item.refurb_days_estimate} day
                                                    {item.refurb_days_estimate === 1 ? "" : "s"}
                                                </p>
                                            )}
                                            {item.notes && (
                                                <p className="text-xs text-muted-foreground">
                                                    {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded border-2 border-dashed bg-muted/20 p-8 text-center">
                                        <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                                        <p className="font-mono text-xs uppercase text-muted-foreground">
                                            No items on this request
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Operational lifecycle — the work. Kept apart from the
                            commercial control below so the two are not read as one
                            undifferentiated pile of dropdowns. */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Settings2 className="h-4 w-4 text-primary" />
                                    OPERATIONAL STATUS
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                                    Currently
                                    <Badge
                                        className={`${detailBadgeClass(opsPresentation.tone)} border font-mono text-[10px]`}
                                    >
                                        {opsPresentation.label}
                                    </Badge>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            MOVE TO
                                        </Label>
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
                                                {statusOptions.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {statusPresentation(status).label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            NOTE (OPTIONAL)
                                        </Label>
                                        <Input
                                            value={statusNote}
                                            onChange={(e) => setStatusNote(e.target.value)}
                                            placeholder="Why is it moving?"
                                        />
                                    </div>
                                </div>

                                {statusValue === "COMPLETED" && (
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            COMPLETION NOTES
                                            {isRepairBeforeEvent && (
                                                <span className="text-destructive"> *</span>
                                            )}
                                        </Label>
                                        <Textarea
                                            value={completionNotes}
                                            onChange={(e) => setCompletionNotes(e.target.value)}
                                            placeholder="What was done?"
                                        />
                                        {/* Stated before the click, not after it. The rule
                                            itself is unchanged and still enforced on submit. */}
                                        {isRepairBeforeEvent && (
                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                Notes and at least one saved work photo are
                                                required. Saved photos: {workPhotoCount}.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <Button
                                    onClick={handleStatusUpdate}
                                    disabled={updateStatus.isPending}
                                    className="gap-2 font-mono text-xs"
                                >
                                    {updateStatus.isPending ? "UPDATING..." : "UPDATE STATUS"}
                                </Button>

                                {/* RL-015 — the generic cancel route refuses an uplift: cancelling
                                    one may have to move its source order back to PLACED and must
                                    first prove nothing has been scanned back in, neither of which
                                    this route knows about. The coupled control lives on the uplift
                                    panel above. */}
                                {!isRepairBeforeEvent && !isUplift && (
                                    <>
                                        <Separator />

                                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                                            <Label className="font-mono text-xs font-bold text-destructive">
                                                CANCEL REQUEST
                                            </Label>
                                            <Textarea
                                                value={cancellationReason}
                                                onChange={(e) =>
                                                    setCancellationReason(e.target.value)
                                                }
                                                placeholder="Why is this being cancelled?"
                                            />
                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                Reason required, at least 10 characters. Cancelling
                                                is final.
                                            </p>
                                            <Button
                                                variant="destructive"
                                                onClick={handleCancel}
                                                disabled={cancelRequest.isPending}
                                                className="gap-2 font-mono text-xs"
                                            >
                                                {cancelRequest.isPending
                                                    ? "CANCELLING..."
                                                    : "CANCEL REQUEST"}
                                            </Button>
                                        </div>
                                    </>
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

                        {/* The single editable money table: line items + role-preview
                            lenses + footer totals + add / bulk-margin / no-cost
                            actions. SR money editability keys off the COMMERCIAL
                            status (dual-status model): the ledger self-gates editable
                            pre-QUOTE_APPROVED and locks at QUOTE_APPROVED / INVOICED /
                            PAID, mirroring the API's getLineItemEditability SR branch.
                            The `◎ No cost` footer action captures the concession reason
                            and posts the SR concession route (P1-8). No approve slot —
                            SR commercial status is driven by the card below, which is
                            deliberately adjacent so the number and the decision read
                            as one block. */}
                        <PricingLedger
                            purposeType="SERVICE_REQUEST"
                            entityId={request.id}
                            entityStatus={request.commercial_status}
                            billingMode={request.billing_mode}
                            pricingMode={
                                (request as { pricing_mode?: "STANDARD" | "NO_COST" })
                                    .pricing_mode || "STANDARD"
                            }
                        />

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-primary" />
                                    QUOTE &amp; BILLING
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                                    Currently
                                    <Badge
                                        className={`${detailBadgeClass(comPresentation.tone)} border font-mono text-[10px]`}
                                    >
                                        {comPresentation.label}
                                    </Badge>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            MOVE TO
                                        </Label>
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
                                                        {commercialPresentation(status).label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            NOTE (OPTIONAL)
                                        </Label>
                                        <Input
                                            value={commercialNote}
                                            onChange={(e) => setCommercialNote(e.target.value)}
                                            placeholder="Internal note"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Same mutation, same payload — the label just names
                                        what the selected transition actually does. */}
                                    <Button
                                        onClick={handleCommercialUpdate}
                                        disabled={updateCommercialStatus.isPending}
                                        className="gap-2 font-mono text-xs"
                                    >
                                        {updateCommercialStatus.isPending
                                            ? "UPDATING..."
                                            : commercialStatusValue === "QUOTED"
                                              ? "ISSUE QUOTE TO CLIENT"
                                              : "UPDATE COMMERCIAL STATUS"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleDownloadCostEstimate}
                                        disabled={downloadCostEstimate.isPending}
                                        className="gap-2 font-mono text-xs"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        {downloadCostEstimate.isPending
                                            ? "DOWNLOADING..."
                                            : "COST ESTIMATE"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="lg:sticky lg:top-24">
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <History className="h-4 w-4 text-primary" />
                                    STATUS HISTORY
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatusHistoryTimeline
                                    entries={(request.status_history || []).map(
                                        (entry, idx, arr) => ({
                                            id: entry.id,
                                            label: entry.from_status
                                                ? `${statusPresentation(entry.from_status).label} → ${statusPresentation(entry.to_status).label}`
                                                : statusPresentation(entry.to_status).label,
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
