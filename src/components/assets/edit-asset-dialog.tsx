"use client";

import { useState, useEffect } from "react";
import { useCompanies } from "@/hooks/use-companies";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useZones } from "@/hooks/use-zones";
import { useBrands } from "@/hooks/use-brands";
import { useUpdateAsset, useUploadImage } from "@/hooks/use-assets";
import { X, Loader2, Save, AlertCircle, Check } from "lucide-react";
import { PhotoCaptureStrip, PhotoEntry } from "@/components/shared/photo-capture-strip";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { AssetsDetails, AssetStatus } from "@/types/asset";
import { removeUnderScore } from "@/lib/utils/helper";

const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];
const DEFAULT_CATEGORIES = ["Furniture", "Glassware", "Installation", "Decor"];
const ASSET_STATUSES = ["AVAILABLE", "BOOKED", "OUT", "MAINTENANCE"];

export type EditAssetTab = "basic" | "photos" | "specs";

interface EditAssetDialogProps {
    asset: AssetsDetails;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    defaultTab?: EditAssetTab;
}

const extractId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value.id) return value.id;
    return "";
};

export function EditAssetDialog({
    asset,
    open,
    onOpenChange,
    onSuccess,
    defaultTab = "basic",
}: EditAssetDialogProps) {
    const [activeTab, setActiveTab] = useState<EditAssetTab>(defaultTab);
    const [formData, setFormData] = useState({
        company: extractId(asset.company),
        brand_id: extractId(asset.brand) || undefined,
        warehouse_id: extractId(asset.warehouse),
        zone_id: extractId(asset.zone),
        name: asset.name,
        description: asset.description || "",
        category: asset.category,
        images: asset.images,
        weight_per_unit: asset.weight_per_unit,
        dimensions: asset.dimensions,
        volume_per_unit: asset.volume_per_unit,
        condition: asset.condition,
        refurb_days_estimate: asset.refurb_days_estimate || undefined,
        condition_notes: asset.condition_notes || "",
        handling_tags: asset.handling_tags,
        packaging: asset.packaging || "",
        status: asset.status,
    });

    const [customCategory, setCustomCategory] = useState("");
    const [customHandlingTag, setCustomHandlingTag] = useState("");
    const [stripPhotos, setStripPhotos] = useState<PhotoEntry[]>(
        asset.images.map((img) => ({ previewUrl: img.url, note: img.note ?? "" }))
    );

    useEffect(() => {
        if (open && asset) {
            setFormData({
                company: extractId(asset.company),
                brand_id: extractId(asset.brand) || undefined,
                warehouse_id: extractId(asset.warehouse),
                zone_id: extractId(asset.zone),
                name: asset.name,
                description: asset.description || "",
                category: asset.category,
                images: asset.images,
                weight_per_unit: asset.weight_per_unit,
                dimensions: asset.dimensions,
                volume_per_unit: asset.volume_per_unit,
                condition: asset.condition,
                refurb_days_estimate: asset.refurb_days_estimate || undefined,
                condition_notes: asset.condition_notes || "",
                handling_tags: asset.handling_tags,
                packaging: asset.packaging || "",
                status: asset.status,
            });
            setActiveTab(defaultTab);
            setCustomCategory("");
            setCustomHandlingTag("");
            setStripPhotos(
                asset.images.map((img) => ({ previewUrl: img.url, note: img.note ?? "" }))
            );
        }
    }, [open, asset]);

    const { data: warehousesData } = useWarehouses();
    const { data: zonesData } = useZones(
        formData.warehouse_id
            ? { warehouse_id: formData.warehouse_id, company_id: formData.company }
            : undefined
    );
    const { data: brandsData } = useBrands(
        formData.company ? { company: formData.company } : undefined
    );

    const warehouses = warehousesData?.data || [];
    const zones = zonesData?.data || [];
    const brands = brandsData?.data || [];

    const updateMutation = useUpdateAsset();
    const imageUploadMutation = useUploadImage();

    function toggleHandlingTag(tag: string) {
        setFormData((prev) => ({
            ...prev,
            handling_tags: prev.handling_tags.includes(tag)
                ? prev.handling_tags.filter((t) => t !== tag)
                : [...prev.handling_tags, tag],
        }));
    }

    function addCustomHandlingTag() {
        if (!customHandlingTag.trim()) return;
        setFormData((prev) => ({
            ...prev,
            handling_tags: [...prev.handling_tags, customHandlingTag.trim()],
        }));
        setCustomHandlingTag("");
    }

    function calculateVolume(length?: number, width?: number, height?: number) {
        if (length && width && height && length > 0 && width > 0 && height > 0)
            return (length * width * height) / 1000000;
        return undefined;
    }

    function updateDimension(
        field: "dimensionLength" | "dimensionWidth" | "dimensionHeight",
        value: number
    ) {
        const newDims = {
            length: field === "dimensionLength" ? value : Number(formData.dimensions.length),
            width: field === "dimensionWidth" ? value : Number(formData.dimensions.width),
            height: field === "dimensionHeight" ? value : Number(formData.dimensions.height),
        };
        const vol = calculateVolume(newDims.length, newDims.width, newDims.height);
        setFormData((prev) => ({
            ...prev,
            dimensions: { ...prev.dimensions, ...newDims },
            ...(vol !== undefined ? { volume_per_unit: vol } : {}),
        }));
    }

    async function handleSubmit() {
        if (!formData.name || !formData.category) {
            toast.error("Asset name and category are required");
            setActiveTab("basic");
            return;
        }
        if (
            !formData.weight_per_unit ||
            !formData.dimensions.length ||
            !formData.dimensions.width ||
            !formData.dimensions.height ||
            !formData.volume_per_unit
        ) {
            toast.error("Please fill all physical specifications");
            setActiveTab("specs");
            return;
        }
        if (
            formData.condition !== asset.condition &&
            (formData.condition === "ORANGE" || formData.condition === "RED")
        ) {
            if (!formData.refurb_days_estimate || formData.refurb_days_estimate < 1) {
                toast.error("Refurb days estimate is required when changing to damaged condition");
                setActiveTab("specs");
                return;
            }
            if (!formData.condition_notes || formData.condition_notes.trim().length < 10) {
                toast.error(
                    "Condition notes are required when changing to damaged condition (min 10 chars)"
                );
                setActiveTab("specs");
                return;
            }
        }

        try {
            const existingPhotos = stripPhotos.filter((p) => !p.file);
            const newPhotos = stripPhotos.filter((p) => !!p.file);

            let uploadedUrls: string[] = [];
            if (newPhotos.length > 0) {
                const fd = new FormData();
                fd.append("companyId", formData.company);
                newPhotos.forEach((p) => fd.append("files", p.file!));
                const uploadResult = await imageUploadMutation.mutateAsync(fd);
                uploadedUrls = uploadResult.data?.imageUrls || [];
            }

            const finalImages = [
                ...existingPhotos.map((p) => ({ url: p.previewUrl, note: p.note || undefined })),
                ...uploadedUrls.map((url, i) => ({ url, note: newPhotos[i]?.note || undefined })),
            ];

            await updateMutation.mutateAsync({
                id: asset.id,
                data: {
                    brand_id: formData.brand_id || null,
                    warehouse_id: formData.warehouse_id,
                    zone_id: formData.zone_id,
                    name: formData.name,
                    description: formData.description || null,
                    category: formData.category,
                    images: finalImages,
                    weight_per_unit: Number(formData.weight_per_unit),
                    dimensions: formData.dimensions,
                    volume_per_unit: Number(formData.volume_per_unit),
                    handling_tags: formData.handling_tags,
                    packaging: formData.packaging || null,
                    condition: formData.condition,
                    refurb_days_estimate:
                        formData.condition === "GREEN" ? null : formData.refurb_days_estimate,
                    condition_notes: formData.condition_notes || undefined,
                    status: formData.status,
                } as any,
            });

            toast.success("Asset updated");
            onSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update asset");
        }
    }

    const isSaving = updateMutation.isPending || imageUploadMutation.isPending;
    const totalPhotos = stripPhotos.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-mono text-lg">Edit Asset</DialogTitle>
                    <DialogDescription className="font-mono text-xs">
                        {asset.name}
                    </DialogDescription>
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as EditAssetTab)}
                    className="flex-1 overflow-hidden flex flex-col"
                >
                    <TabsList className="grid w-full grid-cols-3 shrink-0">
                        <TabsTrigger value="basic" className="font-mono text-xs">
                            Basic Info
                        </TabsTrigger>
                        <TabsTrigger value="photos" className="font-mono text-xs">
                            Photos
                            {totalPhotos > 0 && (
                                <span className="ml-1.5 text-muted-foreground">
                                    ({totalPhotos})
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="specs" className="font-mono text-xs">
                            Specifications
                        </TabsTrigger>
                    </TabsList>

                    {/* Basic Info */}
                    <TabsContent value="basic" className="flex-1 overflow-y-auto mt-0 px-1">
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">Asset Name *</Label>
                                <Input
                                    placeholder="e.g., Premium Bar Counter"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-mono text-xs">Category *</Label>
                                <Select
                                    value={
                                        DEFAULT_CATEGORIES.includes(formData.category)
                                            ? formData.category
                                            : formData.category
                                              ? "__custom__"
                                              : ""
                                    }
                                    onValueChange={(value) => {
                                        if (value === "__custom__") {
                                            setCustomCategory(
                                                formData.category &&
                                                    !DEFAULT_CATEGORIES.includes(formData.category)
                                                    ? formData.category
                                                    : ""
                                            );
                                            setFormData({
                                                ...formData,
                                                category: undefined as any,
                                            });
                                        } else {
                                            setFormData({ ...formData, category: value as any });
                                            setCustomCategory("");
                                        }
                                    }}
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
                                        <SelectItem value="__custom__">
                                            + Custom Category
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {(!DEFAULT_CATEGORIES.includes(formData.category) ||
                                    customCategory !== "") && (
                                    <Input
                                        placeholder="Enter custom category"
                                        value={customCategory || formData.category || ""}
                                        onChange={(e) => {
                                            setCustomCategory(e.target.value);
                                            setFormData({
                                                ...formData,
                                                category: e.target.value as any,
                                            });
                                        }}
                                        className="font-mono"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="font-mono text-xs">Description (Optional)</Label>
                                <Textarea
                                    placeholder="Detailed description of the asset..."
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    className="font-mono text-sm"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Warehouse *</Label>
                                    <Select
                                        value={formData.warehouse_id}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                warehouse_id: value,
                                                zone_id: undefined,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="font-mono">
                                            <SelectValue placeholder="Select warehouse" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    {w.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Zone *</Label>
                                    <Select
                                        value={formData.zone_id}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, zone_id: value })
                                        }
                                        disabled={!formData.warehouse_id}
                                    >
                                        <SelectTrigger className="font-mono">
                                            <SelectValue
                                                placeholder={
                                                    !formData.warehouse_id
                                                        ? "Select warehouse first"
                                                        : zones.length === 0
                                                          ? "No zones available"
                                                          : "Select zone"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {zones.length === 0 ? (
                                                <div className="px-2 py-6 text-center text-sm text-muted-foreground font-mono">
                                                    No zones for this warehouse
                                                </div>
                                            ) : (
                                                zones.map((z) => (
                                                    <SelectItem key={z.id} value={z.id}>
                                                        {z.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-mono text-xs">Brand (Optional)</Label>
                                <Select
                                    value={formData.brand_id}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, brand_id: value })
                                    }
                                    disabled={!formData.company}
                                >
                                    <SelectTrigger className="font-mono">
                                        <SelectValue
                                            placeholder={
                                                !formData.company
                                                    ? "No company assigned"
                                                    : brands.length === 0
                                                      ? "No brands available"
                                                      : "Select brand"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Photos */}
                    <TabsContent value="photos" className="flex-1 overflow-y-auto mt-0 px-1">
                        <div className="py-4">
                            <PhotoCaptureStrip
                                photos={stripPhotos}
                                onChange={setStripPhotos}
                                label="Asset Photos"
                                companyId={formData.company}
                                disabled={isSaving}
                            />
                        </div>
                    </TabsContent>

                    {/* Specifications */}
                    <TabsContent value="specs" className="flex-1 overflow-y-auto mt-0 px-1">
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Length (cm) *</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0.00"
                                        value={formData.dimensions.length}
                                        onChange={(e) =>
                                            updateDimension(
                                                "dimensionLength",
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Width (cm) *</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0.00"
                                        value={formData.dimensions.width}
                                        onChange={(e) =>
                                            updateDimension(
                                                "dimensionWidth",
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Height (cm) *</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0.00"
                                        value={formData.dimensions.height}
                                        onChange={(e) =>
                                            updateDimension(
                                                "dimensionHeight",
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Weight (kg) *</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0.00"
                                        value={formData.weight_per_unit}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                weight_per_unit: parseFloat(e.target.value),
                                            })
                                        }
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">
                                        Volume (m³) — auto-calculated
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0.000"
                                        value={formData.volume_per_unit || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                volume_per_unit: parseFloat(e.target.value),
                                            })
                                        }
                                        className="font-mono bg-muted/30"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-mono text-xs">Condition Status *</Label>
                                <div className="flex gap-3">
                                    {["GREEN", "ORANGE", "RED"].map((cond) => (
                                        <button
                                            key={cond}
                                            type="button"
                                            onClick={() =>
                                                setFormData({ ...formData, condition: cond as any })
                                            }
                                            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                                formData.condition === cond
                                                    ? cond === "GREEN"
                                                        ? "border-emerald-500 bg-emerald-500/10"
                                                        : cond === "ORANGE"
                                                          ? "border-amber-500 bg-amber-500/10"
                                                          : "border-red-500 bg-red-500/10"
                                                    : "border-border hover:border-muted-foreground"
                                            }`}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <div
                                                    className={`w-3 h-3 rounded-full ${
                                                        cond === "GREEN"
                                                            ? "bg-emerald-500"
                                                            : cond === "ORANGE"
                                                              ? "bg-amber-500"
                                                              : "bg-red-500"
                                                    }`}
                                                />
                                                <span className="font-mono text-xs font-medium">
                                                    {cond === "GREEN"
                                                        ? "Good"
                                                        : cond === "ORANGE"
                                                          ? "Minor Issues"
                                                          : "Damaged"}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(formData.condition === "ORANGE" || formData.condition === "RED") && (
                                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        <span>
                                            Damage Information{" "}
                                            {formData.condition !== asset.condition
                                                ? "Required"
                                                : "(Optional — update if needed)"}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            Estimated Refurb Days
                                            {formData.condition !== asset.condition ? " *" : ""}
                                        </Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="90"
                                            placeholder="e.g., 5"
                                            value={formData.refurb_days_estimate || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    refurb_days_estimate:
                                                        parseInt(e.target.value) || undefined,
                                                })
                                            }
                                            className="font-mono"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            Condition Notes
                                            {formData.condition !== asset.condition ? " *" : ""}
                                        </Label>
                                        <Textarea
                                            placeholder="Describe the damage or issues..."
                                            value={formData.condition_notes || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    condition_notes: e.target.value,
                                                })
                                            }
                                            className="font-mono text-sm"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="font-mono text-xs">
                                    Handling Tags (Optional)
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {HANDLING_TAGS.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant={
                                                formData.handling_tags.includes(tag)
                                                    ? "default"
                                                    : "outline"
                                            }
                                            className="cursor-pointer font-mono text-xs"
                                            onClick={() => toggleHandlingTag(tag)}
                                        >
                                            {tag}
                                        </Badge>
                                    ))}
                                    {formData.handling_tags
                                        .filter((tag) => !HANDLING_TAGS.includes(tag as string))
                                        .map((tag: string) => (
                                            <Badge
                                                key={tag}
                                                variant="default"
                                                className="cursor-pointer font-mono text-xs"
                                                onClick={() => toggleHandlingTag(tag)}
                                            >
                                                {tag} <X className="w-3 h-3 ml-1" />
                                            </Badge>
                                        ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add custom tag..."
                                        value={customHandlingTag}
                                        onChange={(e) => setCustomHandlingTag(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addCustomHandlingTag();
                                            }
                                        }}
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={addCustomHandlingTag}
                                        disabled={!customHandlingTag.trim()}
                                    >
                                        <Save className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border shrink-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="font-mono"
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving} className="font-mono">
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
