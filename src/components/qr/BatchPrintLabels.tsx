"use client";

import { useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { printLabels } from "@/lib/label-renderer";
import {
    LABEL_SIZES,
    getPreferredLabelSize,
    setPreferredLabelSize,
    type LabelData,
} from "@/lib/label-config";

interface BatchPrintLabelsProps {
    labels: LabelData[];
    buttonLabel?: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    disabled?: boolean;
}

export function BatchPrintLabels({
    labels,
    buttonLabel,
    variant = "outline",
    size = "sm",
    className,
    disabled = false,
}: BatchPrintLabelsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [selectedSize, setSelectedSize] = useState<string>(getPreferredLabelSize);

    const labelCount = labels.length;
    const currentLabelSize = LABEL_SIZES[selectedSize] || LABEL_SIZES["50x30"];

    if (labelCount === 0) return null;

    const handlePrint = async () => {
        setIsPrinting(true);
        setPreferredLabelSize(selectedSize);

        try {
            await printLabels(labels, { labelSize: currentLabelSize });
            toast.success(`Sent ${labelCount} label${labelCount > 1 ? "s" : ""} to printer`);
            setIsOpen(false);
        } catch (error) {
            if (error instanceof Error && error.message === "popup_blocked")
                toast.error("Please allow pop-ups to print QR labels");
            else toast.error("Failed to print labels");
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <>
            <Button
                type="button"
                variant={variant}
                size={size}
                className={className}
                onClick={() => setIsOpen(true)}
                disabled={disabled || labelCount === 0}
            >
                <Printer className="h-4 w-4 mr-2" />
                {buttonLabel || `Print ${labelCount} Label${labelCount > 1 ? "s" : ""}`}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-mono">Print QR Labels</DialogTitle>
                        <DialogDescription>
                            {labelCount} label{labelCount > 1 ? "s" : ""} will be sent to your
                            printer. Select the label size that matches your loaded label stock.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Label Size</label>
                            <Select value={selectedSize} onValueChange={setSelectedSize}>
                                <SelectTrigger className="font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(LABEL_SIZES).map((ls) => (
                                        <SelectItem key={ls.id} value={ls.id} className="font-mono">
                                            {ls.name}
                                            <span className="text-muted-foreground ml-2">
                                                ({ls.orientation})
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Preview</label>
                            <div className="border rounded-lg p-3 bg-muted/30 max-h-40 overflow-y-auto">
                                {labels.slice(0, 5).map((label, i) => (
                                    <div
                                        key={label.qrCode + i}
                                        className="flex items-center gap-2 text-xs font-mono py-1"
                                    >
                                        <span className="text-muted-foreground w-6 text-right shrink-0">
                                            {i + 1}.
                                        </span>
                                        <span className="font-semibold truncate">{label.assetName}</span>
                                        <span className="text-muted-foreground truncate">{label.qrCode}</span>
                                    </div>
                                ))}
                                {labelCount > 5 && (
                                    <div className="text-xs text-muted-foreground font-mono pt-1 pl-8">
                                        + {labelCount - 5} more…
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Make sure your printer has{" "}
                            <span className="font-mono font-semibold">{currentLabelSize.name}</span>{" "}
                            labels loaded. Your size preference will be remembered.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isPrinting}>
                            Cancel
                        </Button>
                        <Button onClick={handlePrint} disabled={isPrinting}>
                            {isPrinting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating…
                                </>
                            ) : (
                                <>
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print {labelCount} Label{labelCount > 1 ? "s" : ""}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
