"use client";

/**
 * Edit Inbound Request Dialog - Multi-step Form
 *
 * Steps:
 * 1. Request Info - note, incoming date
 * 2. Add Items - item list with add/remove
 * 3. Item Specifications - weight, dimensions, volume
 * 4. Review & Submit
 */

import { useState, useRef, useEffect } from "react";
import { useBrands } from "@/hooks/use-brands";
import { useUpdateInboundRequest } from "@/hooks/use-inbound-requests";
import { useSearchAssets, useUploadImage } from "@/hooks/use-assets";
import {
    Plus,
    Package,
    Ruler,
    ClipboardList,
    Check,
    X,
    Loader2,
    ChevronRight,
    Calendar,
    FileText,
    Upload,
    Pencil,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type {
    InboundRequestDetails,
    InboundRequestItem,
    UpdateInboundRequestPayload,
    TrackingMethod,
} from "@/types/inbound-request";

import { useCompanies } from "@/hooks/use-companies";

const STEPS = [
    { id: "request", label: "Request Info", icon: FileText },
    { id: "items", label: "Edit Items", icon: Package },
    { id: "specs", label: "Specifications", icon: Ruler },
    { id: "review", label: "Review", icon: ClipboardList },
];

const TRACKING_METHODS: { value: TrackingMethod; label: string }[] = [
    { value: "INDIVIDUAL", label: "Individual" },
    { value: "BATCH", label: "Batch" },
];

const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];
const DEFAULT_CATEGORIES = ["Furniture", "Glassware", "Installation", "Decor"];

interface FormData {
    note: string;
    incoming_at: string;
    company_id: string;
    items: Partial<InboundRequestItem>[];
}

const createEmptyItem = (): Partial<InboundRequestItem> => ({
    name: "",
    description: "",
    images: [],
    category: "",
    tracking_method: "INDIVIDUAL",
    quantity: 1,
    packaging: "",
    weight_per_unit: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    volume_per_unit: 0,
    handling_tags: [],
});

interface EditInboundRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    request: InboundRequestDetails | null;
}

export function EditInboundRequestDialog({
    open,
    onOpenChange,
    onSuccess,
    request,
}: EditInboundRequestDialogProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        note: "",
        incoming_at: "",
        company_id: "",
        items: [createEmptyItem()],
    });

    // Image upload state - store NEW files locally per item until form submit
    // existingImagesPerItem: images already on the server (from the request data)
    // selectedImagesPerItem: NEW files selected by user
    // previewUrlsPerItem: preview URLs for NEW files only
    const [existingImagesPerItem, setExistingImagesPerItem] = useState<Map<number, string[]>>(
        new Map()
    );
    const [selectedImagesPerItem, setSelectedImagesPerItem] = useState<Map<number, File[]>>(
        new Map()
    );
    const [previewUrlsPerItem, setPreviewUrlsPerItem] = useState<Map<number, string[]>>(new Map());

    // Asset search state per item
    const [searchQueriesPerItem, setSearchQueriesPerItem] = useState<Map<number, string>>(
        new Map()
    );
    const [showDropdownPerItem, setShowDropdownPerItem] = useState<Map<number, boolean>>(new Map());
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch reference data

    // Asset search - uses debounced search query for current item
    const currentSearchQuery = searchQueriesPerItem.get(currentItemIndex) || "";
    const { data: searchResults, isLoading: isSearching } = useSearchAssets(
        currentSearchQuery,
        formData.company_id
    );
    const searchedAssets = searchResults?.data || [];

    const { data: companiesData } = useCompanies();
    const companies = companiesData?.data || [];

    const { data: brandsData } = useBrands(
        formData.company_id ? { company_id: formData.company_id } : undefined
    );

    const brands = brandsData?.data || [];

    // Mutations
    const updateMutation = useUpdateInboundRequest();
    const uploadMutation = useUploadImage();

    // Initialize form data when request changes
    useEffect(() => {
        if (request && open) {
            // Initialize existing images per item
            const existingImages = new Map<number, string[]>();
            request.items.forEach((item, index) => {
                existingImages.set(index, item.images || []);
            });
            setExistingImagesPerItem(existingImages);

            setFormData({
                note: request.note || "",
                company_id: request.company.id || "",
                incoming_at: request.incoming_at?.split("T")[0] || "",
                items: request.items.map((item) => ({
                    ...item,
                    item_id: item.id,
                    dimensions: item.dimensions || { length: 0, width: 0, height: 0 },
                })),
            });
            // Clear pending files when dialog opens with new data
            setSelectedImagesPerItem(new Map());
            previewUrlsPerItem.forEach((urls) => urls.forEach((url) => URL.revokeObjectURL(url)));
            setPreviewUrlsPerItem(new Map());
            setCurrentStep(0);
            setCurrentItemIndex(0);

            // Initialize search queries for existing items
            const initialSearchQueries = new Map<number, string>();
            request.items.forEach((item, index) => {
                if (item.name) {
                    initialSearchQueries.set(index, item.name);
                }
            });
            setSearchQueriesPerItem(initialSearchQueries);
            setShowDropdownPerItem(new Map());
        }
    }, [request, open]);

    // Debounced search handler
    function handleSearchInput(itemIndex: number, value: string) {
        // Update item name immediately
        updateItem(itemIndex, { name: value, asset_id: null });

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce the search query update
        searchTimeoutRef.current = setTimeout(() => {
            setSearchQueriesPerItem((prev) => {
                const updated = new Map(prev);
                updated.set(itemIndex, value);
                return updated;
            });

            // Show dropdown if query is long enough
            if (value.length >= 2) {
                setShowDropdownPerItem((prev) => {
                    const updated = new Map(prev);
                    updated.set(itemIndex, true);
                    return updated;
                });
            }
        }, 300);
    }

    // Handle asset selection from dropdown
    function handleSelectAsset(itemIndex: number, asset: (typeof searchedAssets)[0]) {
        updateItem(itemIndex, {
            asset_id: asset.id,
            name: asset.name,
            description: asset.description || "",
            category: asset.category,
            tracking_method: asset.tracking_method,
            weight_per_unit: asset.weight_per_unit,
            dimensions: asset.dimensions,
            volume_per_unit: asset.volume_per_unit || 0,
            handling_tags: asset.handling_tags || [],
            images: asset.images || [],
            brand_id: asset.brand_id || undefined,
        });

        // Hide dropdown after selection
        setShowDropdownPerItem((prev) => {
            const updated = new Map(prev);
            updated.set(itemIndex, false);
            return updated;
        });

        // Clear search query
        setSearchQueriesPerItem((prev) => {
            const updated = new Map(prev);
            updated.set(itemIndex, "");
            return updated;
        });
    }

    // Clear asset selection and enable manual entry
    function clearAssetSelection(itemIndex: number) {
        updateItem(itemIndex, {
            asset_id: null,
            name: "",
            description: "",
            category: "",
            tracking_method: "INDIVIDUAL",
            weight_per_unit: 0,
            dimensions: { length: 0, width: 0, height: 0 },
            volume_per_unit: 0,
            handling_tags: [],
            images: [],
            brand_id: undefined,
        });
    }

    // Check if item has selected asset (fields should be disabled)
    function isAssetSelected(itemIndex: number): boolean {
        return !!formData.items[itemIndex]?.asset_id;
    }

    // Handle image selection - store files locally, create previews
    function handleImageSelect(itemIndex: number, e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Add new files to existing selection for this item
        setSelectedImagesPerItem((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(itemIndex) || [];
            updated.set(itemIndex, [...existing, ...files]);
            return updated;
        });

        // Create preview URLs for new files
        const newUrls = files.map((file) => URL.createObjectURL(file));
        setPreviewUrlsPerItem((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(itemIndex) || [];
            updated.set(itemIndex, [...existing, ...newUrls]);
            return updated;
        });
    }

    // Get all images for display (existing + new previews)
    function getItemImages(itemIndex: number): { url: string; isNew: boolean }[] {
        const existing = existingImagesPerItem.get(itemIndex) || [];
        const previews = previewUrlsPerItem.get(itemIndex) || [];
        return [
            ...existing.map((url) => ({ url, isNew: false })),
            ...previews.map((url) => ({ url, isNew: true })),
        ];
    }

    // Remove image (handle both existing and new images)
    function removeImage(itemIndex: number, imageIndex: number) {
        const existing = existingImagesPerItem.get(itemIndex) || [];
        const previews = previewUrlsPerItem.get(itemIndex) || [];
        const selectedFiles = selectedImagesPerItem.get(itemIndex) || [];

        if (imageIndex < existing.length) {
            // Remove from existing images
            const newExisting = [...existing];
            newExisting.splice(imageIndex, 1);
            setExistingImagesPerItem((prev) => {
                const updated = new Map(prev);
                updated.set(itemIndex, newExisting);
                return updated;
            });
        } else {
            // Remove from new images (previews)
            const newImageIndex = imageIndex - existing.length;

            // Revoke object URL
            if (previews[newImageIndex]) {
                URL.revokeObjectURL(previews[newImageIndex]);
            }

            // Remove from selected files
            const newFiles = [...selectedFiles];
            newFiles.splice(newImageIndex, 1);
            setSelectedImagesPerItem((prev) => {
                const updated = new Map(prev);
                updated.set(itemIndex, newFiles);
                return updated;
            });

            // Remove from preview URLs
            const newPreviews = [...previews];
            newPreviews.splice(newImageIndex, 1);
            setPreviewUrlsPerItem((prev) => {
                const updated = new Map(prev);
                updated.set(itemIndex, newPreviews);
                return updated;
            });
        }
    }

    function updateItem(index: number, updates: Partial<InboundRequestItem>) {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, ...updates } : item)),
        }));
    }

    function addItem() {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, createEmptyItem()],
        }));
        setCurrentItemIndex(formData.items.length);
    }

    function removeItem(index: number) {
        if (formData.items.length <= 1) {
            toast.error("At least one item is required");
            return;
        }

        // Clean up preview URLs for this item
        const previews = previewUrlsPerItem.get(index) || [];
        previews.forEach((url) => URL.revokeObjectURL(url));

        // Remove from maps and shift indices for all maps
        const shiftMaps = <T,>(map: Map<number, T>): Map<number, T> => {
            const updated = new Map<number, T>();
            map.forEach((value, i) => {
                if (i < index) {
                    updated.set(i, value);
                } else if (i > index) {
                    updated.set(i - 1, value);
                }
            });
            return updated;
        };

        setExistingImagesPerItem((prev) => shiftMaps(prev));
        setSelectedImagesPerItem((prev) => shiftMaps(prev));
        setPreviewUrlsPerItem((prev) => shiftMaps(prev));

        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));

        if (currentItemIndex >= formData.items.length - 1) {
            setCurrentItemIndex(Math.max(0, formData.items.length - 2));
        }
    }

    function toggleHandlingTag(itemIndex: number, tag: string) {
        const item = formData.items[itemIndex];
        const current = item.handling_tags || [];
        const updated = current.includes(tag)
            ? current.filter((t) => t !== tag)
            : [...current, tag];
        updateItem(itemIndex, { handling_tags: updated });
    }

    function calculateVolume(length?: number, width?: number, height?: number) {
        if (length && width && height && length > 0 && width > 0 && height > 0) {
            return (length * width * height) / 1000000;
        }
        return 0;
    }

    function updateDimension(
        itemIndex: number,
        field: "length" | "width" | "height",
        value: number
    ) {
        const item = formData.items[itemIndex];
        const newDimensions = {
            ...item.dimensions,
            [field]: value,
        };
        const volume = calculateVolume(
            field === "length" ? value : newDimensions?.length,
            field === "width" ? value : newDimensions?.width,
            field === "height" ? value : newDimensions?.height
        );
        updateItem(itemIndex, {
            dimensions: newDimensions as InboundRequestItem["dimensions"],
            volume_per_unit: volume,
        });
    }

    async function handleSubmit() {
        if (!request) return;
        if (!formData.company_id) {
            toast.error("Company ID not available");
            return;
        }

        try {
            // Collect all NEW files from all items for batch upload
            const allFiles: File[] = [];
            const itemFileRanges: { itemIndex: number; startIdx: number; count: number }[] = [];

            selectedImagesPerItem.forEach((files, itemIndex) => {
                if (files.length > 0) {
                    itemFileRanges.push({
                        itemIndex,
                        startIdx: allFiles.length,
                        count: files.length,
                    });
                    allFiles.push(...files);
                }
            });

            // Upload all NEW images in a single batch request
            let allUploadedUrls: string[] = [];
            if (allFiles.length > 0) {
                const uploadFormData = new FormData();
                uploadFormData.append("companyId", formData.company_id);
                allFiles.forEach((file) => uploadFormData.append("files", file));

                const uploadResult = await uploadMutation.mutateAsync(uploadFormData);
                allUploadedUrls = uploadResult.data?.imageUrls || [];
            }

            // Map uploaded URLs back to items
            const uploadedImagesPerItem = new Map<number, string[]>();
            itemFileRanges.forEach(({ itemIndex, startIdx, count }) => {
                uploadedImagesPerItem.set(
                    itemIndex,
                    allUploadedUrls.slice(startIdx, startIdx + count)
                );
            });

            // Build payload with existing + newly uploaded image URLs
            const payload: UpdateInboundRequestPayload = {
                note: formData.note || undefined,
                incoming_at: formData.incoming_at,
                items: formData.items.map((item, index) => {
                    const existing = existingImagesPerItem.get(index) || [];
                    const newlyUploaded = uploadedImagesPerItem.get(index) || [];
                    return {
                        item_id: item.item_id || undefined,
                        asset_id: item.asset_id || undefined,
                        brand_id: item.brand_id || undefined,
                        name: item.name || "",
                        description: item.description || undefined,
                        images: [...existing, ...newlyUploaded],
                        category: item.category || "",
                        tracking_method: item.tracking_method || "INDIVIDUAL",
                        quantity: item.quantity || 1,
                        packaging: item.packaging || undefined,
                        weight_per_unit: Number(item.weight_per_unit) || 0,
                        dimensions: item.dimensions,
                        volume_per_unit: Number(item.volume_per_unit) || 0,
                        handling_tags: item.handling_tags || [],
                    };
                }),
            };

            await updateMutation.mutateAsync({ id: request.id, data: payload });

            // Cleanup preview URLs
            previewUrlsPerItem.forEach((urls) => {
                urls.forEach((url) => URL.revokeObjectURL(url));
            });
            setSelectedImagesPerItem(new Map());
            setPreviewUrlsPerItem(new Map());

            toast.success("Inbound request updated successfully");
            onSuccess();
        } catch (error) {
            console.error("Update inbound request error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to update request");
        }
    }

    function canProceedToNext(): boolean {
        switch (currentStep) {
            case 0: // Request Info
                return !!formData.incoming_at;
            case 1: // Edit Items
                return formData.items.every(
                    (item) =>
                        item.name &&
                        item.name.trim() !== "" &&
                        item.category &&
                        item.category.trim() !== "" &&
                        item.quantity > 0 &&
                        item.tracking_method
                );
            case 2: // Specifications
                return formData.items.every(
                    (item) =>
                        item.weight_per_unit !== undefined &&
                        item.weight_per_unit >= 0 &&
                        item.volume_per_unit !== undefined &&
                        item.volume_per_unit >= 0
                );
            case 3: // Review
                return true;
            default:
                return false;
        }
    }

    const currentItem = formData.items[currentItemIndex];
    const calculateMinDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 0);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    if (!request) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-mono text-xl flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-primary" />
                        Edit Inbound Request
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs">
                        Update request ID: {request.id.slice(0, 8)}...
                    </DialogDescription>
                </DialogHeader>

                {/* Step indicator */}
                <div className="flex items-center justify-between border-y border-border py-4">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;

                        return (
                            <div key={step.id} className="flex items-center flex-1">
                                <button
                                    onClick={() => setCurrentStep(index)}
                                    disabled={index > currentStep}
                                    className={`flex items-center gap-2 ${
                                        isActive
                                            ? "text-primary"
                                            : isCompleted
                                              ? "text-foreground"
                                              : "text-muted-foreground"
                                    } disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:text-primary`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                            isActive
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : isCompleted
                                                  ? "bg-primary/10 border-primary/20 text-primary"
                                                  : "bg-muted border-border"
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Icon className="w-4 h-4" />
                                        )}
                                    </div>
                                    <span className="text-xs font-mono font-medium">
                                        {step.label}
                                    </span>
                                </button>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-px mx-2 ${
                                            isCompleted ? "bg-primary" : "bg-border"
                                        }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Step content */}
                <div className="flex-1 overflow-y-auto px-1">
                    {/* Step 1: Request Info */}
                    {currentStep === 0 && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Incoming Date *</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            min={calculateMinDate()}
                                            value={formData.incoming_at}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    incoming_at: e.target.value,
                                                })
                                            }
                                            className="font-mono pl-10"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="font-mono text-xs">Company ID *</Label>
                                    <Select
                                        disabled
                                        value={formData.company_id}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                company_id: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="font-mono">
                                            <SelectValue placeholder="Select company" />
                                        </SelectTrigger>
                                        <SelectContent className="font-mono">
                                            {companies.map((company) => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-mono text-xs">Note (Optional)</Label>
                                <Textarea
                                    placeholder="Additional notes for this request..."
                                    value={formData.note}
                                    onChange={(e) =>
                                        setFormData({ ...formData, note: e.target.value })
                                    }
                                    className="font-mono text-sm"
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Edit Items */}
                    {currentStep === 1 && (
                        <div className="space-y-4 py-4">
                            {/* Item tabs */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="flex items-center">
                                        <button
                                            onClick={() => setCurrentItemIndex(index)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                                                currentItemIndex === index
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-muted border-border hover:border-primary/50"
                                            }`}
                                        >
                                            Item {index + 1}
                                            {item.name && `: ${item.name.slice(0, 15)}...`}
                                        </button>
                                        {formData.items.length > 1 && (
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="ml-1 p-1 text-destructive hover:bg-destructive/10 rounded"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    className="font-mono"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Item
                                </Button>
                            </div>

                            {/* Current item form */}
                            {currentItem && (
                                <div className="space-y-4 p-4 border border-border rounded-lg">
                                    {/* Item Name / Asset Search */}
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            Item Name *{" "}
                                            {isAssetSelected(currentItemIndex) && (
                                                <span className="text-primary ml-2">
                                                    (Linked to Asset)
                                                </span>
                                            )}
                                        </Label>
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search existing assets or enter new name..."
                                                    value={currentItem.name || ""}
                                                    onChange={(e) =>
                                                        handleSearchInput(
                                                            currentItemIndex,
                                                            e.target.value
                                                        )
                                                    }
                                                    onFocus={() => {
                                                        if (
                                                            (currentItem.name?.length || 0) >= 2 &&
                                                            !isAssetSelected(currentItemIndex)
                                                        ) {
                                                            setShowDropdownPerItem((prev) => {
                                                                const updated = new Map(prev);
                                                                updated.set(currentItemIndex, true);
                                                                return updated;
                                                            });
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        // Delay hiding dropdown to allow click on results
                                                        setTimeout(() => {
                                                            setShowDropdownPerItem((prev) => {
                                                                const updated = new Map(prev);
                                                                updated.set(
                                                                    currentItemIndex,
                                                                    false
                                                                );
                                                                return updated;
                                                            });
                                                        }, 200);
                                                    }}
                                                    className="font-mono pl-10 pr-10"
                                                    disabled={isAssetSelected(currentItemIndex)}
                                                />
                                                {isAssetSelected(currentItemIndex) && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            clearAssetSelection(currentItemIndex)
                                                        }
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-destructive/10 rounded text-destructive"
                                                        title="Clear asset selection"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isSearching &&
                                                    !isAssetSelected(currentItemIndex) && (
                                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                                                    )}
                                            </div>

                                            {/* Search results dropdown */}
                                            {showDropdownPerItem.get(currentItemIndex) &&
                                                !isAssetSelected(currentItemIndex) && (
                                                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                        {isSearching ? (
                                                            <div className="p-3 text-center text-sm text-muted-foreground font-mono">
                                                                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                                                Searching assets...
                                                            </div>
                                                        ) : searchedAssets.length > 0 ? (
                                                            <>
                                                                <div className="px-3 py-2 text-xs font-mono text-muted-foreground border-b border-border">
                                                                    Select an existing asset or
                                                                    continue typing for manual entry
                                                                </div>
                                                                {searchedAssets.map((asset) => (
                                                                    <button
                                                                        key={asset.id}
                                                                        type="button"
                                                                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3"
                                                                        onClick={() =>
                                                                            handleSelectAsset(
                                                                                currentItemIndex,
                                                                                asset
                                                                            )
                                                                        }
                                                                    >
                                                                        {asset.images?.[0] ? (
                                                                            <img
                                                                                src={
                                                                                    asset.images[0]
                                                                                }
                                                                                alt={asset.name}
                                                                                className="w-10 h-10 rounded object-cover border border-border"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                                                                <Package className="w-5 h-5 text-muted-foreground" />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-mono text-sm font-medium truncate">
                                                                                {asset.name}
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground font-mono">
                                                                                {asset.category} •{" "}
                                                                                {
                                                                                    asset.tracking_method
                                                                                }{" "}
                                                                                • Qty:{" "}
                                                                                {
                                                                                    asset.available_quantity
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </>
                                                        ) : currentSearchQuery.length >= 2 ? (
                                                            <div className="p-3 text-center text-sm text-muted-foreground font-mono">
                                                                No assets found. Continue typing for
                                                                manual entry.
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                        </div>
                                        {isAssetSelected(currentItemIndex) && (
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Fields auto-filled from asset. Only quantity can be
                                                modified.
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">Category *</Label>
                                            <Select
                                                value={currentItem.category}
                                                onValueChange={(value) =>
                                                    updateItem(currentItemIndex, {
                                                        category: value,
                                                    })
                                                }
                                                disabled={isAssetSelected(currentItemIndex)}
                                            >
                                                <SelectTrigger className="font-mono">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DEFAULT_CATEGORIES.map((cat) => (
                                                        <SelectItem key={cat} value={cat}>
                                                            {cat}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">
                                                Brand (Optional)
                                            </Label>
                                            <Select
                                                value={currentItem.brand_id}
                                                onValueChange={(value) =>
                                                    updateItem(currentItemIndex, {
                                                        brand_id: value,
                                                    })
                                                }
                                                disabled={
                                                    !formData.company_id ||
                                                    isAssetSelected(currentItemIndex)
                                                }
                                            >
                                                <SelectTrigger className="font-mono">
                                                    <SelectValue placeholder="Select brand" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {brands.map((brand) => (
                                                        <SelectItem key={brand.id} value={brand.id}>
                                                            {brand.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">
                                                Tracking Method *
                                            </Label>
                                            <Select
                                                value={currentItem.tracking_method}
                                                onValueChange={(value) =>
                                                    updateItem(currentItemIndex, {
                                                        tracking_method: value as TrackingMethod,
                                                    })
                                                }
                                                disabled={isAssetSelected(currentItemIndex)}
                                            >
                                                <SelectTrigger className="font-mono">
                                                    <SelectValue placeholder="Select tracking method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TRACKING_METHODS.map((method) => (
                                                        <SelectItem
                                                            key={method.value}
                                                            value={method.value}
                                                        >
                                                            {method.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">Quantity *</Label>
                                            <Input
                                                type="number"
                                                value={currentItem.quantity}
                                                onChange={(e) =>
                                                    updateItem(currentItemIndex, {
                                                        quantity: parseInt(e.target.value),
                                                    })
                                                }
                                                className="font-mono"
                                            />
                                        </div>
                                    </div>

                                    {currentItem.tracking_method === "BATCH" && (
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">
                                                Packaging Description
                                            </Label>
                                            <Input
                                                placeholder="e.g., Box of 50, Crate, Set of 8"
                                                value={currentItem.packaging || ""}
                                                onChange={(e) =>
                                                    updateItem(currentItemIndex, {
                                                        packaging: e.target.value,
                                                    })
                                                }
                                                className="font-mono"
                                                disabled={isAssetSelected(currentItemIndex)}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            Description (Optional)
                                        </Label>
                                        <Textarea
                                            placeholder="Item description..."
                                            value={currentItem.description || ""}
                                            onChange={(e) =>
                                                updateItem(currentItemIndex, {
                                                    description: e.target.value,
                                                })
                                            }
                                            className="font-mono text-sm"
                                            rows={2}
                                            disabled={isAssetSelected(currentItemIndex)}
                                        />
                                    </div>

                                    {/* Image Upload */}
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            Item Photos (Optional)
                                        </Label>
                                        <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) =>
                                                    handleImageSelect(currentItemIndex, e)
                                                }
                                                className="hidden"
                                                id={`edit-item-image-upload-${currentItemIndex}`}
                                                disabled={isAssetSelected(currentItemIndex)}
                                            />
                                            <label
                                                htmlFor={`edit-item-image-upload-${currentItemIndex}`}
                                                className={`flex flex-col items-center justify-center cursor-pointer ${
                                                    isAssetSelected(currentItemIndex)
                                                        ? "opacity-50 cursor-not-allowed"
                                                        : ""
                                                }`}
                                            >
                                                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {isAssetSelected(currentItemIndex)
                                                        ? "Images linked from asset"
                                                        : "Click to select images"}
                                                </span>
                                                {!isAssetSelected(currentItemIndex) && (
                                                    <span className="text-xs font-mono text-muted-foreground mt-1">
                                                        JPG, PNG, WEBP up to 5MB
                                                    </span>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Image preview grid */}
                                    {getItemImages(currentItemIndex).length > 0 && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {getItemImages(currentItemIndex).map(
                                                (img, imgIndex) => (
                                                    <div
                                                        key={imgIndex}
                                                        className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                                                    >
                                                        <img
                                                            src={img.url}
                                                            alt={`Preview ${imgIndex + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {img.isNew && (
                                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-[10px] font-mono">
                                                                New
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeImage(
                                                                    currentItemIndex,
                                                                    imgIndex
                                                                )
                                                            }
                                                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                            disabled={isAssetSelected(
                                                                currentItemIndex
                                                            )}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Specifications */}
                    {currentStep === 2 && (
                        <div className="space-y-4 py-4">
                            {/* Item tabs */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {formData.items.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentItemIndex(index)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                                            currentItemIndex === index
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted border-border hover:border-primary/50"
                                        }`}
                                    >
                                        {item.name || `Item ${index + 1}`}
                                    </button>
                                ))}
                            </div>

                            {/* Current item specs */}
                            {currentItem && (
                                <div className="space-y-4 p-4 border border-border rounded-lg">
                                    <h4 className="font-mono font-semibold text-sm">
                                        {currentItem.name || `Item ${currentItemIndex + 1}`}
                                    </h4>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">Length (cm)</Label>
                                            <Input
                                                type="number"
                                                step="1"
                                                placeholder="0.00"
                                                value={Number(currentItem.dimensions?.length) || ""}
                                                onChange={(e) =>
                                                    updateDimension(
                                                        currentItemIndex,
                                                        "length",
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="font-mono"
                                                disabled={isAssetSelected(currentItemIndex)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">Width (cm)</Label>
                                            <Input
                                                type="number"
                                                step="1"
                                                placeholder="0.00"
                                                value={Number(currentItem.dimensions?.width) || ""}
                                                onChange={(e) =>
                                                    updateDimension(
                                                        currentItemIndex,
                                                        "width",
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="font-mono"
                                                disabled={isAssetSelected(currentItemIndex)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">Height (cm)</Label>
                                            <Input
                                                type="number"
                                                step="1"
                                                placeholder="0.00"
                                                value={Number(currentItem.dimensions?.height) || ""}
                                                onChange={(e) =>
                                                    updateDimension(
                                                        currentItemIndex,
                                                        "height",
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="font-mono"
                                                disabled={isAssetSelected(currentItemIndex)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">
                                                Weight per Unit (kg) *
                                            </Label>
                                            <Input
                                                type="number"
                                                step="1"
                                                min="0"
                                                placeholder="0.00"
                                                value={Number(currentItem.weight_per_unit) || ""}
                                                onChange={(e) =>
                                                    updateItem(currentItemIndex, {
                                                        weight_per_unit:
                                                            parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="font-mono"
                                                disabled={isAssetSelected(currentItemIndex)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">
                                                Volume per Unit (m³) *
                                            </Label>
                                            <Input
                                                type="number"
                                                step="1"
                                                min="0"
                                                placeholder="0.000"
                                                value={Number(currentItem.volume_per_unit) || ""}
                                                onChange={(e) =>
                                                    updateItem(currentItemIndex, {
                                                        volume_per_unit:
                                                            parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="font-mono bg-muted/30"
                                                disabled={isAssetSelected(currentItemIndex)}
                                            />
                                            <p className="text-xs font-mono text-muted-foreground">
                                                Auto-calculated from dimensions
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            Handling Tags (Optional)
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {HANDLING_TAGS.map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant={
                                                        currentItem.handling_tags?.includes(tag)
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    className={`font-mono text-xs ${
                                                        isAssetSelected(currentItemIndex)
                                                            ? "opacity-50 cursor-not-allowed"
                                                            : "cursor-pointer"
                                                    }`}
                                                    onClick={() =>
                                                        !isAssetSelected(currentItemIndex) &&
                                                        toggleHandlingTag(currentItemIndex, tag)
                                                    }
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {currentStep === 3 && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
                                <h4 className="font-mono font-semibold">Request Summary</h4>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground font-mono">
                                            Incoming Date:
                                        </span>
                                        <p className="font-mono">{formData.incoming_at}</p>
                                    </div>
                                </div>

                                {formData.note && (
                                    <div>
                                        <span className="text-muted-foreground font-mono text-sm">
                                            Note:
                                        </span>
                                        <p className="font-mono text-sm">{formData.note}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-mono font-semibold">
                                    Items ({formData.items.length})
                                </h4>
                                <div className="space-y-2">
                                    {formData.items.map((item, index) => (
                                        <div
                                            key={index}
                                            className="p-3 border border-border rounded-lg"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h5 className="font-mono font-medium">
                                                        {item.name}
                                                    </h5>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {item.category} • {item.tracking_method} •
                                                        Qty: {item.quantity}
                                                    </p>
                                                </div>
                                                <div className="text-right text-xs font-mono text-muted-foreground">
                                                    <p>
                                                        {Number(item.weight_per_unit).toFixed(2)} kg
                                                    </p>
                                                    <p>
                                                        {Number(item.volume_per_unit).toFixed(2)} m³
                                                    </p>
                                                </div>
                                            </div>
                                            {item.handling_tags &&
                                                item.handling_tags.length > 0 && (
                                                    <div className="flex gap-1 mt-2">
                                                        {item.handling_tags.map((tag) => (
                                                            <Badge
                                                                key={tag}
                                                                variant="secondary"
                                                                className="text-xs font-mono"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            {getItemImages(index).length > 0 && (
                                                <div className="flex gap-1 mt-2">
                                                    {getItemImages(index)
                                                        .slice(0, 4)
                                                        .map((img, imgIdx) => (
                                                            <div key={imgIdx} className="relative">
                                                                <img
                                                                    src={img.url}
                                                                    alt={`Item ${index + 1} photo ${imgIdx + 1}`}
                                                                    className="w-10 h-10 rounded object-cover border border-border"
                                                                />
                                                                {img.isNew && (
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    {getItemImages(index).length > 4 && (
                                                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-mono">
                                                            +{getItemImages(index).length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className="font-mono"
                    >
                        Previous
                    </Button>

                    {currentStep < STEPS.length - 1 ? (
                        <Button
                            onClick={() => setCurrentStep(currentStep + 1)}
                            disabled={!canProceedToNext()}
                            className="font-mono"
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                !canProceedToNext() ||
                                updateMutation.isPending ||
                                uploadMutation.isPending
                            }
                            className="font-mono"
                        >
                            {updateMutation.isPending || uploadMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Update Request
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
