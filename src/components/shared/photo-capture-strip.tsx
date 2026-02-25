"use client";

import { useRef, useState } from "react";
import { Plus, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";

export interface PhotoEntry {
    previewUrl: string;
    note: string;
    file?: File;
    /** S3 URL — set when uploadOnCapture=true and photo has been uploaded */
    uploadedUrl?: string;
}

interface Props {
    photos: PhotoEntry[];
    onChange: (photos: PhotoEntry[]) => void;
    minPhotos?: number;
    label?: string;
    /** When true, uploads each photo to S3 draft folder immediately on confirm */
    uploadOnCapture?: boolean;
    companyId?: string;
    disabled?: boolean;
}

export function PhotoCaptureStrip({
    photos,
    onChange,
    minPhotos,
    label,
    uploadOnCapture,
    companyId,
    disabled,
}: Props) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreview, setPendingPreview] = useState<string>("");
    const [pendingNote, setPendingNote] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleFileSelected = (file: File) => {
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreview(url);
        setPendingNote("");
    };

    const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelected(file);
        e.target.value = "";
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelected(file);
        e.target.value = "";
    };

    const cancelPending = () => {
        URL.revokeObjectURL(pendingPreview);
        setPendingFile(null);
        setPendingPreview("");
        setPendingNote("");
    };

    const confirmPhoto = async () => {
        if (!pendingFile) return;

        let uploadedUrl: string | undefined;
        if (uploadOnCapture) {
            setUploading(true);
            try {
                const fd = new FormData();
                if (companyId) fd.append("companyId", companyId);
                fd.append("files", pendingFile);
                const res = await apiClient.post("/operations/v1/upload/images?draft=true", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                uploadedUrl = res.data?.data?.imageUrls?.[0];
            } catch {
                toast.error("Failed to upload photo. Try again.");
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        }

        const entry: PhotoEntry = {
            previewUrl: pendingPreview,
            note: pendingNote.trim(),
            file: uploadOnCapture ? undefined : pendingFile,
            uploadedUrl,
        };

        // Newest photo prepended (leftmost)
        onChange([entry, ...photos]);
        setPendingFile(null);
        setPendingPreview("");
        setPendingNote("");
    };

    const removeAt = (index: number) => {
        const next = [...photos];
        URL.revokeObjectURL(next[index].previewUrl);
        next.splice(index, 1);
        onChange(next);
    };

    const SQUARE = "w-20 h-20 shrink-0";

    return (
        <div className="space-y-2">
            {label && (
                <p className="text-xs font-mono font-bold uppercase text-foreground">
                    {label}
                    {minPhotos ? ` (min ${minPhotos})` : ""}
                </p>
            )}

            {/* Horizontal strip */}
            <div className="flex gap-3 overflow-x-auto pb-1">
                {/* Photos — newest first */}
                {photos.map((photo, i) => (
                    <div
                        key={i}
                        className={`${SQUARE} relative rounded-lg overflow-hidden border border-border shrink-0`}
                    >
                        <img
                            src={photo.uploadedUrl || photo.previewUrl}
                            alt={`Photo ${i + 1}`}
                            className="w-full h-full object-cover"
                        />
                        {photo.note && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                                <p className="text-[9px] text-white truncate">{photo.note}</p>
                            </div>
                        )}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeAt(i)}
                                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        )}
                    </div>
                ))}

                {/* Plus button — always rightmost */}
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className={`${SQUARE} rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0`}
                    >
                        <Plus className="w-6 h-6" />
                        <span className="text-[9px] font-mono uppercase">Photo</span>
                    </button>
                )}
            </div>

            {/* Gallery fallback */}
            {!disabled && (
                <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ImageIcon className="w-3 h-3" />
                    Pick from gallery
                </button>
            )}

            {/* Hidden inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCameraChange}
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGalleryChange}
            />

            {/* Note modal — shown after photo is selected */}
            {pendingPreview && (
                <div className="fixed inset-0 z-[70] bg-black/80 flex flex-col">
                    <div className="flex-1 overflow-hidden relative">
                        <img
                            src={pendingPreview}
                            alt="Preview"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div className="bg-background p-4 space-y-3 border-t border-border">
                        <textarea
                            value={pendingNote}
                            onChange={(e) => setPendingNote(e.target.value)}
                            placeholder="Add a note for this photo (optional)"
                            rows={2}
                            className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={cancelPending}
                                disabled={uploading}
                                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium disabled:opacity-50"
                            >
                                Retake
                            </button>
                            <button
                                type="button"
                                onClick={confirmPhoto}
                                disabled={uploading}
                                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                            >
                                {uploading ? "Uploading…" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
