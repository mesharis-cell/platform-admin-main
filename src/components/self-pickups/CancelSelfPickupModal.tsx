"use client";

/**
 * Cancel Self-Pickup Modal.
 * Direct port of components/orders/CancelOrderModal.tsx. Identical layout,
 * same dialog width, same reason radio group, same notes + notify-client
 * treatment. Reasons adapted to self-pickup context (no event_cancelled
 * or fabrication_failed — those are order-specific).
 * See SP4 in .claude/plans/tender-knitting-avalanche.md.
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useCancelSelfPickup } from "@/hooks/use-self-pickups";
import { AlertTriangle } from "lucide-react";

interface CancelSelfPickupModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selfPickupId: string;
    selfPickupIdReadable: string;
    companyName: string;
    currentStatus: string;
    itemCount: number;
}

const CANCELLATION_REASONS = [
    { value: "client_requested", label: "Client requested cancellation" },
    { value: "asset_unavailable", label: "Asset availability issue" },
    { value: "pricing_dispute", label: "Pricing dispute" },
    { value: "pickup_window_missed", label: "Pickup window missed" },
    { value: "other", label: "Other (specify below)" },
];

export function CancelSelfPickupModal({
    open,
    onOpenChange,
    selfPickupId,
    selfPickupIdReadable,
    companyName,
    currentStatus,
    itemCount,
}: CancelSelfPickupModalProps) {
    const cancelSelfPickup = useCancelSelfPickup();
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [notifyClient, setNotifyClient] = useState(true);

    const handleCancel = async () => {
        if (!reason) {
            toast.error("Please select a cancellation reason");
            return;
        }

        if (!notes.trim()) {
            toast.error("Please provide additional notes");
            return;
        }

        try {
            await cancelSelfPickup.mutateAsync({
                id: selfPickupId,
                reason,
                notes: notes.trim(),
                notifyClient,
            });
            toast.success("Self-pickup cancelled successfully");
            onOpenChange(false);
            setReason("");
            setNotes("");
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to cancel self-pickup");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Cancel Self-Pickup
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">Pickup:</span>{" "}
                            <span className="font-mono font-semibold">{selfPickupIdReadable}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Client:</span>{" "}
                            <span className="font-semibold">{companyName}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Current Status:</span>{" "}
                            <span className="font-semibold">{currentStatus}</span>
                        </div>
                    </div>

                    <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                        <p className="text-sm font-semibold text-destructive mb-1">
                            ⚠️ This action cannot be undone.
                        </p>
                    </div>

                    <div>
                        <Label className="mb-2 block">
                            Cancellation Reason <span className="text-destructive">*</span>
                        </Label>
                        <RadioGroup value={reason} onValueChange={setReason}>
                            <div className="space-y-2">
                                {CANCELLATION_REASONS.map((r) => (
                                    <div key={r.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={r.value} id={r.value} />
                                        <Label
                                            htmlFor={r.value}
                                            className="cursor-pointer font-normal"
                                        >
                                            {r.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </RadioGroup>
                    </div>

                    <div>
                        <Label htmlFor="notes">
                            Additional Notes (visible to client){" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Provide details about the cancellation..."
                            rows={4}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="notifyClient"
                            checked={notifyClient}
                            onCheckedChange={(checked) => setNotifyClient(checked as boolean)}
                        />
                        <Label htmlFor="notifyClient" className="cursor-pointer font-normal">
                            Notify client via email
                        </Label>
                    </div>

                    <div className="border-t border-border pt-3">
                        <p className="text-sm font-semibold mb-2">This will:</p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                            <li>Set pickup status to CANCELLED (terminal)</li>
                            <li>Set financial status to CANCELLED</li>
                            <li>Release all asset bookings ({itemCount} items)</li>
                            {notifyClient && <li>Notify client of cancellation</li>}
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={cancelSelfPickup.isPending}
                    >
                        Back
                    </Button>
                    <Button
                        onClick={handleCancel}
                        variant="destructive"
                        disabled={cancelSelfPickup.isPending}
                    >
                        {cancelSelfPickup.isPending ? "Cancelling..." : "Cancel Pickup"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
