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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useListServiceTypes } from "@/hooks/use-service-types";
import { useCreateCatalogLineItem } from "@/hooks/use-order-line-items";

interface AddCatalogLineItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetId: string;
    purposeType?: "ORDER" | "INBOUND_REQUEST";
}

export function AddCatalogLineItemModal({
    open,
    onOpenChange,
    targetId,
    purposeType = "ORDER",
}: AddCatalogLineItemModalProps) {
    const { data: serviceTypes } = useListServiceTypes({});
    const createLineItem = useCreateCatalogLineItem(targetId, purposeType);

    const [serviceTypeId, setServiceTypeId] = useState("");
    const [quantity, setQuantity] = useState<number | string>(1);
    const [notes, setNotes] = useState("");

    const selectedService = serviceTypes?.data?.find((s: any) => s.id === serviceTypeId);

    const handleServiceChange = (id: string) => {
        setServiceTypeId(id);
        setQuantity(1);
    };

    const handleAdd = async () => {
        const qty = Number(quantity);

        if (!serviceTypeId || isNaN(qty) || qty <= 0) {
            toast.error("Please select a service and enter a valid quantity");
            return;
        }

        try {
            await createLineItem.mutateAsync({
                service_type_id: serviceTypeId,
                quantity: qty,
                notes: notes || undefined,
            });
            toast.success("Service line item added");
            onOpenChange(false);
            setServiceTypeId("");
            setQuantity(1);
            setNotes("");
        } catch (error: any) {
            toast.error(error.message || "Failed to add line item");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Service Line Item</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>
                            Service <span className="text-destructive">*</span>
                        </Label>
                        <Select value={serviceTypeId} onValueChange={handleServiceChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select service..." />
                            </SelectTrigger>
                            <SelectContent>
                                {serviceTypes?.data?.map((service: any) => (
                                    <SelectItem key={service.id} value={service.id}>
                                        {service.name} ({service.unit})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedService && (
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <p>
                                <strong>Category:</strong> {selectedService.category}
                            </p>
                            <p>
                                <strong>Unit:</strong> {selectedService.unit} (
                                {selectedService.default_rate} AED)
                                <br />
                                <strong>Total Price:</strong>{" "}
                                {selectedService.default_rate * Number(quantity)}
                            </p>
                        </div>
                    )}

                    <div>
                        <Label>
                            Quantity <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            type="number"
                            step="1"
                            // min="1
                            value={quantity}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                    setQuantity("");
                                } else {
                                    setQuantity(Number(val));
                                }
                            }}
                            placeholder="4"
                        />
                    </div>

                    <div>
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createLineItem.isPending}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleAdd} disabled={createLineItem.isPending}>
                        {createLineItem.isPending ? "Adding..." : "Add Line Item"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
