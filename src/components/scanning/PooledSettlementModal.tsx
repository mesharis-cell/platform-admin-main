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

export interface UnsettledLine {
    line_id: string;
    asset_id: string;
    asset_name: string;
    outbound_qty: number;
    scanned_qty: number;
    delta: number;
}

export interface SettlementEntry {
    line_id: string;
    returned_quantity: number;
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

function buildInitialSettlements(unsettledLines: UnsettledLine[]) {
    const initial: Record<
        string,
        { write_off_reason: SettlementEntry["write_off_reason"]; note: string }
    > = {};
    unsettledLines.forEach((line) => {
        initial[line.line_id] = {
            write_off_reason: "CONSUMED",
            note: "",
        };
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
    const [settlements, setSettlements] = useState<
        Record<string, { write_off_reason: SettlementEntry["write_off_reason"]; note: string }>
    >(() => buildInitialSettlements(unsettledLines));

    useEffect(() => {
        if (open) setSettlements(buildInitialSettlements(unsettledLines));
    }, [open, unsettledLines]);

    const handleConfirm = () => {
        const entries: SettlementEntry[] = unsettledLines.map((line) => ({
            line_id: line.line_id,
            returned_quantity: line.scanned_qty,
            write_off_reason: settlements[line.line_id]?.write_off_reason || "CONSUMED",
            note: settlements[line.line_id]?.note || undefined,
        }));
        onConfirm(entries);
    };

    const hasOtherWithoutNote = unsettledLines.some(
        (line) =>
            settlements[line.line_id]?.write_off_reason === "OTHER" &&
            !settlements[line.line_id]?.note?.trim()
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Pooled Items Settlement
                    </DialogTitle>
                    <DialogDescription>
                        The following pooled items were not fully returned. Please confirm the
                        reason for each shortfall to complete the return scan.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {unsettledLines.map((line) => (
                        <div key={line.line_id} className="space-y-3 rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                                <p className="font-medium">{line.asset_name}</p>
                                <Badge variant="outline" className="text-amber-700">
                                    {Math.abs(line.delta)} short
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Out: {line.outbound_qty} | Back: {line.scanned_qty} | Delta:{" "}
                                {line.delta}
                            </div>

                            <div className="space-y-2">
                                <Label>Reason</Label>
                                <Select
                                    value={settlements[line.line_id]?.write_off_reason}
                                    onValueChange={(value) =>
                                        setSettlements((prev) => ({
                                            ...prev,
                                            [line.line_id]: {
                                                ...prev[line.line_id],
                                                write_off_reason:
                                                    value as SettlementEntry["write_off_reason"],
                                            },
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SETTLEMENT_REASONS.map((reason) => (
                                            <SelectItem key={reason.value} value={reason.value}>
                                                {reason.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    Note
                                    {settlements[line.line_id]?.write_off_reason === "OTHER"
                                        ? " (required)"
                                        : " (optional)"}
                                </Label>
                                <Textarea
                                    placeholder="Add details about the shortfall..."
                                    value={settlements[line.line_id]?.note || ""}
                                    onChange={(event) =>
                                        setSettlements((prev) => ({
                                            ...prev,
                                            [line.line_id]: {
                                                ...prev[line.line_id],
                                                note: event.target.value,
                                            },
                                        }))
                                    }
                                    rows={2}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={isPending || hasOtherWithoutNote}>
                        {isPending ? "Settling..." : "Confirm & Close"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
