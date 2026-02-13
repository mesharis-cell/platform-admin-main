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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useProcessReskinRequest } from "@/hooks/use-reskin-requests";

interface ProcessReskinModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
    orderItemId: string;
    originalAssetName: string;
    targetBrandName: string;
    clientNotes: string;
}

export function ProcessReskinModal({
    open,
    onOpenChange,
    orderId,
    orderItemId,
    originalAssetName,
    targetBrandName,
    clientNotes,
}: ProcessReskinModalProps) {
    const processReskin = useProcessReskinRequest(orderId);
    const [cost, setCost] = useState("");
    const [adminNotes, setAdminNotes] = useState("");

    const handleProcess = async () => {
        const costNum = parseFloat(cost);
        if (isNaN(costNum) || costNum <= 0) {
            toast.error("Please enter a valid cost");
            return;
        }

        try {
            await processReskin.mutateAsync({
                orderItemId,
                data: {
                    cost: costNum,
                    admin_notes: adminNotes || undefined,
                },
            });
            toast.success("Reskin request processed and cost line item added");
            onOpenChange(false);
            setCost("");
            setAdminNotes("");
        } catch (error: any) {
            toast.error(error.message || "Failed to process reskin request");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-2">
                <DialogHeader className="px-2 py-4 bg-muted/50 border-b border-border">
                    <DialogTitle className="font-mono text-sm uppercase tracking-widest">
                        Process Rebrand Request
                    </DialogTitle>
                </DialogHeader>

                <div className="px-4 space-y-6 font-mono">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground uppercase text-[10px]">
                                Original Asset
                            </span>
                            <span className="font-bold">{originalAssetName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground uppercase text-[10px]">
                                Target Brand
                            </span>
                            <span className="font-bold">{targetBrandName}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="uppercase text-[10px] text-muted-foreground">
                            Client Instructions
                        </Label>
                        <div className="p-4 bg-muted/30 border border-border rounded italic text-sm leading-relaxed">
                            "{clientNotes}"
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                                Rebrand Base Cost (Buy) <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={cost}
                                    onChange={(e) => setCost(e.target.value)}
                                    placeholder="1,500.00"
                                    className="pl-3 pr-12 font-bold text-lg h-12 border-primary/20 focus-visible:ring-primary/30"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                    AED
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">
                                (Margin will be applied during quote calculation)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] text-muted-foreground">
                                Internal Notes (Optional)
                            </Label>
                            <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Using ABC Fabricators, est. 5 days"
                                className="text-sm bg-muted/10"
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-md p-4 space-y-2">
                        <p className="text-[10px] font-bold text-primary flex items-center gap-2">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[8px]">
                                i
                            </span>
                            THIS WILL:
                        </p>
                        <ul className="text-[10px] space-y-1 text-muted-foreground ml-6 list-disc">
                            <li>Create a formal reskin tracking record</li>
                            <li>
                                Add "{originalAssetName} Rebrand" line item ({cost || "1,500.00"}{" "}
                                AED)
                            </li>
                            <li>Order will enter AWAITING_FABRICATION after confirm</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 gap-2 bg-muted/30 border-t border-border">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-mono text-xs uppercase tracking-wider"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleProcess}
                        disabled={processReskin.isPending || !cost}
                        className="font-mono text-xs uppercase tracking-wider px-6"
                    >
                        {processReskin.isPending ? "Processing..." : "Process & Add to Quote"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
