"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBulkMargin } from "@/hooks/use-pricing-ledger";
import type { PurposeType } from "@/types/hybrid-pricing";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purposeType: PurposeType;
    entityId: string;
    // F7 quiet-amend (ADMIN + ORDER only): the caller resolved a "Update
    // quietly" choice before opening this dialog. When true, the bulk-margin
    // stamp amends the sent quote in place (no pull-back / QUOTE_REVISED).
    quietAmend?: boolean;
    onDone?: () => void;
}

/**
 * Bulk-margin action dialog. Stamps a single markup % across every BILLABLE
 * non-SYSTEM line as an explicit per-line sell (does NOT change the entity's
 * margin seed). 0% = pass-through (sell = buy).
 */
export function BulkMarginDialog({
    open,
    onOpenChange,
    purposeType,
    entityId,
    quietAmend,
    onDone,
}: Props) {
    const [percent, setPercent] = useState("");
    const [reason, setReason] = useState("");
    const bulkMargin = useBulkMargin(purposeType, entityId);

    const submit = async () => {
        const trimmed = percent.trim();
        const pct = Number(trimmed);
        if (trimmed === "" || !Number.isFinite(pct) || pct < 0) {
            toast.error("Enter a margin % of 0 or greater");
            return;
        }
        try {
            await bulkMargin.mutateAsync({
                marginPercent: pct,
                reason: reason.trim() || undefined,
                quietAmend,
            });
            toast.success(`Applied ${pct}% margin to all billable lines`);
            setPercent("");
            setReason("");
            onOpenChange(false);
            onDone?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to apply bulk margin");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Apply margin to all lines</DialogTitle>
                    <DialogDescription>
                        Stamps a per-unit sell on every billable line as{" "}
                        <span className="font-mono">buy × (1 + margin%)</span>. This overwrites
                        existing per-line sell overrides. 0% makes every line pass-through (sell =
                        buy). The entity&apos;s default margin is unchanged.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Margin %</Label>
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={percent}
                            placeholder="e.g. 25"
                            onChange={(e) => setPercent(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !bulkMargin.isPending) {
                                    e.preventDefault();
                                    void submit();
                                }
                            }}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Reason (optional)</Label>
                        <Textarea
                            rows={2}
                            value={reason}
                            placeholder="Recorded on the pricing audit trail"
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={bulkMargin.isPending}>
                        {bulkMargin.isPending ? "Applying…" : "Apply margin"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
