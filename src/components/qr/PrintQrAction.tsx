"use client";

import { useState, type ComponentProps, type MouseEvent } from "react";
import { Printer, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { printLabel } from "@/lib/label-renderer";
import {
    LABEL_SIZES,
    getPreferredLabelSize,
    setPreferredLabelSize,
} from "@/lib/label-config";

type ButtonProps = ComponentProps<typeof Button>;

interface PrintQrActionProps {
    qrCode?: string | null;
    assetName?: string;
    /** Optional extra line on the label (e.g. brand, category) */
    meta?: string;
    className?: string;
    variant?: ButtonProps["variant"];
    size?: ButtonProps["size"];
    iconOnly?: boolean;
    /** If true, show the label size dropdown. Default: false for icon-only, true otherwise */
    showSizeSelector?: boolean;
}

export function PrintQrAction({
    qrCode,
    assetName,
    meta,
    className,
    variant = "ghost",
    size = "icon",
    iconOnly = true,
    showSizeSelector,
}: PrintQrActionProps) {
    const [isPrinting, setIsPrinting] = useState(false);
    const [selectedSize, setSelectedSize] = useState<string>(getPreferredLabelSize);

    const shouldShowSelector = showSizeSelector ?? !iconOnly;

    if (!qrCode) return null;

    const currentLabelSize = LABEL_SIZES[selectedSize] || LABEL_SIZES["50x30"];

    const handlePrint = async (e?: MouseEvent<HTMLButtonElement>) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIsPrinting(true);

        try {
            await printLabel(
                { qrCode, assetName: assetName || "Asset", meta },
                { labelSize: currentLabelSize },
            );
        } catch (error) {
            if (error instanceof Error && error.message === "popup_blocked")
                toast.error("Please allow pop-ups to print QR labels");
            else toast.error("Failed to print QR label");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleSizeChange = (sizeId: string) => {
        setSelectedSize(sizeId);
        setPreferredLabelSize(sizeId);
    };

    if (iconOnly && !shouldShowSelector) {
        return (
            <Button
                type="button"
                variant={variant}
                size={size}
                className={className}
                onClick={handlePrint}
                title={`Print QR label (${currentLabelSize.name})`}
                aria-label="Print QR label"
                disabled={isPrinting}
            >
                <Printer className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <Button
                type="button"
                variant={variant}
                size={size}
                className={className}
                onClick={handlePrint}
                disabled={isPrinting}
            >
                <Printer className="h-4 w-4" />
                {!iconOnly && (
                    <span className="ml-2">{isPrinting ? "Printing…" : "Print Label"}</span>
                )}
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="px-2 h-9 font-mono text-xs"
                        disabled={isPrinting}
                    >
                        {currentLabelSize.name}
                        <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Label Size
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.values(LABEL_SIZES).map((labelSize) => (
                        <DropdownMenuItem
                            key={labelSize.id}
                            onClick={() => handleSizeChange(labelSize.id)}
                            className="font-mono text-xs justify-between"
                        >
                            <span>{labelSize.name}</span>
                            {selectedSize === labelSize.id && (
                                <Check className="h-3 w-3 text-primary" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
