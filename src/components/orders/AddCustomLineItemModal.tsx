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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateCustomLineItem } from "@/hooks/use-order-line-items";
import type { ServiceCategory } from "@/types/hybrid-pricing";

interface AddCustomLineItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
}

export function AddCustomLineItemModal({
    open,
    onOpenChange,
    orderId,
}: AddCustomLineItemModalProps) {
    const createLineItem = useCreateCustomLineItem(orderId);

    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ServiceCategory>("OTHER");
    const [total, setTotal] = useState("");
    const [notes, setNotes] = useState("");

    const handleAdd = async () => {
        if (!description.trim()) {
            toast.error("Please enter a description");
            return;
        }

        const totalNum = parseFloat(total);
        if (isNaN(totalNum) || totalNum <= 0) {
            toast.error("Please enter a valid total amount");
            return;
        }

        try {
            await createLineItem.mutateAsync({
                description: description.trim(),
                category,
                total: totalNum,
                notes: notes || undefined,
            });
            toast.success("Custom line item added");
            onOpenChange(false);
            setDescription("");
            setCategory("OTHER");
            setTotal("");
            setNotes("");
        } catch (error: any) {
            toast.error(error.message || "Failed to add line item");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Custom Line Item</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>
                            Description <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Rush Design Fee, Special Packaging"
                            maxLength={200}
                        />
                    </div>

                    <div>
                        <Label>
                            Total Amount (AED) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={total}
                            onChange={(e) => setTotal(e.target.value)}
                            placeholder="200.00"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Enter final amount (custom items are not subject to margin)
                        </p>
                    </div>

                    <div>
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Internal notes..."
                            rows={2}
                        />
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                        <p className="text-xs text-primary">
                            ℹ️ Custom items are entered as final amounts. The margin you've included
                            in this price will NOT have platform margin applied again.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleAdd} disabled={createLineItem.isPending}>
                        {createLineItem.isPending ? "Adding..." : "Add Custom Item"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
