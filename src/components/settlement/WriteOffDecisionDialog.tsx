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
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import type {
    WriteOffDecisionPayload,
    WriteOffDecisionUnit,
    WriteOffReason,
} from "@/hooks/use-write-off-decision";

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
    onConfirm: (payload: WriteOffDecisionPayload) => void;
}

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

    const outstandingLines = useMemo(
        () => lines.filter((line) => outstandingOf(line) > 0),
        [lines]
    );

    useEffect(() => {
        if (!open) return;
        setReason("CONSUMED");
        setNote("");
        setSelected({});
        setQuantities(
            Object.fromEntries(outstandingLines.map((l) => [l.line_id, String(outstandingOf(l))]))
        );
    }, [open, outstandingLines]);

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
    const canSubmit =
        !isPending && !blockedReason && units.length > 0 && !quantityError && !noteInvalid;

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm({ reason, note: noteTrimmed, units });
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
                            : `Write off ${units.length} unit${units.length === 1 ? "" : "s"}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
