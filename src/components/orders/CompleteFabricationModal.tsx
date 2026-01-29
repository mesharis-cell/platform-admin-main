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
import { useCompleteReskinRequest } from "@/hooks/use-reskin-requests";
import { useUploadImage } from "@/hooks/use-assets";
import { Upload, X, Loader2 } from "lucide-react";

interface CompleteFabricationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reskinId: string;
    orderId: string;
    originalAssetName: string;
    targetBrandName: string;
    companyId?: string;
}

export function CompleteFabricationModal({
    open,
    onOpenChange,
    reskinId,
    orderId,
    originalAssetName,
    targetBrandName,
    companyId,
}: CompleteFabricationModalProps) {
    const completeReskin = useCompleteReskinRequest();
    const uploadMutation = useUploadImage();
    const [newAssetName, setNewAssetName] = useState("");
    const [completionNotes, setCompletionNotes] = useState("");

    // Image upload state - store files locally until form submit
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Handle image selection - store files locally, create previews
    function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Add new files to existing selection
        setSelectedImages((prev) => [...prev, ...files]);

        // Create preview URLs for new files
        const newUrls = files.map((file) => URL.createObjectURL(file));
        setPreviewUrls((prev) => [...prev, ...newUrls]);
    }

    // Remove image at index
    function removeImage(index: number) {
        const newImages = [...selectedImages];
        const newPreviews = [...previewUrls];

        // Revoke object URL to prevent memory leak
        URL.revokeObjectURL(newPreviews[index]);

        newImages.splice(index, 1);
        newPreviews.splice(index, 1);

        setSelectedImages(newImages);
        setPreviewUrls(newPreviews);
    }

    const handleComplete = async () => {
        if (!newAssetName.trim()) {
            toast.error("Please enter new asset name");
            return;
        }

        if (selectedImages.length === 0) {
            toast.error("Please add at least one photo");
            return;
        }

        try {
            // Upload images first
            let imageUrls: string[] = [];
            if (selectedImages.length > 0) {
                const uploadFormData = new FormData();
                if (companyId) {
                    uploadFormData.append("companyId", companyId);
                }
                selectedImages.forEach((file) => uploadFormData.append("files", file));

                const uploadResult = await uploadMutation.mutateAsync(uploadFormData);
                imageUrls = uploadResult.data?.imageUrls || [];
            }

            await completeReskin.mutateAsync({
                reskinId,
                orderId,
                data: {
                    new_asset_name: newAssetName.trim(),
                    completion_photos: imageUrls,
                    completion_notes: completionNotes || undefined,
                },
            });
            toast.success("Fabrication complete! New asset created.");
            onOpenChange(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Failed to complete fabrication");
        }
    };

    function resetForm() {
        setNewAssetName("");
        setCompletionNotes("");
        // Revoke all preview URLs and clear file state
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
        setSelectedImages([]);
        setPreviewUrls([]);
    }

    const isUploading = uploadMutation.isPending || completeReskin.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Complete Fabrication</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
                        <div>
                            <span className="text-muted-foreground">Original Asset:</span>{" "}
                            <span className="font-semibold">{originalAssetName}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Target Brand:</span>{" "}
                            <span className="font-semibold">{targetBrandName}</span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="newAssetName">
                            New Asset Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="newAssetName"
                            value={newAssetName}
                            onChange={(e) => setNewAssetName(e.target.value)}
                            placeholder="e.g., Red Bull Throne Chair"
                        />
                    </div>

                    <div>
                        <Label>
                            Photos of Completed Asset <span className="text-destructive">*</span>
                        </Label>
                        <div className="space-y-3 mt-2">
                            {/* Image upload dropzone */}
                            <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    id="fabrication-image-upload"
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="fabrication-image-upload"
                                    className="flex flex-col items-center justify-center cursor-pointer"
                                >
                                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                    <span className="text-sm text-muted-foreground">
                                        Click to select images
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        JPG, PNG, WEBP up to 5MB
                                    </span>
                                </label>
                            </div>

                            {/* Image preview grid */}
                            {previewUrls.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {previewUrls.map((url, index) => (
                                        <div
                                            key={index}
                                            className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                                        >
                                            <img
                                                src={url}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                disabled={isUploading}
                                                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                At least 1 photo required
                            </p>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="completionNotes">Completion Notes (Optional)</Label>
                        <Textarea
                            id="completionNotes"
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                            placeholder="e.g., Completed by ABC Fabricators on Jan 20"
                            rows={3}
                        />
                    </div>

                    <div className="bg-primary/10 border border-primary/20 dark:border-primary/80 rounded-md p-3">
                        <p className="text-xs text-primary dark:text-primary/80 font-semibold mb-1">
                            ⚠️ This will:
                        </p>
                        <ul className="text-xs text-primary dark:text-primary/80 space-y-1 ml-4 list-disc">
                            <li>Create new asset "{newAssetName || "..."}"</li>
                            <li>Mark "{originalAssetName}" as TRANSFORMED</li>
                            <li>Update order to use new asset</li>
                            <li>Move order to IN_PREPARATION if all reskins complete</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isUploading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleComplete} disabled={isUploading}>
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {uploadMutation.isPending ? "Uploading..." : "Completing..."}
                            </>
                        ) : (
                            "Complete Fabrication"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
