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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMarkNoCost } from "@/hooks/use-pricing-ledger";
import type { PurposeType } from "@/types/hybrid-pricing";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purposeType: PurposeType;
    entityId: string;
    onDone?: () => void;
}

// SR's no-cost gesture is the concession route, which REQUIRES a reason (min 10
// chars, API-validated). The other three entities ignore the body, so the field
// is optional there.
export function NoCostDialog({ open, onOpenChange, purposeType, entityId, onDone }: Props) {
    const [reason, setReason] = useState("");
    const markNoCost = useMarkNoCost(purposeType, entityId);
    const reasonRequired = purposeType === "SERVICE_REQUEST";

    const submit = async () => {
        if (reasonRequired && reason.trim().length < 10) {
            toast.error("A reason of at least 10 characters is required");
            return;
        }
        try {
            await markNoCost.mutateAsync({ reason: reason.trim() || undefined });
            toast.success("Marked as no-cost");
            setReason("");
            onOpenChange(false);
            onDone?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to mark as no-cost");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mark as no-cost</DialogTitle>
                    <DialogDescription>
                        Zeroes the entire breakdown and locks all pricing. This is a one-way
                        transition — line items are voided and the client sees a zero total. It
                        cannot be undone from here.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-1 py-2">
                    <Label className="text-xs">Reason{reasonRequired ? "" : " (optional)"}</Label>
                    <Textarea
                        rows={3}
                        value={reason}
                        placeholder={
                            reasonRequired
                                ? "Required — recorded on the audit trail (min 10 chars)"
                                : "Recorded on the audit trail"
                        }
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={submit} disabled={markNoCost.isPending}>
                        {markNoCost.isPending ? "Applying…" : "Mark as no-cost"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
