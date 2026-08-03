"use client";

/**
 * RL-032 Resolution 2 — the write-off decision builder, shared by both arms.
 *
 * One dialog, two callers: the uplift on an order's collection, and the
 * retention write-off on a permanent self-pickup. Both post the same body —
 * `{ reason, note, units[] }` — because RL-032 fixes ONE settlement vocabulary
 * for the whole release: an entry carrying `asset_id` settles one serialized
 * unit and carries no quantity; an entry without it is pooled and its
 * `quantity` is required, at least one and at most the line's outstanding
 * quantity.
 *
 * What the operator is deciding, stated plainly on the dialog: these units will
 * NOT be collected. The decision is terminal — it removes them from
 * `total_quantity`, reduces the covering booking by the same amount in the same
 * transaction, and stamps a serialized unit's asset row as PLACED. Availability
 * is NOT credited, because nothing came back. Nothing reverses it.
 *
 * Outstanding quantities shown here are the client's best read of the parent's
 * item rows and its scan progress. The SERVER is authoritative and validates
 * every entry against `expected_quantity − settled_quantity − returned_quantity`
 * inside the acting transaction; anything over-claimed comes back as a 409
 * naming the offending unit and its true outstanding quantity.
 *
 * ── The future-booking guard, and overriding it ──────────────────────────────
 *
 * A named SERIALIZED unit that is already committed to somebody else is refused
 * by default: the decision writes the unit off `total_quantity` and stamps the
 * asset as placed with this client, so a competing booking would be quietly
 * broken. The server answers 409 with `code =
 * SERIALIZED_UNIT_BOOKED_ELSEWHERE` and a `blocked_units[]` naming every unit,
 * the competing order or pickup, its company and its held window.
 *
 * That is not a dead end. The operator may override it deliberately — the same
 * shape as the platform's other destructive override
 * (`PlacementReconcileCard`): the competing bookings are listed in full, an
 * explicit acknowledgement is ticked, and a mandatory reason is captured. The
 * reason goes onto the stock-movement note of every overridden unit AND onto
 * the audit event, so the override is a record rather than a bypass.
 *
 * The affordance is keyed off `code`, never off the message text, and the
 * override is never offered pre-emptively — it only appears once the server has
 * actually refused, so an ordinary decision never sees it.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { isWriteOffBlockedError, type BlockedWriteOffUnit } from "@/hooks/use-write-off-decision";
import type {
    WriteOffDecisionPayload,
    WriteOffDecisionUnit,
    WriteOffReason,
} from "@/hooks/use-write-off-decision";
import { formatBookingWindow } from "@/lib/date-display";

/** One candidate line, already joined from the parent's items + scan progress. */
export interface OutstandingLine {
    /** `order_items.id` or `self_pickup_items.id` — NOT a pricing line. */
    line_id: string;
    asset_id: string;
    asset_name: string;
    stock_mode: "SERIALIZED" | "POOLED";
    /** RL-018's `expected_quantity` for this entity. */
    expected: number;
    /** Quantity physically scanned back so far. */
    returned: number;
    /** Already settled by a prior decision or completion, when the surface knows it. */
    settled: number;
    /** True when the caller could not read `settled_quantity` for this line. */
    settledUnknown?: boolean;
}

const REASONS: { value: WriteOffReason; label: string }[] = [
    { value: "CONSUMED", label: "Consumed on site" },
    { value: "LOST", label: "Lost / unaccounted" },
    { value: "DAMAGED", label: "Damaged" },
    { value: "OTHER", label: "Other" },
];

export function outstandingOf(line: OutstandingLine): number {
    return Math.max(0, line.expected - line.settled - line.returned);
}

interface WriteOffDecisionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Human ID of the parent, shown so the operator knows what they are acting on. */
    parentLabel: string;
    lines: OutstandingLine[];
    isPending?: boolean;
    /** Non-null when the caller knows the action is currently refused. */
    blockedReason?: string | null;
    /**
     * MUST throw on failure — this dialog owns the guard's 409 and turns it into
     * the override step, and it cannot do that if the caller swallows the error.
     * On success the caller closes the dialog.
     */
    onConfirm: (payload: WriteOffDecisionPayload) => Promise<void>;
}

const OVERRIDE_REASON_MIN_LENGTH = 5;
const OVERRIDE_REASON_MAX_LENGTH = 500;

export function WriteOffDecisionDialog({
    open,
    onOpenChange,
    parentLabel,
    lines,
    isPending,
    blockedReason,
    onConfirm,
}: WriteOffDecisionDialogProps) {
    const [reason, setReason] = useState<WriteOffReason>("CONSUMED");
    const [note, setNote] = useState("");
    // Pooled lines carry a chosen quantity; serialized lines are a plain toggle,
    // because a serialized entry is exactly one unit and carries no quantity.
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    // Set only by the server's guard 409, and only for the selection that
    // produced it.
    const [blockedUnits, setBlockedUnits] = useState<BlockedWriteOffUnit[]>([]);
    const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);
    const [overrideReason, setOverrideReason] = useState("");

    const outstandingLines = useMemo(
        () => lines.filter((line) => outstandingOf(line) > 0),
        [lines]
    );

    const resetOverride = () => {
        setBlockedUnits([]);
        setOverrideAcknowledged(false);
        setOverrideReason("");
    };

    /**
     * CONTENT key, not the array identity.
     *
     * `outstandingLines` derives from the caller's queries, so its identity
     * changes on every background refetch even when nothing about the load has
     * moved. Keying the reset on identity meant a refetch mid-decision silently
     * cleared the operator's selection — and, now that there is an override step,
     * would also clear a block list they were part-way through acknowledging.
     * Keyed on content, the reset still fires when the dialog opens and when the
     * outstanding set genuinely changes (including the first load arriving after
     * the dialog is already open), and never merely because data was re-fetched.
     */
    const outstandingKey = outstandingLines
        .map((line) => `${line.line_id}:${outstandingOf(line)}`)
        .join("|");

    useEffect(() => {
        if (!open) return;
        setReason("CONSUMED");
        setNote("");
        setSelected({});
        resetOverride();
        setQuantities(
            Object.fromEntries(outstandingLines.map((l) => [l.line_id, String(outstandingOf(l))]))
        );
        // `outstandingLines` is read fresh on the render this fires from; the key
        // above is what decides WHEN it fires.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, outstandingKey]);

    const units: WriteOffDecisionUnit[] = useMemo(() => {
        const built: WriteOffDecisionUnit[] = [];
        for (const line of outstandingLines) {
            if (!selected[line.line_id]) continue;
            if (line.stock_mode === "SERIALIZED") {
                // One entry PER UNIT, each carrying asset_id and no quantity.
                const count = outstandingOf(line);
                for (let i = 0; i < count; i++) {
                    built.push({ line_id: line.line_id, asset_id: line.asset_id });
                }
            } else {
                const qty = Number(quantities[line.line_id]);
                if (!Number.isInteger(qty) || qty < 1) continue;
                built.push({ line_id: line.line_id, quantity: qty });
            }
        }
        return built;
    }, [outstandingLines, selected, quantities]);

    const quantityError = useMemo(() => {
        for (const line of outstandingLines) {
            if (!selected[line.line_id] || line.stock_mode === "SERIALIZED") continue;
            const qty = Number(quantities[line.line_id]);
            const max = outstandingOf(line);
            if (!Number.isInteger(qty) || qty < 1) {
                return `${line.asset_name}: enter a whole quantity of at least 1.`;
            }
            if (qty > max) {
                return `${line.asset_name}: ${qty} requested but only ${max} outstanding.`;
            }
        }
        return null;
    }, [outstandingLines, selected, quantities]);

    const noteTrimmed = note.trim();
    const noteInvalid = noteTrimmed.length < 5 || noteTrimmed.length > 500;

    const overrideReasonTrimmed = overrideReason.trim();
    const overrideReasonInvalid =
        overrideReasonTrimmed.length < OVERRIDE_REASON_MIN_LENGTH ||
        overrideReasonTrimmed.length > OVERRIDE_REASON_MAX_LENGTH;
    const isOverriding = blockedUnits.length > 0;
    const overrideIncomplete = isOverriding && (!overrideAcknowledged || overrideReasonInvalid);

    const canSubmit =
        !isPending &&
        !blockedReason &&
        units.length > 0 &&
        !quantityError &&
        !noteInvalid &&
        !overrideIncomplete;

    /**
     * Changing WHICH units are being written off invalidates a block list the
     * server produced for a different set, so the override collapses back to
     * nothing and has to be re-earned by a fresh refusal. Keyed on the built
     * payload rather than the raw selection so a quantity edit counts too.
     */
    const unitsKey = JSON.stringify(units);
    useEffect(() => {
        resetOverride();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unitsKey]);

    const handleConfirm = async () => {
        if (!canSubmit) return;
        try {
            await onConfirm({
                reason,
                note: noteTrimmed,
                units,
                ...(isOverriding
                    ? {
                          booking_override: {
                              acknowledge_competing_booking: true as const,
                              reason: overrideReasonTrimmed,
                          },
                      }
                    : {}),
            });
        } catch (error) {
            // The guard's refusal is not an error to dismiss — it is the next
            // step. Everything else is reported and the dialog stays put so the
            // selection is not lost.
            if (isWriteOffBlockedError(error)) {
                setBlockedUnits(error.blockedUnits);
                setOverrideAcknowledged(false);
                setOverrideReason("");
                return;
            }
            toast.error((error as Error)?.message || "Failed to record the write-off decision");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-mono">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        RECORD WRITE-OFF DECISION
                    </DialogTitle>
                    <DialogDescription>
                        {parentLabel} — these units will <strong>not</strong> be collected. This is
                        permanent and cannot be undone. Nothing is credited back to availability.
                    </DialogDescription>
                </DialogHeader>

                {blockedReason ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {blockedReason}
                    </p>
                ) : null}

                {outstandingLines.length === 0 ? (
                    <p className="py-6 text-sm text-muted-foreground">
                        Nothing is outstanding on this load — every line is either returned or
                        already settled.
                    </p>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">
                                UNITS THAT WILL NOT COME BACK
                            </Label>
                            <div className="space-y-2">
                                {outstandingLines.map((line) => {
                                    const max = outstandingOf(line);
                                    const isChecked = !!selected[line.line_id];
                                    return (
                                        <div
                                            key={line.line_id}
                                            className="flex items-start gap-3 rounded-md border p-3"
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={(value) =>
                                                    setSelected((prev) => ({
                                                        ...prev,
                                                        [line.line_id]: value === true,
                                                    }))
                                                }
                                                className="mt-1"
                                            />
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium">
                                                        {line.asset_name}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[10px]"
                                                    >
                                                        {line.stock_mode === "SERIALIZED"
                                                            ? "Serialized"
                                                            : "Pooled"}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[10px] text-amber-700"
                                                    >
                                                        {max} outstanding
                                                    </Badge>
                                                </div>
                                                <p className="font-mono text-[11px] text-muted-foreground">
                                                    Expected {line.expected} · returned{" "}
                                                    {line.returned} · settled{" "}
                                                    {line.settledUnknown ? "—" : line.settled}
                                                </p>
                                                {isChecked && line.stock_mode === "POOLED" && (
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <Label className="font-mono text-[11px] text-muted-foreground">
                                                            Quantity
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={max}
                                                            step={1}
                                                            value={quantities[line.line_id] ?? ""}
                                                            onChange={(event) =>
                                                                setQuantities((prev) => ({
                                                                    ...prev,
                                                                    [line.line_id]:
                                                                        event.target.value,
                                                                }))
                                                            }
                                                            className="h-8 w-24 font-mono text-xs"
                                                        />
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            of {max}
                                                        </span>
                                                    </div>
                                                )}
                                                {isChecked && line.stock_mode === "SERIALIZED" && (
                                                    <p className="font-mono text-[11px] text-muted-foreground">
                                                        {max} unit{max === 1 ? "" : "s"} will be
                                                        written off and marked placed with the
                                                        client.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {outstandingLines.some((l) => l.settledUnknown) && (
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    An earlier decision may already have settled some of these, so a
                                    count here can read high — the server nets them off and refuses
                                    the request naming the true figure.
                                </p>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">REASON</Label>
                                <Select
                                    value={reason}
                                    onValueChange={(value) => setReason(value as WriteOffReason)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REASONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label className="font-mono text-xs">
                                    NOTE (REQUIRED, 5–500 CHARACTERS)
                                </Label>
                                <Textarea
                                    value={note}
                                    onChange={(event) => setNote(event.target.value)}
                                    placeholder="State what was left behind and why it will not be collected."
                                    rows={3}
                                />
                                {/* RL-032/RL-023 — the reason, note, actor and unit list go to an
                                    ADMIN/LOGISTICS-only audit record. The status history receives
                                    a neutral entry and nothing more, and the client is not
                                    notified that its stock was written off. */}
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    Internal — the client is not notified.
                                </p>
                            </div>
                        </div>

                        {quantityError && (
                            <p className="font-mono text-[11px] text-destructive">
                                {quantityError}
                            </p>
                        )}

                        {/* The guard's refusal, and the deliberate way past it.
                            Rendered only after the server has actually refused —
                            an ordinary decision never sees any of this. */}
                        {isOverriding && (
                            <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                                <div className="flex items-start gap-2">
                                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                    <div className="min-w-0 space-y-1">
                                        <p className="font-mono text-xs font-bold text-destructive">
                                            ALREADY COMMITTED TO SOMEBODY ELSE
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Nothing has been written off. These units are held by a
                                            later booking, and writing them off takes them out of
                                            stock for good — the booking below would be broken with
                                            no warning to whoever made it.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {blockedUnits.map((unit) => (
                                        <div
                                            key={`${unit.line_id}-${unit.blocking_booking_id}-${unit.asset_id}`}
                                            className="rounded border bg-background/60 p-2"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium">
                                                    {unit.asset_name}
                                                </span>
                                                {unit.asset_qr_code && (
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[10px]"
                                                    >
                                                        {unit.asset_qr_code}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                Booked on {unit.blocking_parent_human_id} (
                                                {unit.blocking_company_name}) ·{" "}
                                                {formatBookingWindow(
                                                    unit.blocked_from,
                                                    unit.blocked_until
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">
                                        WHY IS THAT BOOKING BEING OVERRIDDEN (REQUIRED,{" "}
                                        {OVERRIDE_REASON_MIN_LENGTH}–{OVERRIDE_REASON_MAX_LENGTH}{" "}
                                        CHARACTERS)
                                    </Label>
                                    <Textarea
                                        value={overrideReason}
                                        maxLength={OVERRIDE_REASON_MAX_LENGTH}
                                        rows={3}
                                        placeholder="State who decided these units are not coming back and what happens to the competing booking."
                                        onChange={(event) => setOverrideReason(event.target.value)}
                                    />
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-mono text-[11px] text-muted-foreground">
                                            Recorded on each unit&apos;s stock history and on the
                                            audit trail.
                                        </p>
                                        <p
                                            className={`shrink-0 font-mono text-[11px] ${
                                                overrideReasonInvalid
                                                    ? "text-destructive"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {overrideReasonTrimmed.length}/
                                            {OVERRIDE_REASON_MAX_LENGTH}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 rounded-md border bg-background/60 p-3">
                                    <Checkbox
                                        id="acknowledge-competing-booking"
                                        checked={overrideAcknowledged}
                                        onCheckedChange={(value) =>
                                            setOverrideAcknowledged(value === true)
                                        }
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="acknowledge-competing-booking"
                                        className="cursor-pointer text-sm font-normal leading-snug"
                                    >
                                        I am overriding{" "}
                                        {blockedUnits.length === 1
                                            ? "another commitment"
                                            : "other commitments"}{" "}
                                        on {blockedUnits.length === 1 ? "this unit" : "these units"}
                                        , and I understand the booking above will no longer be
                                        fulfillable.
                                    </Label>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={!canSubmit}>
                        {isPending
                            ? "Recording..."
                            : isOverriding
                              ? `Override and write off ${units.length} unit${units.length === 1 ? "" : "s"}`
                              : `Write off ${units.length} unit${units.length === 1 ? "" : "s"}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
