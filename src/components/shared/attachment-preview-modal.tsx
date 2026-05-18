"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download } from "lucide-react";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileUrl: string | null;
    fileName?: string | null;
    mimeType?: string | null;
};

// Item 3 Tier 3 — preview-in-place for images and PDFs. Other types fall
// through to a "download to view" CTA. Shared identical component in
// admin / warehouse / client so the UX is consistent across apps.
export function AttachmentPreviewModal({ open, onOpenChange, fileUrl, fileName, mimeType }: Props) {
    const isImage = (mimeType || "").startsWith("image/");
    const isPdf = (mimeType || "") === "application/pdf";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl w-[92vw] h-[88vh] p-0 overflow-hidden flex flex-col">
                <DialogTitle className="sr-only">{fileName || "Attachment preview"}</DialogTitle>
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                    <div className="text-sm font-mono truncate">{fileName || "Preview"}</div>
                    <div className="flex items-center gap-2">
                        {fileUrl && (
                            <Button asChild size="sm" variant="outline">
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open in new tab
                                </a>
                            </Button>
                        )}
                        {fileUrl && (
                            <Button asChild size="sm">
                                <a href={fileUrl} download={fileName || undefined}>
                                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
                <div className="flex-1 bg-muted/30 overflow-auto">
                    {!fileUrl ? (
                        <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                            No file to preview.
                        </div>
                    ) : isImage ? (
                        <img
                            src={fileUrl}
                            alt={fileName || "Attachment"}
                            className="block max-w-full max-h-full mx-auto my-auto object-contain"
                        />
                    ) : isPdf ? (
                        <iframe
                            src={fileUrl}
                            title={fileName || "PDF preview"}
                            className="w-full h-full border-0"
                        />
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                            <p>Preview not available for this file type.</p>
                            <Button asChild size="sm">
                                <a href={fileUrl} download={fileName || undefined}>
                                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download to view
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
