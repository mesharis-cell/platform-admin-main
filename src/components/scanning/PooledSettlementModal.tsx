"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

/**
 * RL-018 — a missing SERIALIZED unit no longer blocks closure forever.
 *
 * The completion endpoint's 409 payload (`requires_settlement`) gained two
 * additive fields: `stock_mode` and, for serialized lines, `missing_units`. This
 * modal renders one row per pooled line exactly as it always did, and one row
 * PER MISSING UNIT for a serialized line — each with its own reason and note,
 * because RL-018 requires an individual disposition per unit.
 *
 * The payload shape is unchanged: nothing was renamed and no compatibility layer
 * exists. An entry carrying `asset_id` is a serialized settlement of exactly one
 * unit and carries no `returned_quantity`; an entry without it is pooled and
 * behaves exactly as it does today. `stock_mode` is optional on the wire so an
 * older API (which sends neither field) falls through to the pooled rendering
 * rather than crashing.
 */
export interface UnsettledLine {
    line_id: string;
    asset_id: string;
    asset_name: string;
    outbound_qty: number;
    scanned_qty: number;
    delta: number;
    /** Absent on a pre-release API read — treated as POOLED, the old behaviour. */
    stock_mode?: "SERIALIZED" | "POOLED";
    /** Serialized lines only: how many individual units are still missing. */
    missing_units?: number;
}

export interface SettlementEntry {
    line_id: string;
    /** Pooled only. Meaningless on a serialized entry and omitted there. */
    returned_quantity?: number;
    /** Present ⇒ serialized settlement of exactly ONE unit. */
    asset_id?: string;
    write_off_reason: "CONSUMED" | "LOST" | "DAMAGED" | "OTHER";
    note?: string;
}

interface PooledSettlementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unsettledLines: UnsettledLine[];
    onConfirm: (settlements: SettlementEntry[]) => void;
    isPending?: boolean;
}

const SETTLEMENT_REASONS = [
    { value: "CONSUMED", label: "Consumed on event" },
    { value: "LOST", label: "Lost / unaccounted" },
    { value: "DAMAGED", label: "Damaged / write-off" },
    { value: "OTHER", label: "Other" },
] as const;

type Reason = SettlementEntry["write_off_reason"];

/**
 * RL-018 fixes the controls as "the mandatory reason, the mandatory note on
 * CONSUMED and LOST". OTHER already required one here. DAMAGED is the single
 * reason that speaks for itself.
 */
const REASONS_REQUIRING_NOTE: Reason[] = ["CONSUMED", "LOST", "OTHER"];

/** Matches the API's `settlementEntrySchema`, so an accepted note is never 400'd. */
const MIN_NOTE_LENGTH = 5;

function isSerialized(line: UnsettledLine): boolean {
    return line.stock_mode === "SERIALIZED";
}

/** How many disposition rows this unsettled line contributes. */
function rowCountFor(line: UnsettledLine): number {
    if (!isSerialized(line)) return 1;
    // `missing_units` is authoritative; `delta` is its negative. Never render
    // zero rows for a serialized line the server said is outstanding.
    return Math.max(1, line.missing_units ?? Math.abs(line.delta) ?? 1);
}

interface RowState {
    write_off_reason: Reason;
    note: string;
}

/** Stable key per disposition row: pooled lines get one, serialized get N. */
function rowKey(line: UnsettledLine, index: number): string {
    return isSerialized(line) ? `${line.line_id}:${line.asset_id}:${index}` : line.line_id;
}

function buildInitialRows(unsettledLines: UnsettledLine[]): Record<string, RowState> {
    const initial: Record<string, RowState> = {};
    unsettledLines.forEach((line) => {
        for (let i = 0; i < rowCountFor(line); i++) {
            initial[rowKey(line, i)] = { write_off_reason: "CONSUMED", note: "" };
        }
    });
    return initial;
}

export function PooledSettlementModal({
    open,
    onOpenChange,
    unsettledLines,
    onConfirm,
    isPending,
}: PooledSettlementModalProps) {
    const [rows, setRows] = useState<Record<string, RowState>>(() =>
        buildInitialRows(unsettledLines)
    );

    useEffect(() => {
        if (open) setRows(buildInitialRows(unsettledLines));
    }, [open, unsettledLines]);

    const updateRow = (key: string, patch: Partial<RowState>) =>
        setRows((prev) => ({
            ...prev,
            [key]: { write_off_reason: "CONSUMED", note: "", ...prev[key], ...patch },
        }));

    const handleConfirm = () => {
        const entries: SettlementEntry[] = [];
        unsettledLines.forEach((line) => {
            const count = rowCountFor(line);
            for (let i = 0; i < count; i++) {
                const state = rows[rowKey(line, i)];
                const reason = state?.write_off_reason || "CONSUMED";
                const note = state?.note?.trim() || undefined;
                if (isSerialized(line)) {
                    // One entry per missing unit, carrying asset_id and NO
                    // returned_quantity — the unit either came back and was
                    // scanned or it did not.
                    entries.push({
                        line_id: line.line_id,
                        asset_id: line.asset_id,
                        write_off_reason: reason,
                        note,
                    });
                } else {
                    entries.push({
                        line_id: line.line_id,
                        returned_quantity: line.scanned_qty,
                        write_off_reason: reason,
                        note,
                    });
                }
            }
        });
        onConfirm(entries);
    };

    const hasMissingNote = unsettledLines.some((line) => {
        const count = rowCountFor(line);
        for (let i = 0; i < count; i++) {
            const state = rows[rowKey(line, i)];
            const reason = state?.write_off_reason || "CONSUMED";
            if (
                REASONS_REQUIRING_NOTE.includes(reason) &&
                (state?.note ?? "").trim().length < MIN_NOTE_LENGTH
            )
                return true;
        }
        return false;
    });

    const serializedCount = unsettledLines
        .filter(isSerialized)
        .reduce((sum, line) => sum + rowCountFor(line), 0);

    const renderDisposition = (line: UnsettledLine, index: number) => {
        const key = rowKey(line, index);
        const state = rows[key];
        const reason = state?.write_off_reason || "CONSUMED";
        const noteRequired = REASONS_REQUIRING_NOTE.includes(reason);
        return (
            <div key={key} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <p className="font-medium">
                        {line.asset_name}
                        {isSerialized(line) && rowCountFor(line) > 1 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                                unit {index + 1} of {rowCountFor(line)}
                            </span>
                        )}
                    </p>
                    <Badge variant="outline" className="text-amber-700">
                        {isSerialized(line) ? "1 unit missing" : `${Math.abs(line.delta)} short`}
                    </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                    {isSerialized(line) ? (
                        <>
                            Serialized • Out: {line.outbound_qty} | Back: {line.scanned_qty} |
                            Missing: {rowCountFor(line)}
                        </>
                    ) : (
                        <>
                            Pooled • Out: {line.outbound_qty} | Back: {line.scanned_qty} | Delta:{" "}
                            {line.delta}
                        </>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Reason</Label>
                    <Select
                        value={reason}
                        onValueChange={(value) =>
                            updateRow(key, { write_off_reason: value as Reason })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SETTLEMENT_REASONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>
                        Note
                        {noteRequired
                            ? ` (required — at least ${MIN_NOTE_LENGTH} characters)`
                            : " (optional)"}
                    </Label>
                    <Textarea
                        placeholder="Add details about the shortfall..."
                        value={state?.note || ""}
                        onChange={(event) => updateRow(key, { note: event.target.value })}
                        rows={2}
                    />
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Settle Outstanding Items
                    </DialogTitle>
                    <DialogDescription>
                        The following items were not fully returned. Confirm a reason for each
                        shortfall to complete the return scan. Settlement is terminal: the unit
                        leaves the platform&apos;s custody record and its asset row is marked as
                        placed with the client.
                    </DialogDescription>
                </DialogHeader>

                {serializedCount > 0 && (
                    <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800">
                        {serializedCount} serialized unit{serializedCount === 1 ? "" : "s"} need
                        {serializedCount === 1 ? "s" : ""} an individual disposition. A unit that is
                        still expected back should NOT be settled — leave the load open and complete
                        it on a later visit instead.
                    </p>
                )}

                <div className="space-y-6 py-4">
                    {unsettledLines.flatMap((line) =>
                        Array.from({ length: rowCountFor(line) }, (_, index) =>
                            renderDisposition(line, index)
                        )
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={isPending || hasMissingNote}>
                        {isPending ? "Settling..." : "Confirm & Close"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
