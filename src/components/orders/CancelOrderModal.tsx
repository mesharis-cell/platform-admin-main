"use client";

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
import { useCancelOrder } from "@/hooks/use-orders";
import { AlertTriangle } from "lucide-react";

interface CancelOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
    orderIdReadable: string;
    companyName: string;
    currentStatus: string;
    itemCount: number;
    pendingReskinCount?: number;
}

const CANCELLATION_REASONS = [
    { value: "client_requested", label: "Client requested cancellation" },
    { value: "asset_unavailable", label: "Asset availability issue" },
    { value: "pricing_dispute", label: "Pricing dispute" },
    { value: "event_cancelled", label: "Event cancelled" },
    { value: "fabrication_failed", label: "Fabrication/reskin failed" },
    { value: "other", label: "Other (specify below)" },
];

export function CancelOrderModal({
    open,
    onOpenChange,
    orderId,
    orderIdReadable,
    companyName,
    currentStatus,
    itemCount,
    pendingReskinCount = 0,
}: CancelOrderModalProps) {
    const cancelOrder = useCancelOrder();
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
            await cancelOrder.mutateAsync({
                orderId,
                reason,
                notes: notes.trim(),
                notifyClient,
            });
            toast.success("Order cancelled successfully");
            onOpenChange(false);
            setReason("");
            setNotes("");
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel order");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Cancel Order
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">Order:</span>{" "}
                            <span className="font-mono font-semibold">{orderIdReadable}</span>
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
                            <li>Set order status to CANCELLED (terminal)</li>
                            <li>Set financial status to CANCELLED</li>
                            <li>Release all asset bookings ({itemCount} items)</li>
                            {pendingReskinCount > 0 && (
                                <li>
                                    Cancel {pendingReskinCount} pending reskin request
                                    {pendingReskinCount > 1 ? "s" : ""}
                                </li>
                            )}
                            {notifyClient && <li>Notify client of cancellation</li>}
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={cancelOrder.isPending}
                    >
                        Back
                    </Button>
                    <Button
                        onClick={handleCancel}
                        variant="destructive"
                        disabled={cancelOrder.isPending}
                    >
                        {cancelOrder.isPending ? "Cancelling..." : "Cancel Order"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
