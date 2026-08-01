"use client";

/**
 * RL-012 / RL-013 / RL-015 / RL-032 / RL-036 — the ADMIN uplift desk.
 *
 * An uplift is the collection of a permanent placement: a service request of
 * `request_type = UPLIFT`, created by the CLIENT against a PLACED order, priced
 * on its buy side by LOGISTICS and then submitted for admin review. It rides the
 * ORDER quote flow, not the flat service-request one, and this panel is the
 * admin half of that flow:
 *
 *   SUBMITTED  + PENDING_QUOTE  → with logistics (pricing the buy side)
 *   IN_REVIEW  + PENDING_QUOTE  → with admin    (review, edit lines, then issue)
 *   IN_REVIEW  + QUOTED         → with the client
 *
 * Admin's two exits from IN_REVIEW are ISSUING the quote — which happens on the
 * existing commercial-status control on this page — and RETURNING it to
 * logistics for rework, which is the control below because it carries a required
 * internal note that no generic route enforces.
 *
 * Two things admin deliberately cannot do here, and each is enforced server-side
 * regardless of what this panel offers:
 *   - Approve the quote. The CLIENT's acceptance opens the return flow in the
 *     same transaction (RL-014); writing QUOTE_APPROVED from the ops route would
 *     move commercial status and leave the coupled transitions behind.
 *   - Invoice. The uplift commercial lifecycle ends at QUOTE_APPROVED in this
 *     release; INVOICED and PAID are rejected with 409.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftRight, ExternalLink, PackageX, Truck, XCircle } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAdminOrderDetails } from "@/hooks/use-orders";
import { useCancelUplift, useReturnUpliftToLogistics } from "@/hooks/use-service-requests";
import {
    useOrderReturnProgress,
    useRecordUpliftWriteOff,
    type ReturnProgressAsset,
} from "@/hooks/use-write-off-decision";
import {
    WriteOffDecisionDialog,
    outstandingOf,
    type OutstandingLine,
} from "@/components/settlement/WriteOffDecisionDialog";
import { formatNullableDate } from "@/lib/date-display";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import type { ServiceRequest } from "@/types/service-request";

/** The desk an uplift is currently sitting on, from the pair of statuses. */
export function upliftDesk(request: ServiceRequest): string {
    if (request.request_status === "CANCELLED") return "Cancelled";
    if (request.request_status === "COMPLETED") return "Completed";
    if (request.commercial_status === "QUOTE_APPROVED") return "Approved — collection authorised";
    if (request.commercial_status === "QUOTED") return "With the client";
    if (request.request_status === "IN_REVIEW") return "With admin";
    if (request.request_status === "SUBMITTED") return "With logistics";
    return request.request_status.replace(/_/g, " ");
}

interface UpliftReviewPanelProps {
    request: ServiceRequest;
    onChanged: () => void;
}

export function UpliftReviewPanel({ request, onChanged }: UpliftReviewPanelProps) {
    const { user } = useToken();
    // All three routes below sit under the EXISTING service_requests:update key —
    // the release adds no new permission key (RL-028), so this is the gate.
    const canAct = hasPermission(user, ADMIN_ACTION_PERMISSIONS.serviceRequestsUpdate);
    const orderId = request.related_order_id;
    const { data: orderResponse } = useAdminOrderDetails(orderId);
    const order = orderResponse?.data;

    const returnToLogistics = useReturnUpliftToLogistics();
    const cancelUplift = useCancelUplift();
    const recordWriteOff = useRecordUpliftWriteOff();

    const [reworkOpen, setReworkOpen] = useState(false);
    const [reworkNote, setReworkNote] = useState("");
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [writeOffOpen, setWriteOffOpen] = useState(false);

    // RL-036 preconditions, mirrored so the control is not offered pointlessly.
    // Returning an already-issued quote is a 409 naming QUOTED: the client's
    // answer comes first, and a client revision request puts commercial status
    // back to PENDING_QUOTE, after which this is legal again.
    const canReturnToLogistics =
        canAct &&
        request.request_status === "IN_REVIEW" &&
        request.commercial_status === "PENDING_QUOTE";

    // RL-015 — ADMIN clears an unapproved uplift, or cancels an approved one
    // while its order is AWAITING_RETURN. The server additionally refuses when
    // any inbound scan already exists against the order.
    const canCancel = canAct && !["COMPLETED", "CANCELLED"].includes(request.request_status);

    // RL-032 — the decision is for units known not to be coming back on an
    // approved, non-completed uplift whose source order is AWAITING_RETURN.
    // Never RETURN_IN_TRANSIT: a live visit is resolved by recording the partial
    // collection first.
    // Status-only, so the blocked-reason message below states the real reason
    // rather than blaming the status when the permission is what is missing.
    const upliftIsLive = ["APPROVED", "IN_PROGRESS"].includes(request.request_status);
    const orderStatus: string | undefined = order?.order_status;
    const writeOffBlockedReason = !upliftIsLive
        ? `The uplift must be approved and not yet completed to record a write-off decision. Current status: ${request.request_status.replace(/_/g, " ")}.`
        : orderStatus === "RETURN_IN_TRANSIT"
          ? "A collection is in transit. Record the partial collection first — which returns the order to Awaiting Return — then decide on the units left behind."
          : orderStatus && orderStatus !== "AWAITING_RETURN"
            ? `The source order must be Awaiting Return to record a write-off decision. Current status: ${orderStatus.replace(/_/g, " ")}.`
            : null;

    const { data: progress } = useOrderReturnProgress(orderId, upliftIsLive && !!orderId);

    /**
     * The outstanding lines, joined on `asset_id` from the two reads admin can
     * actually reach: the order's item rows carry the `line_id` the payload
     * needs, and the return-progress read carries `stock_mode` and the quantity
     * already scanned back. `settled_quantity` is not exposed on either, so it
     * is flagged unknown and the server nets it off — an over-claim comes back
     * as a 409 naming the true outstanding quantity rather than being applied.
     */
    const outstandingLines: OutstandingLine[] = useMemo(() => {
        const items: any[] = order?.items ?? [];
        const progressByAsset = new Map<string, ReturnProgressAsset>(
            (progress?.assets ?? []).map((a) => [a.asset_id, a])
        );
        return items
            .map((entry) => {
                const item = entry.order_item ?? entry;
                const assetId: string = item.asset_id;
                const scan = progressByAsset.get(assetId);
                const stockMode = scan?.stock_mode;
                if (!stockMode) return null;
                return {
                    line_id: item.id,
                    asset_id: assetId,
                    asset_name: item.asset_name ?? entry.asset?.name ?? "Unnamed asset",
                    stock_mode: stockMode,
                    expected: Number(scan?.required_quantity ?? item.quantity ?? 0),
                    returned: Number(scan?.scanned_quantity ?? 0),
                    settled: 0,
                    settledUnknown: true,
                } as OutstandingLine;
            })
            .filter((line): line is OutstandingLine => line !== null)
            .filter((line) => outstandingOf(line) > 0);
    }, [order, progress]);

    const handleReturnToLogistics = async () => {
        const note = reworkNote.trim();
        if (note.length < 5 || note.length > 500) {
            toast.error("The rework note must be between 5 and 500 characters");
            return;
        }
        try {
            await returnToLogistics.mutateAsync({ id: request.id, note });
            setReworkOpen(false);
            setReworkNote("");
            toast.success("Returned to logistics for rework");
            onChanged();
        } catch (error: any) {
            toast.error(error?.message || "Failed to return the uplift to logistics");
        }
    };

    const handleCancel = async () => {
        const reason = cancelReason.trim();
        if (reason.length < 5 || reason.length > 500) {
            toast.error("The cancellation reason must be between 5 and 500 characters");
            return;
        }
        try {
            await cancelUplift.mutateAsync({ id: request.id, cancellation_reason: reason });
            setCancelOpen(false);
            setCancelReason("");
            toast.success("Uplift cancelled");
            onChanged();
        } catch (error: any) {
            toast.error(error?.message || "Failed to cancel the uplift");
        }
    };

    return (
        <>
            <Card className="border-sky-500/30 bg-sky-500/5">
                <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2 font-mono text-sm uppercase tracking-wide">
                        <Truck className="h-4 w-4 text-sky-700" />
                        Uplift collection
                        <Badge className="border-sky-500/20 bg-sky-500/10 text-sky-700">
                            {upliftDesk(request)}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                        This is the collection of a permanent placement. Logistics prices the buy
                        side and submits it; admin reviews, edits lines and either issues the quote
                        to the client or hands it back for rework. The client&apos;s acceptance is
                        what opens the return flow — admin never approves the quote here, and
                        invoicing is out of scope for this release.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-muted-foreground">Source order</p>
                            {orderId ? (
                                <Link
                                    href={`/orders/${orderId}`}
                                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                >
                                    {order?.order_id ?? "Open order"}
                                    <ExternalLink className="h-3 w-3" />
                                </Link>
                            ) : (
                                <p className="font-medium">Not linked</p>
                            )}
                            {orderStatus && (
                                <p className="font-mono text-xs text-muted-foreground">
                                    {orderStatus.replace(/_/g, " ")}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="text-muted-foreground">Venue</p>
                            <p className="font-medium">{order?.venue_name ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Requested by client</p>
                            <p>
                                {formatNullableDate(request.uplift_requested_at, {
                                    emptyLabel: "—",
                                    withTime: true,
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Client approved</p>
                            <p>
                                {formatNullableDate(request.uplift_approved_at, {
                                    emptyLabel: "Not yet approved",
                                    withTime: true,
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Requested collection window</p>
                            {/* RL-012 — timing is always labelled as REQUESTED, never as a
                                confirmed appointment. Scheduling and appointment confirmation
                                are explicit non-goals in this release. */}
                            <p>
                                {request.requested_start_at || request.requested_due_at
                                    ? `${formatNullableDate(request.requested_start_at, {
                                          emptyLabel: "—",
                                          withTime: true,
                                      })} → ${formatNullableDate(request.requested_due_at, {
                                          emptyLabel: "—",
                                          withTime: true,
                                      })} (requested)`
                                    : "Timing to be confirmed."}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Units to collect</p>
                            <p>{request.items?.length ?? 0} line(s)</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            disabled={!canReturnToLogistics}
                            onClick={() => setReworkOpen(true)}
                        >
                            <ArrowLeftRight className="mr-1 h-4 w-4" />
                            Return to logistics
                        </Button>
                        <Button
                            variant="outline"
                            disabled={!canAct || !upliftIsLive}
                            onClick={() => setWriteOffOpen(true)}
                        >
                            <PackageX className="mr-1 h-4 w-4" />
                            Record write-off decision
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={!canCancel}
                            onClick={() => setCancelOpen(true)}
                        >
                            <XCircle className="mr-1 h-4 w-4" />
                            Cancel uplift
                        </Button>
                    </div>
                    {!canReturnToLogistics && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                            Return to logistics is available while the uplift is with admin and its
                            quote has not been issued. Once the quote is out, the client&apos;s
                            answer comes first — a revision request puts it back on the admin desk.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* RL-036 — the rework note is required, 5–500 characters, and internal. */}
            <Dialog open={reworkOpen} onOpenChange={setReworkOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-mono">RETURN TO LOGISTICS</DialogTitle>
                        <DialogDescription>
                            Hands the priced collection back to logistics for rework. Line items and
                            the pricing breakdown are left exactly as you left them — the return
                            hands back the desk, not the work.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">
                            WHAT NEEDS REWORK (REQUIRED, 5–500 CHARACTERS)
                        </Label>
                        <Textarea
                            value={reworkNote}
                            onChange={(event) => setReworkNote(event.target.value)}
                            rows={4}
                            placeholder="State what logistics needs to change on the buy side."
                        />
                        <p className="font-mono text-[11px] text-muted-foreground">
                            Internal — visible to logistics on the operations view. It is never
                            written to the status history, which the client can read.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReworkOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReturnToLogistics}
                            disabled={returnToLogistics.isPending}
                        >
                            {returnToLogistics.isPending ? "Returning..." : "Return for rework"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-mono">CANCEL UPLIFT</DialogTitle>
                        <DialogDescription>
                            Clears the collection and returns the order to its placement. An
                            approved uplift can only be cancelled while the order is awaiting return
                            and nothing has been scanned back in; the server refuses otherwise and
                            names what to resolve first.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">
                            REASON (REQUIRED, 5–500 CHARACTERS)
                        </Label>
                        <Textarea
                            value={cancelReason}
                            onChange={(event) => setCancelReason(event.target.value)}
                            rows={4}
                            placeholder="Why is this collection being cancelled?"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelOpen(false)}>
                            Keep uplift
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={cancelUplift.isPending}
                        >
                            {cancelUplift.isPending ? "Cancelling..." : "Cancel uplift"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <WriteOffDecisionDialog
                open={writeOffOpen}
                onOpenChange={setWriteOffOpen}
                parentLabel={`${request.service_request_id}${order?.order_id ? ` · ${order.order_id}` : ""}`}
                lines={outstandingLines}
                isPending={recordWriteOff.isPending}
                blockedReason={writeOffBlockedReason}
                onConfirm={async (payload) => {
                    try {
                        await recordWriteOff.mutateAsync({
                            serviceRequestId: request.id,
                            payload,
                        });
                        setWriteOffOpen(false);
                        toast.success("Write-off decision recorded");
                        onChanged();
                    } catch (error: any) {
                        toast.error(error?.message || "Failed to record the write-off decision");
                    }
                }}
            />
        </>
    );
}
