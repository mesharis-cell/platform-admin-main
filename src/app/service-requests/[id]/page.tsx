"use client";

import { StatusHistoryTimeline } from "@/components/orders/StatusHistoryTimeline";
import { PricingLedger } from "@/components/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
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
    Boxes,
    CheckCircle2,
    ClipboardList,
    Clock,
    Download,
    Package,
    PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { WorkflowRequestsCard } from "@/components/shared/workflow-requests-card";
import {
    CollapsibleHistoryColumn,
    type HistoryRailEntry,
} from "@/components/shared/collapsible-history-column";
import { UpliftReviewPanel } from "@/components/service-requests/UpliftReviewPanel";
import { formatNullableDate } from "@/lib/date-display";
import { cn } from "@/lib/utils";
import {
    commercialPresentation,
    detailBadgeClass,
    serviceRequestDesk,
    statusPresentation,
    typePresentation,
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
    // Pure UI state — which dialog is open, and whether the history rail is
    // collapsed. Mirrors the order detail page (`statusDialogOpen`, page.tsx:279;
    // `historyCollapsed`, page.tsx:251, default collapsed and never persisted).
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [commercialDialogOpen, setCommercialDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [historyCollapsed, setHistoryCollapsed] = useState(true);

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
            setStatusDialogOpen(false);
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
            setCommercialDialogOpen(false);
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
            setCancelDialogOpen(false);
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

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!request) {
        return (
            <div className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-mono text-sm">Service request not found</p>
                <Link href="/service-requests">
                    <Button variant="outline" className="mt-4">
                        Back
                    </Button>
                </Link>
            </div>
        );
    }

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

    // Compact-rail projection of the same status history the timeline renders —
    // mirrors the order page's `historyRailEntries` (page.tsx:252-268).
    const historyRailEntries: HistoryRailEntry[] = (request.status_history || []).map(
        (entry, idx, arr) => ({
            id: entry.id,
            label: statusPresentation(entry.to_status).label,
            badgeClassName: detailBadgeClass(statusPresentation(entry.to_status).tone),
            timestamp: entry.changed_at,
            user: entry.changed_by_user?.name || entry.changed_by || "System",
            isActive: idx === arr.length - 1,
        })
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky Header */}
            <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4">
                    {/* The wrap geometry is the warehouse order header's
                        (warehouse orders/[id]/page.tsx:784-803), not the admin order
                        header's. An order header carries one status badge and at most
                        three controls; this one carries a type badge, up to two
                        qualifiers, both lifecycle axes and three controls — a longer
                        run than any order header, and one that overflows the sidebar-
                        inset container well before the viewport runs out. So: the row
                        stacks below md, the identity block gets `min-w-0` so the title
                        can shrink instead of shoving the cluster off-screen, and the
                        cluster wraps. */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                            <Link href="/service-requests">
                                <Button variant="ghost" size="sm" className="gap-2 font-mono">
                                    <ArrowLeft className="h-4 w-4" />
                                    SERVICE REQUESTS
                                </Button>
                            </Link>
                            <Separator orientation="vertical" className="h-6 hidden md:block" />
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold font-mono">
                                    {request.service_request_id}
                                </h1>
                                {/* The sub-line here is the request TITLE — free text of
                                    arbitrary length — where an order header carries a
                                    company name. It truncates. */}
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                    {request.title}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap md:justify-end">
                            {/* The badge run: type, then qualifiers, then the two
                                lifecycle axes — the sequence the order page uses for
                                this same entity on its LINKED SERVICE REQUESTS card
                                (page.tsx:2010-2035). The axes take the header badge
                                geometry the order page gives `order_status`
                                (page.tsx:657-661) — bare, unlabelled, same classes. */}
                            <Badge
                                className={`${detailBadgeClass(typeInfo.tone)} border font-mono text-xs px-3 py-1`}
                            >
                                {typeInfo.label}
                            </Badge>
                            {isRepairBeforeEvent && (
                                <Badge className="border-orange-500/20 bg-orange-500/10 font-mono text-xs text-orange-700">
                                    Repair Before Event
                                </Badge>
                            )}
                            {hasFulfillmentException && (
                                <Badge className="border-blue-500/20 bg-blue-500/10 font-mono text-xs text-blue-700">
                                    Exception Approved
                                </Badge>
                            )}
                            {/* Money axis first, work axis second — the pair order the
                                warehouse order header uses for `financial_status` then
                                `order_status` (warehouse orders/[id]/page.tsx:804-815),
                                which is the platform's only dual-status header. The
                                warehouse service-request header renders the same pair in
                                the same order, so an admin who works in both apps reads
                                one vocabulary. */}
                            <Badge
                                className={`${detailBadgeClass(comPresentation.tone)} border font-mono text-xs px-3 py-1`}
                            >
                                {comPresentation.label}
                            </Badge>
                            <Badge
                                className={`${detailBadgeClass(opsPresentation.tone)} border font-mono text-xs px-3 py-1`}
                            >
                                {opsPresentation.label}
                            </Badge>

                            {/* Cancel — the order page's `CancelOrderButton` slot
                                (page.tsx:664 → hybrid-sections.tsx:107-149): a
                                destructive header button whose reason capture lives in
                                a dialog. RL-015 — the generic cancel route refuses an
                                uplift and a repair-before-event task; that guard is
                                unchanged, it just travels with the button. */}
                            {!isRepairBeforeEvent && !isUplift && (
                                <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive">Cancel Request</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="font-mono">
                                                CANCEL SERVICE REQUEST
                                            </DialogTitle>
                                            <DialogDescription className="font-mono text-xs">
                                                {request.service_request_id} → CANCELLED
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">REASON</Label>
                                            <Textarea
                                                value={cancellationReason}
                                                onChange={(e) =>
                                                    setCancellationReason(e.target.value)
                                                }
                                                placeholder="Why is this being cancelled?"
                                                className="font-mono text-sm"
                                                rows={4}
                                            />
                                            {/* Stated before the click, not after it. */}
                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                Reason required, at least 10 characters. Cancelling
                                                is final.
                                            </p>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                variant="outline"
                                                onClick={() => setCancelDialogOpen(false)}
                                                disabled={cancelRequest.isPending}
                                                className="font-mono text-xs"
                                            >
                                                BACK
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleCancel}
                                                disabled={cancelRequest.isPending}
                                                className="font-mono text-xs"
                                            >
                                                {cancelRequest.isPending
                                                    ? "CANCELLING..."
                                                    : "CANCEL REQUEST"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}

                            {/* The document download — the order page's DOWNLOAD GOODS
                                FORM slot (page.tsx:666-679), same classes, same glyph
                                size, same pending label. */}
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 font-mono text-xs"
                                onClick={handleDownloadCostEstimate}
                                disabled={downloadCostEstimate.isPending}
                            >
                                <Download className="h-3.5 w-3.5" />
                                {downloadCostEstimate.isPending
                                    ? "DOWNLOADING..."
                                    : "COST ESTIMATE"}
                            </Button>

                            {/* Status advance — the order page's PROGRESS slot
                                (page.tsx:681-849): a primary header button opening a
                                `sm:max-w-md` dialog whose body is a single column of
                                fields plus one conditional sub-field. */}
                            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-2 font-mono text-xs">
                                        <PlayCircle className="h-3.5 w-3.5" />
                                        PROGRESS
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="font-mono">
                                            UPDATE OPERATIONAL STATUS
                                        </DialogTitle>
                                        <DialogDescription className="font-mono text-xs">
                                            Current: {opsPresentation.label} → Select next status
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">MOVE TO</Label>
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
                                            <Label className="font-mono text-xs">
                                                NOTE (Optional)
                                            </Label>
                                            <Input
                                                value={statusNote}
                                                onChange={(e) => setStatusNote(e.target.value)}
                                                placeholder="Why is it moving?"
                                                className="font-mono text-sm"
                                            />
                                        </div>

                                        {statusValue === "COMPLETED" && (
                                            <div className="space-y-2">
                                                <Label className="font-mono text-xs">
                                                    COMPLETION NOTES
                                                    {isRepairBeforeEvent && (
                                                        <span className="text-destructive"> *</span>
                                                    )}
                                                </Label>
                                                <Textarea
                                                    value={completionNotes}
                                                    onChange={(e) =>
                                                        setCompletionNotes(e.target.value)
                                                    }
                                                    placeholder="What was done?"
                                                    className="font-mono text-sm"
                                                    rows={3}
                                                />
                                                {/* Stated before the click, not after it. The
                                                    rule itself is unchanged and still enforced
                                                    on submit. */}
                                                {isRepairBeforeEvent && (
                                                    <p className="font-mono text-[11px] text-muted-foreground">
                                                        Notes and at least one saved work photo are
                                                        required. Saved photos: {workPhotoCount}.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setStatusDialogOpen(false)}
                                            disabled={updateStatus.isPending}
                                            className="font-mono text-xs"
                                        >
                                            CANCEL
                                        </Button>
                                        <Button
                                            onClick={handleStatusUpdate}
                                            disabled={updateStatus.isPending}
                                            className="font-mono text-xs"
                                        >
                                            {updateStatus.isPending
                                                ? "UPDATING..."
                                                : "UPDATE STATUS"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                <div
                    className={cn(
                        "grid grid-cols-1 gap-6",
                        historyCollapsed ? "lg:grid-cols-[minmax(0,1fr)_128px]" : "lg:grid-cols-3"
                    )}
                >
                    {/* Main Content */}
                    <div className={cn("space-y-6", historyCollapsed ? "" : "lg:col-span-2")}>
                        {/* The one thing to do now. Resolves the dual status into a
                            single "whose desk is this on" line plus the next step —
                            the order page's tinted p-4 alert-banner grammar
                            (page.tsx:1025-1041), at the top of the column where the
                            order page puts its own alert band. */}
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
                            service-request controls cannot express. Sits where the order
                            page puts its tinted domain-blocker cards (page.tsx:864-1023):
                            directly after the alert band. */}
                        {isUplift && <UpliftReviewPanel request={request} onChanged={refetch} />}

                        {/* The entity's fact sheet — the order page's EVENT & VENUE slot
                            (page.tsx:1547-1648): grid of Label/value cells, Separators
                            between groups, one Badge-in-a-labelled-cell, free text last. */}
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

                        {/* Items — the order page's ITEMS slot (page.tsx:2051-2077):
                            second-to-last block, `NOUN ({n})` heading, `<Boxes/>`,
                            `CardContent space-y-2`. */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Boxes className="h-4 w-4 text-primary" />
                                    SERVICE ITEMS ({itemCount})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
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

                        {/* The money block — last in the main column, exactly where the
                            order page puts it (page.tsx:2107-2127 → hybrid-sections.tsx:
                            60-101): the ledger, then one right-aligned outline secondary
                            beneath it, then the dialog that secondary opens. */}
                        <div className="space-y-6">
                            {/* The single editable money table: line items + role-preview
                                lenses + footer totals + add / bulk-margin / no-cost
                                actions. SR money editability keys off the COMMERCIAL
                                status (dual-status model): the ledger self-gates editable
                                pre-QUOTE_APPROVED and locks at QUOTE_APPROVED / INVOICED /
                                PAID, mirroring the API's getLineItemEditability SR branch.
                                No approve slot — SR commercial status is driven by the
                                control directly beneath, so the number and the decision
                                still read as one block. */}
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

                            {/* Not a pricing action, so it sits beside the ledger, not
                                inside it — the order page's Return-to-Logistics slot. */}
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setCommercialDialogOpen(true)}
                                >
                                    Update Commercial Status
                                </Button>
                            </div>

                            <Dialog
                                open={commercialDialogOpen}
                                onOpenChange={setCommercialDialogOpen}
                            >
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="font-mono">
                                            UPDATE COMMERCIAL STATUS
                                        </DialogTitle>
                                        <DialogDescription className="font-mono text-xs">
                                            Current: {comPresentation.label} → Select next status
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">MOVE TO</Label>
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
                                            <Label className="font-mono text-xs">
                                                NOTE (Optional)
                                            </Label>
                                            <Input
                                                value={commercialNote}
                                                onChange={(e) => setCommercialNote(e.target.value)}
                                                placeholder="Internal note"
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setCommercialDialogOpen(false)}
                                            disabled={updateCommercialStatus.isPending}
                                            className="font-mono text-xs"
                                        >
                                            CANCEL
                                        </Button>
                                        {/* Same mutation, same payload — the label just names
                                            what the selected transition actually does. */}
                                        <Button
                                            onClick={handleCommercialUpdate}
                                            disabled={updateCommercialStatus.isPending}
                                            className="font-mono text-xs"
                                        >
                                            {updateCommercialStatus.isPending
                                                ? "UPDATING..."
                                                : commercialStatusValue === "QUOTED"
                                                  ? "ISSUE QUOTE TO CLIENT"
                                                  : "UPDATE COMMERCIAL STATUS"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Right: Status History Timeline — collapses to a compact rail on
                        desktop so the main column widens. Below lg it stacks
                        full-width as before. */}
                    <CollapsibleHistoryColumn
                        collapsed={historyCollapsed}
                        onToggle={() => setHistoryCollapsed((prev) => !prev)}
                        railEntries={historyRailEntries}
                        railTitle="History"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    HISTORY
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
                    </CollapsibleHistoryColumn>
                </div>
            </div>
        </div>
    );
}
