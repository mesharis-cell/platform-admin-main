"use client";

import { useRef } from "react";
import Image from "next/image";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
    value: string | null | undefined;
    onUpload: (file: File) => Promise<void> | void;
    onClear: () => Promise<void> | void;
    isMutating?: boolean;
    title?: string;
    helpText?: string;
};

// Single-image curator for `assets.on_display_image` / `asset_families.on_display_image`.
// The hero stays stable across scan/return flows that mutate the `images[]`
// stream — those go to the "Latest Scan Images" card in the right rail.
export function OnDisplayImageEditor({
    value,
    onUpload,
    onClear,
    isMutating,
    title = "On-Display Image",
    helpText = "Catalog hero image. Curated — will not be auto-updated by scans or returns.",
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    function triggerUpload() {
        fileInputRef.current?.click();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        await onUpload(file);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
                <div className="space-y-0.5">
                    <CardTitle className="font-mono text-sm">{title}</CardTitle>
                    <p className="text-[10px] uppercase tracking-wide font-mono text-muted-foreground">
                        {helpText}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="font-mono"
                    disabled={isMutating}
                    onClick={triggerUpload}
                >
                    {isMutating ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                        <Camera className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {value ? "Replace" : "Upload"}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </CardHeader>
            <CardContent className="p-6 pt-0">
                {value ? (
                    <div className="relative aspect-16/10 bg-muted rounded-lg overflow-hidden">
                        <Image src={value} alt="On-display" fill className="object-contain" />
                        <button
                            type="button"
                            onClick={() => onClear()}
                            className="absolute top-2 right-2 p-1.5 bg-destructive/90 text-destructive-foreground rounded-md hover:bg-destructive transition-colors"
                            title="Clear on-display image"
                            disabled={isMutating}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg">
                        <Camera className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-mono">No on-display image set</p>
                        <p className="text-xs font-mono mt-1">
                            Click Upload to choose the catalog hero
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
