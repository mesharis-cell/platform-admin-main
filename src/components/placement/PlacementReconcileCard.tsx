"use client";

/**
 * RL-003 — the ADMIN late-placement reconciliation control, shared by both arms.
 *
 * One card, two callers: the admin order detail page and the admin self-pickup
 * detail page. Both post the same body to the same-shaped route, so this is one
 * component parameterised by entity rather than a copy per page.
 *
 * The case it exists for: goods are already out on an ORDINARY order or pickup
 * and the client decides late that they are keeping them. Without this control
 * an admin cannot record that at all — the generic edit route deliberately
 * refuses `is_permanent_placement` after submission, so this route is the only
 * way in.
 *
 * ── Why the clash list appears AFTER the conversion, not before ──────────────
 *
 * `future_booking_clashes` is computed inside the acting transaction and
 * returned on the POST. There is no GET that previews it, and inventing one on
 * the API is out of scope here. Re-deriving it in the browser would mean
 * reimplementing a per-asset window comparison the server does under a row lock
 * — it would go stale the moment anything else booked, and a preview that
 * disagrees with the server is worse than no preview.
 *
 * So the dialog is two explicit steps with the mutation between them: a confirm
 * step that states plainly that later bookings will be listed once the
 * conversion is applied, and a result step that lists them and says in as many
 * words that the conversion has already gone through. That ordering is
 * acceptable precisely because the owner decided a clash REPORTS rather than
 * GATES — nothing on the list would have changed the decision, only the follow-up.
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    usePlacementReconcile,
    type PlacementParentType,
    type PlacementReconcileResult,
} from "@/hooks/use-placement-reconcile";
import { formatBookingWindow } from "@/lib/date-display";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { useToken } from "@/lib/auth/use-token";
import { removeUnderScore } from "@/lib/utils/helper";

/**
 * The source statuses each arm accepts, copied from the eligibility lists in
 * `api/src/app/services/placement-reconcile.service.ts`. The server is
 * authoritative and re-checks under a lock (409 with its own wording); these
 * exist so the control is never OFFERED where it would be refused.
 *
 * AWAITING_RETURN, RETURN_IN_TRANSIT and every terminal status are absent
 * deliberately: an entity already in its return finishes it or is cancelled.
 */
const ORDER_ELIGIBLE_STATUSES = [
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "IN_PREPARATION",
    "READY_FOR_DELIVERY",
    "IN_TRANSIT",
    "DELIVERED",
    "IN_USE",
    "DERIG",
];

/**
 * The statuses whose goods are already dispatched AND whose placement COMPLETES
 * in the same call — the entity moves to PLACED and takes RL-037's custody exit.
 * READY_FOR_DELIVERY and IN_TRANSIT are deliberately absent even though their
 * outbound scan has run: they keep their status and are placed at delivery.
 */
const ORDER_PLACING_STATUSES = ["DELIVERED", "IN_USE", "DERIG"];

const SELF_PICKUP_ELIGIBLE_STATUSES = [
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "READY_FOR_PICKUP",
    "PICKED_UP",
];

const SELF_PICKUP_PLACING_STATUSES = ["PICKED_UP"];

interface PlacementReconcileCardProps {
    entityType: PlacementParentType;
    /** UUID the route is called with. */
    entityId: string;
    /** `orders.order_id` / `self_pickups.self_pickup_id`. */
    humanId: string;
    /** `order_status` / `self_pickup_status`. */
    status: string;
    isPermanentPlacement: boolean;
    companyName?: string;
    /** Called after a conversion actually changed something. */
    onReconciled?: () => void;
}

export function PlacementReconcileCard({
    entityType,
    entityId,
    humanId,
    status,
    isPermanentPlacement,
    companyName,
    onReconciled,
}: PlacementReconcileCardProps) {
    const { user } = useToken();
    const isOrder = entityType === "ORDER";
    const label = isOrder ? "order" : "self-pickup";

    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"confirm" | "result">("confirm");
    const [reason, setReason] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);
    const [result, setResult] = useState<PlacementReconcileResult | null>(null);

    const reconcile = usePlacementReconcile(entityType, entityId);

    // RL-028 — no permission key is introduced; the routes sit under the keys
    // the admin already holds for editing each entity.
    const canAct = hasPermission(
        user,
        isOrder
            ? ADMIN_ACTION_PERMISSIONS.ordersEditDetails
            : ADMIN_ACTION_PERMISSIONS.selfPickupsEditDetails
    );

    const eligibleStatuses = isOrder ? ORDER_ELIGIBLE_STATUSES : SELF_PICKUP_ELIGIBLE_STATUSES;
    const placingStatuses = isOrder ? ORDER_PLACING_STATUSES : SELF_PICKUP_PLACING_STATUSES;

    // Ordinary only, and only from a status the route accepts. Anything else is
    // hidden rather than shown-and-refused.
    const eligible = canAct && !isPermanentPlacement && eligibleStatuses.includes(status);
    const willPlace = placingStatuses.includes(status);

    const reasonTrimmed = reason.trim();
    const reasonInvalid = reasonTrimmed.length < 5 || reasonTrimmed.length > 500;
    const canSubmit = !reconcile.isPending && !reasonInvalid && acknowledged;

    const handleOpenChange = (next: boolean) => {
        // Never let the dialog be dismissed while the conversion is in flight —
        // the clash list is the only place it is ever reported.
        if (!next && reconcile.isPending) return;
        setOpen(next);
        if (!next) {
            setStep("confirm");
            setReason("");
            setAcknowledged(false);
            setResult(null);
        }
    };

    const handleConfirm = async () => {
        if (!canSubmit) return;
        try {
            const response = await reconcile.mutateAsync({
                reason: reasonTrimmed,
                acknowledge_open_ended: true,
            });
            setResult(response.data);
            setStep("result");
            // The API's own wording distinguishes converted / converted-and-placed
            // / already-a-placement. Surface it rather than a generic string.
            if (response.data?.already_reconciled) {
                toast.info(response.message);
            } else {
                toast.success(response.message);
                onReconciled?.();
            }
        } catch (error: unknown) {
            // throwApiError has already unwrapped the API's message.
            toast.error(
                (error as Error)?.message || `Failed to convert this ${label} to a placement`
            );
        }
    };

    // The card disappears the moment the entity becomes permanent, but the
    // dialog must survive that re-render — it is holding the clash list the
    // operator has not read yet.
    if (!eligible && !open) return null;

    const clashes = result?.future_booking_clashes ?? [];
    const custody = result?.custody_exit ?? null;

    return (
        <>
            {eligible && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <PackageCheck className="h-4 w-4 text-amber-600" />
                            Permanent placement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                            This {label} is ordinary — its goods are expected back and its stock is
                            held only until the return. If the client has decided to keep them,
                            convert it to a permanent placement so the stock stops being expected
                            back and its hold is held open-ended instead.
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                            One-way. A permanent placement cannot be converted back to an ordinary{" "}
                            {label}.
                        </p>
                        <Button variant="outline" onClick={() => setOpen(true)}>
                            <PackageCheck className="mr-1 h-4 w-4" />
                            Convert to permanent placement
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                    {step === "confirm" ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 font-mono">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    CONVERT TO PERMANENT PLACEMENT
                                </DialogTitle>
                                <DialogDescription>
                                    {humanId}
                                    {companyName ? ` — ${companyName}` : ""}. The goods on this{" "}
                                    {label} stop being expected back, the stock they use is held
                                    open-ended, and no return is ever scheduled for it. This is
                                    one-way: a permanent placement cannot be converted back to an
                                    ordinary {label}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-2">
                                <div className="space-y-2 rounded-md border p-3">
                                    <Label className="font-mono text-xs">WHAT THIS DOES</Label>
                                    <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                                        <li>
                                            Marks {humanId} as a permanent placement — it is no
                                            longer an ordinary {label}.
                                        </li>
                                        <li>
                                            Holds every asset on it open-ended. The hold no longer
                                            expires, so the stock is never quietly released while
                                            the goods stand on a client site.
                                        </li>
                                        <li>
                                            Drops it out of return scheduling and overdue-return
                                            reporting — nothing will ever prompt anyone to collect
                                            it.
                                        </li>
                                        {willPlace && (
                                            <li>
                                                Its goods are already out, so this also moves it
                                                straight to PLACED, writes the pooled (consumable)
                                                stock on it off the custody record, and stamps its
                                                serialized units as placed with the client.
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                                    <Label className="font-mono text-xs text-amber-700">
                                        LATER BOOKINGS ON THE SAME STOCK
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Any booking that was accepted for a date after this {label}
                                        &apos;s hold would have ended is now overlapped by an
                                        open-ended hold. Every one of them is listed for you as soon
                                        as the conversion is applied. They are{" "}
                                        <strong>reported, not blocked</strong> — the conversion goes
                                        through either way, and re-planning them is yours to do.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">
                                        REASON (REQUIRED, 5–500 CHARACTERS)
                                    </Label>
                                    <Textarea
                                        value={reason}
                                        maxLength={500}
                                        rows={3}
                                        placeholder="State who decided the goods are staying and why."
                                        onChange={(event) => setReason(event.target.value)}
                                    />
                                    <div className="flex items-center justify-between gap-3">
                                        {/* RL-023 — the reason is INTERNAL. It reaches the
                                            admin-only audit record and nothing else; the status
                                            history gets a neutral entry with no reason and no
                                            actor name, and the client is never told one. */}
                                        <p className="font-mono text-[11px] text-muted-foreground">
                                            Internal. Recorded on the audit trail only — the client
                                            is never shown a conversion reason.
                                        </p>
                                        <p
                                            className={`shrink-0 font-mono text-[11px] ${
                                                reasonInvalid
                                                    ? "text-destructive"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {reasonTrimmed.length}/500
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 rounded-md border p-3">
                                    <Checkbox
                                        id="acknowledge-open-ended"
                                        checked={acknowledged}
                                        onCheckedChange={(value) => setAcknowledged(value === true)}
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="acknowledge-open-ended"
                                        className="cursor-pointer text-sm font-normal leading-snug"
                                    >
                                        I understand this places an <strong>open-ended</strong> hold
                                        on the stock and cannot be undone.
                                    </Label>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => handleOpenChange(false)}
                                    disabled={reconcile.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleConfirm}
                                    disabled={!canSubmit}
                                >
                                    {reconcile.isPending
                                        ? "Converting…"
                                        : "Convert to permanent placement"}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 font-mono">
                                    {result?.already_reconciled ? (
                                        <Info className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    )}
                                    {result?.already_reconciled
                                        ? "NO CHANGE MADE"
                                        : "CONVERSION APPLIED"}
                                </DialogTitle>
                                <DialogDescription>
                                    {result?.already_reconciled
                                        ? `${humanId} was already a permanent placement, so nothing was changed. This is not an error — the same conversion run twice does nothing the second time.`
                                        : `${humanId} is now a permanent placement. The change has been saved.`}
                                </DialogDescription>
                            </DialogHeader>

                            {result && !result.already_reconciled && (
                                <div className="space-y-4 py-2">
                                    <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                                        <Label className="font-mono text-xs text-emerald-700">
                                            WHAT CHANGED
                                        </Label>
                                        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                                            <li>
                                                Marked as a permanent placement. Status:{" "}
                                                <span className="font-mono">
                                                    {removeUnderScore(result.status)}
                                                </span>
                                                {result.placed
                                                    ? " — placed in the same step."
                                                    : "."}
                                            </li>
                                            <li>
                                                {result.bookings_made_open_ended} booking
                                                {result.bookings_made_open_ended === 1
                                                    ? " is"
                                                    : "s are"}{" "}
                                                now open-ended.
                                            </li>
                                            {result.return_date_cleared && (
                                                <li>
                                                    The scheduled end date was cleared — no return
                                                    is scheduled.
                                                </li>
                                            )}
                                            {custody && custody.total_units_written_off > 0 && (
                                                <li>
                                                    {custody.total_units_written_off} pooled unit
                                                    {custody.total_units_written_off === 1
                                                        ? ""
                                                        : "s"}{" "}
                                                    written off the custody record (
                                                    {custody.pooled_written_off
                                                        .map(
                                                            (line) =>
                                                                `${line.asset_name} ×${line.qty}`
                                                        )
                                                        .join(", ")}
                                                    ).
                                                </li>
                                            )}
                                            {custody && custody.serialized_placed_count > 0 && (
                                                <li>
                                                    {custody.serialized_placed_count} serialized
                                                    unit
                                                    {custody.serialized_placed_count === 1
                                                        ? ""
                                                        : "s"}{" "}
                                                    stamped as placed with the client.
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            LATER BOOKINGS ON THIS STOCK ({clashes.length})
                                        </Label>
                                        {clashes.length === 0 ? (
                                            <p className="rounded-md border p-3 font-mono text-[11px] text-muted-foreground">
                                                None. No other booking starts after this
                                                placement&apos;s hold would have ended.
                                            </p>
                                        ) : (
                                            <>
                                                <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800">
                                                    The conversion has already been applied. The
                                                    booking
                                                    {clashes.length === 1 ? "" : "s"} below{" "}
                                                    {clashes.length === 1 ? "was" : "were"} accepted
                                                    while this placement&apos;s hold still had an
                                                    end date, and the open-ended hold now overlaps{" "}
                                                    {clashes.length === 1 ? "it" : "them"}. Nothing
                                                    has been changed on{" "}
                                                    {clashes.length === 1 ? "it" : "them"} and
                                                    nothing was blocked — re-plan{" "}
                                                    {clashes.length === 1 ? "it" : "them"} yourself.
                                                </p>
                                                <div className="space-y-2">
                                                    {clashes.map((clash) => (
                                                        <div
                                                            key={clash.booking_id}
                                                            className="space-y-1 rounded-md border p-3"
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-medium">
                                                                    {clash.asset_name || "—"}
                                                                </span>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-mono text-[10px]"
                                                                >
                                                                    {clash.parent_type ===
                                                                    "SELF_PICKUP"
                                                                        ? "Self-pickup"
                                                                        : "Order"}{" "}
                                                                    {clash.parent_human_id || "—"}
                                                                </Badge>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-mono text-[10px] text-amber-700"
                                                                >
                                                                    Qty {clash.quantity}
                                                                </Badge>
                                                            </div>
                                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                                {clash.company_name || "—"} ·{" "}
                                                                {formatBookingWindow(
                                                                    clash.blocked_from,
                                                                    clash.blocked_until
                                                                )}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button onClick={() => handleOpenChange(false)}>Done</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
