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
import { toast } from "sonner";
import { useCancelReskinRequest } from "@/hooks/use-reskin-requests";

interface CancelReskinModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reskinId: string;
    orderId: string;
    originalAssetName: string;
    targetBrandName: string;
    costAmount: number;
}

export function CancelReskinModal({
    open,
    onOpenChange,
    reskinId,
    orderId,
    originalAssetName,
    targetBrandName,
    costAmount,
}: CancelReskinModalProps) {
    const cancelReskin = useCancelReskinRequest();
    const [reason, setReason] = useState("");
    const [orderAction, setOrderAction] = useState<"continue" | "cancel_order">("continue");

    const handleCancel = async () => {
        if (!reason.trim() || reason.trim().length < 10) {
            toast.error("Please provide a cancellation reason (min 10 characters)");
            return;
        }

        try {
            await cancelReskin.mutateAsync({
                reskinId,
                orderId,
                data: {
                    cancellationReason: reason.trim(),
                    orderAction,
                },
            });
            toast.success(
                orderAction === "continue"
                    ? "Reskin cancelled. Order will continue with original asset."
                    : "Reskin cancelled. Order cancellation initiated."
            );
            onOpenChange(false);
            setReason("");
            setOrderAction("continue");
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel reskin");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Cancel Reskin Request</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
                        <div>
                            <span className="text-muted-foreground">Asset:</span>{" "}
                            <span className="font-semibold">{originalAssetName}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Target Brand:</span>{" "}
                            <span className="font-semibold">{targetBrandName}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Cost Line Item:</span>{" "}
                            <span className="font-mono font-semibold">
                                {costAmount.toFixed(2)} AED
                            </span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="reason">
                            Cancellation Reason <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Fabrication not feasible, timeline too tight, client changed mind..."
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Minimum 10 characters</p>
                    </div>

                    <div>
                        <Label className="mb-3 block">
                            What happens to the order? <span className="text-destructive">*</span>
                        </Label>
                        <RadioGroup
                            value={orderAction}
                            onValueChange={(v: any) => setOrderAction(v)}
                        >
                            <div className="flex items-start space-x-2 p-3 border border-border rounded-md">
                                <RadioGroupItem value="continue" id="continue" className="mt-1" />
                                <Label htmlFor="continue" className="flex-1 cursor-pointer">
                                    <div>
                                        <p className="font-semibold">
                                            Continue with original asset
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Order will proceed with "{originalAssetName}". Quote
                                            will be revised and client must acknowledge.
                                        </p>
                                    </div>
                                </Label>
                            </div>

                            <div className="flex items-start space-x-2 p-3 border border-border rounded-md">
                                <RadioGroupItem
                                    value="cancel_order"
                                    id="cancel_order"
                                    className="mt-1"
                                />
                                <Label htmlFor="cancel_order" className="flex-1 cursor-pointer">
                                    <div>
                                        <p className="font-semibold">Cancel entire order</p>
                                        <p className="text-sm text-muted-foreground">
                                            Order will be cancelled and client will be notified.
                                        </p>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 dark:border-primary/80 rounded-md p-3">
                        <p className="text-xs text-primary dark:text-primary/80">
                            The {costAmount.toFixed(2)} AED line item will be voided and removed
                            from the quote.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={cancelReskin.isPending}
                    >
                        Back
                    </Button>
                    <Button
                        onClick={handleCancel}
                        variant="destructive"
                        disabled={cancelReskin.isPending}
                    >
                        {cancelReskin.isPending ? "Cancelling..." : "Cancel Reskin"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
