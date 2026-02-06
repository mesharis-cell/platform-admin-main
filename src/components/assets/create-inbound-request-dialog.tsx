"use client";

/**
 * Create Inbound Request Dialog - Multi-step Form
 * 
 * Steps:
 * 1. Request Info - company, note, incoming date
 * 2. Add Items - item list with add/remove
 * 3. Item Specifications - weight, dimensions, volume
 * 4. Review & Submit
 */

import { useState } from "react";
import { useBrands } from "@/hooks/use-brands";
import { useCreateInboundRequest } from "@/hooks/use-inbound-requests";
import { useUploadImage } from "@/hooks/use-assets";
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
import type { InboundRequestItem, CreateInboundRequestPayload, TrackingMethod } from "@/types/inbound-request";
import { useToken } from "@/lib/auth/use-token";

const STEPS = [
  { id: "request", label: "Request Info", icon: FileText },
  { id: "items", label: "Add Items", icon: Package },
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

interface CreateInboundRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInboundRequestDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInboundRequestDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    note: "",
    incoming_at: "",
    items: [createEmptyItem()],
  });

  // Image upload state - store files locally per item until form submit
  const [selectedImagesPerItem, setSelectedImagesPerItem] = useState<Map<number, File[]>>(new Map());
  const [previewUrlsPerItem, setPreviewUrlsPerItem] = useState<Map<number, string[]>>(new Map());

  // Fetch reference data
  const { user } = useToken();
  const { data: brandsData } = useBrands(
    user?.company_id ? { company_id: user.company_id } : undefined
  );

  const brands = brandsData?.data || [];

  // Mutations
  const createMutation = useCreateInboundRequest();
  const uploadMutation = useUploadImage();

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

  // Remove image at index for a specific item
  function removeImage(itemIndex: number, imageIndex: number) {
    const previews = previewUrlsPerItem.get(itemIndex) || [];
    const selectedFiles = selectedImagesPerItem.get(itemIndex) || [];

    // Revoke object URL to prevent memory leak
    if (previews[imageIndex]) {
      URL.revokeObjectURL(previews[imageIndex]);
    }

    // Remove from selected files
    const newFiles = [...selectedFiles];
    newFiles.splice(imageIndex, 1);
    setSelectedImagesPerItem((prev) => {
      const updated = new Map(prev);
      updated.set(itemIndex, newFiles);
      return updated;
    });

    // Remove from preview URLs
    const newPreviews = [...previews];
    newPreviews.splice(imageIndex, 1);
    setPreviewUrlsPerItem((prev) => {
      const updated = new Map(prev);
      updated.set(itemIndex, newPreviews);
      return updated;
    });
  }

  // Get preview URLs for a specific item
  function getItemPreviewUrls(itemIndex: number): string[] {
    return previewUrlsPerItem.get(itemIndex) || [];
  }

  function updateItem(index: number, updates: Partial<InboundRequestItem>) {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, ...updates } : item
      ),
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

    // Remove from maps and shift indices
    setSelectedImagesPerItem((prev) => {
      const updated = new Map<number, File[]>();
      prev.forEach((files, i) => {
        if (i < index) {
          updated.set(i, files);
        } else if (i > index) {
          updated.set(i - 1, files);
        }
      });
      return updated;
    });

    setPreviewUrlsPerItem((prev) => {
      const updated = new Map<number, string[]>();
      prev.forEach((urls, i) => {
        if (i < index) {
          updated.set(i, urls);
        } else if (i > index) {
          updated.set(i - 1, urls);
        }
      });
      return updated;
    });

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
    if (!user?.company_id) {
      toast.error("Company ID not available");
      return;
    }

    try {
      // Collect all files from all items for batch upload
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

      // Upload all images in a single batch request
      let allUploadedUrls: string[] = [];
      if (allFiles.length > 0) {
        const uploadFormData = new FormData();
        uploadFormData.append("companyId", user.company_id);
        allFiles.forEach((file) => uploadFormData.append("files", file));

        const uploadResult = await uploadMutation.mutateAsync(uploadFormData);
        allUploadedUrls = uploadResult.data?.imageUrls || [];
      }

      // Map uploaded URLs back to items
      const uploadedImagesPerItem = new Map<number, string[]>();
      itemFileRanges.forEach(({ itemIndex, startIdx, count }) => {
        uploadedImagesPerItem.set(itemIndex, allUploadedUrls.slice(startIdx, startIdx + count));
      });

      // Build payload with uploaded image URLs
      const payload: CreateInboundRequestPayload = {
        company_id: user.company_id,
        note: formData.note || undefined,
        incoming_at: formData.incoming_at,
        items: formData.items.map((item, index) => {
          const uploadedImages = uploadedImagesPerItem.get(index) || [];
          return {
            brand_id: item.brand_id || undefined,
            name: item.name || "",
            description: item.description || undefined,
            images: uploadedImages,
            category: item.category || "",
            tracking_method: item.tracking_method || "INDIVIDUAL",
            quantity: item.quantity || 1,
            packaging: item.packaging || undefined,
            weight_per_unit: item.weight_per_unit || 0,
            dimensions: item.dimensions,
            volume_per_unit: item.volume_per_unit || 0,
            handling_tags: item.handling_tags || [],
          };
        }),
      };

      await createMutation.mutateAsync(payload);
      toast.success("Inbound request created successfully");
      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Create inbound request error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create request");
    }
  }

  function resetForm() {
    // Revoke all preview URLs to prevent memory leaks
    previewUrlsPerItem.forEach((urls) => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    });
    setSelectedImagesPerItem(new Map());
    setPreviewUrlsPerItem(new Map());
    setFormData({
      note: "",
      incoming_at: "",
      items: [createEmptyItem()],
    });
    setCurrentStep(0);
    setCurrentItemIndex(0);
  }

  function canProceedToNext(): boolean {
    switch (currentStep) {
      case 0: // Request Info
        return !!formData.incoming_at;
      case 1: // Add Items
        return formData.items.every(
          (item) =>
            item.name &&
            item.name.trim() !== "" &&
            item.category &&
            item.category.trim() !== "" &&
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Create Inbound Request
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Submit a new inbound assets request
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
                  className={`flex items-center gap-2 ${isActive
                    ? "text-primary"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                    } disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:text-primary`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isActive
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
                    className={`flex-1 h-[1px] mx-2 ${isCompleted ? "bg-primary" : "bg-border"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">
                    Incoming Date *
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
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

          {/* Step 2: Add Items */}
          {currentStep === 1 && (
            <div className="space-y-4 py-4">
              {/* Item tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <button
                      onClick={() => setCurrentItemIndex(index)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${currentItemIndex === index
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
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Item Name *</Label>
                    <Input
                      placeholder="e.g., Premium Bar Counter"
                      value={currentItem.name || ""}
                      onChange={(e) =>
                        updateItem(currentItemIndex, {
                          name: e.target.value,
                        })
                      }
                      className="font-mono"
                    />
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
                        disabled={!user?.company_id}
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
                        min="1"
                        value={currentItem.quantity || 1}
                        onChange={(e) =>
                          updateItem(currentItemIndex, {
                            quantity: parseInt(e.target.value) || 1,
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
                        onChange={(e) => handleImageSelect(currentItemIndex, e)}
                        className="hidden"
                        id={`item-image-upload-${currentItemIndex}`}
                      />
                      <label
                        htmlFor={`item-image-upload-${currentItemIndex}`}
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                        <span className="text-xs font-mono text-muted-foreground">
                          Click to select images
                        </span>
                        <span className="text-xs font-mono text-muted-foreground mt-1">
                          JPG, PNG, WEBP up to 5MB
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Image preview grid */}
                  {getItemPreviewUrls(currentItemIndex).length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {getItemPreviewUrls(currentItemIndex).map((url, imgIndex) => (
                        <div
                          key={imgIndex}
                          className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                        >
                          <img
                            src={url}
                            alt={`Preview ${imgIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(currentItemIndex, imgIndex)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${currentItemIndex === index
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
                      <Label className="font-mono text-xs">
                        Length (cm)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={currentItem.dimensions?.length || ""}
                        onChange={(e) =>
                          updateDimension(
                            currentItemIndex,
                            "length",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-xs">Width (cm)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={currentItem.dimensions?.width || ""}
                        onChange={(e) =>
                          updateDimension(
                            currentItemIndex,
                            "width",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-xs">
                        Height (cm)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={currentItem.dimensions?.height || ""}
                        onChange={(e) =>
                          updateDimension(
                            currentItemIndex,
                            "height",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="font-mono"
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
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={currentItem.weight_per_unit || ""}
                        onChange={(e) =>
                          updateItem(currentItemIndex, {
                            weight_per_unit:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-xs">
                        Volume per Unit (m³) *
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        value={currentItem.volume_per_unit || ""}
                        onChange={(e) =>
                          updateItem(currentItemIndex, {
                            volume_per_unit:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="font-mono bg-muted/30"
                      />
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
                          className="cursor-pointer font-mono text-xs"
                          onClick={() =>
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
              <div className="p-4 border border-border rounded-lg space-y-4">
                <h4 className="font-mono font-semibold text-sm">
                  Request Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <span className="text-muted-foreground">
                      Incoming Date:
                    </span>{" "}
                    {formData.incoming_at}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Total Items:
                    </span>{" "}
                    {formData.items.length}
                  </div>
                </div>
                {formData.note && (
                  <div className="text-sm font-mono">
                    <span className="text-muted-foreground">Note:</span>{" "}
                    {formData.note}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-mono font-semibold text-sm">Items</h4>
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium text-sm">
                        {item.name}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.tracking_method}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs font-mono text-muted-foreground">
                      <span>Category: {item.category}</span>
                      <span>Qty: {item.quantity}</span>
                      <span>Weight: {item.weight_per_unit}kg</span>
                    </div>
                    {getItemPreviewUrls(index).length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {getItemPreviewUrls(index).slice(0, 4).map((url, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={url}
                            alt={`Item ${index + 1} photo ${imgIdx + 1}`}
                            className="w-10 h-10 rounded object-cover border border-border"
                          />
                        ))}
                        {getItemPreviewUrls(index).length > 4 && (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-mono">
                            +{getItemPreviewUrls(index).length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
                createMutation.isPending ||
                uploadMutation.isPending
              }
              className="font-mono"
            >
              {createMutation.isPending || uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Request
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
