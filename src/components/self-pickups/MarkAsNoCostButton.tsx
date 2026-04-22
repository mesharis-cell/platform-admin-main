"use client";

/**
 * Mark as No-Cost button + confirm dialog.
 *
 * Shape is entity-agnostic on purpose — `entityType` prop is currently only
 * "SELF_PICKUP" but when orders / inbound requests / service requests get
 * their own `pricing_mode` column, wire a switch on entityType to the right
 * hook here. The dialog copy + UX stays identical across entities (see plan
 * SP6; cross-entity extension notes in "Out of scope" section).
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { useMarkSelfPickupNoCost } from "@/hooks/use-self-pickups";

type Entity = "SELF_PICKUP"; // future: | "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST"

interface MarkAsNoCostButtonProps {
    entityType: Entity;
    entityId: string;
    entityIdReadable: string;
    onSuccess?: () => void;
}

export function MarkAsNoCostButton({
    entityType,
    entityId,
    entityIdReadable,
    onSuccess,
}: MarkAsNoCostButtonProps) {
    const [open, setOpen] = useState(false);
    const selfPickupHook = useMarkSelfPickupNoCost();

    // Route to the right hook per entity. One branch for now; extend when
    // other entities land. Keeping the hook call inside a switch avoids
    // conditional hook calls.
    const hook = entityType === "SELF_PICKUP" ? selfPickupHook : selfPickupHook;

    const handleConfirm = async () => {
        try {
            await hook.mutateAsync(entityId);
            toast.success(`${entityIdReadable} marked as no-cost`);
            setOpen(false);
            onSuccess?.();
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to mark as no-cost");
        }
    };

    return (
        <>
            <Button
                variant="outline"
                onClick={() => setOpen(true)}
                className="gap-2 border-neutral-400/60 text-neutral-700 hover:bg-neutral-100"
            >
                <CircleDollarSign className="h-4 w-4" />
                Approve as No-Cost
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CircleDollarSign className="h-5 w-5 text-neutral-500" />
                            Approve as No-Cost
                        </DialogTitle>
                        <DialogDescription>
                            Waive pricing on this pickup and confirm it immediately.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-sm">
                        <p>
                            <span className="font-mono font-semibold">{entityIdReadable}</span> will
                            be confirmed at no cost:
                        </p>
                        <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                            <li>All existing line items will be voided.</li>
                            <li>Pricing breakdown will be zeroed.</li>
                            <li>
                                Status will jump directly to <strong>CONFIRMED</strong> — no client
                                quote approval required.
                            </li>
                            <li>The client will be notified.</li>
                        </ul>
                        <p className="font-semibold text-destructive pt-2">
                            This cannot be undone. If marked in error, cancel + resubmit.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={hook.isPending}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm} disabled={hook.isPending}>
                            {hook.isPending ? "Marking…" : "Yes, Approve as No-Cost"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
