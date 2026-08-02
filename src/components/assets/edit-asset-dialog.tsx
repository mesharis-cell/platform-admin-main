// @ts-nocheck — squash-families partial refactor; UX rebuild deferred. Compile-only stub for staging dress rehearsal.
"use client";

import { useState, useEffect } from "react";
import { useCompanies } from "@/hooks/use-companies";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useZones } from "@/hooks/use-zones";
import { useBrands } from "@/hooks/use-brands";
import { useAddAssetUnits, useUpdateAsset, useUploadImage } from "@/hooks/use-assets";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { X, Loader2, Save, Check, AlertTriangle } from "lucide-react";
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
import type { AssetsDetails } from "@/types/asset";

const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];
const DEFAULT_CATEGORIES = ["Furniture", "Glassware", "Installation", "Decor"];
// RL-038 — PLACED is an ORDINARY asset status: ADMIN and LOGISTICS may set or
// clear it by hand on PATCH /operations/v1/asset/:id exactly as they may any
// other status. There is no Zod rejection and no service-level guard, and the
// trade-off is stated in the spec: a mis-stamped unit is correctable in the UI
// in seconds, and in exchange a hand edit can put a unit back into circulation
// while the platform's own record says it left custody.
//
// B13 — that correction had no control in ops at all, so the trade-off was only
// ever paid, never collected. The targets below are deliberately NARROWER than
// asset_status: only the states a human authors are offered.
//   - BOOKED / OUT are DERIVED, not authored. resyncAssetStatuses re-derives any
//     row sitting in BOOKED/OUT/AVAILABLE from the live booking rows on every
//     release, cancel, settlement and reconcile, and OUT is otherwise written
//     only by an outbound scan. Offering them lets an operator assert a booking
//     the ledger does not have, and the next release silently undoes it.
//   - TRANSFORMED is a terminal hard-block with no writer left anywhere in the
//     API and no flow that leads back out of it. It is not a correction.
// A row already sitting in an excluded state still renders it, disabled, so the
// control is never blank — you can move off such a status, just not onto it.
const ASSET_STATUS_TARGETS = ["AVAILABLE", "MAINTENANCE", "PLACED"] as const;

const ASSET_STATUS_LABELS: Record<string, string> = {
    AVAILABLE: "Available",
    BOOKED: "Booked",
    OUT: "Out",
    MAINTENANCE: "In maintenance",
    TRANSFORMED: "Transformed",
    PLACED: "Placed with client",
};

// Shown next to a status that cannot be chosen, so the operator reads WHY it is
// greyed rather than assuming the control is broken.
const ASSET_STATUS_LOCKED_REASON: Record<string, string> = {
    BOOKED: "set by bookings",
    OUT: "set by scanning",
    TRANSFORMED: "terminal",
};

// What the operator is actually buying by picking each target. Every line is
// about the RECORD — none of these move stock, and saying so per-target is what
// stops the control reading like a write-off or a booking release.
const ASSET_STATUS_CONSEQUENCE: Record<string, string> = {
    AVAILABLE:
        "Puts this unit back in circulation and bookable from now on. No stock is returned and no booking is released. If it still has live bookings the system re-derives its status as Booked the next time those bookings change, and this edit is lost.",
    MAINTENANCE:
        "Holds this unit out of circulation. On pooled stock it labels the row only — a pooled row is a quantity, not a unit, so the pool goes on fulfilling as before.",
    PLACED: "Marks this unit as permanently at a client site and unbookable, and keeps it that way through booking releases. It does not write anything off, does not close an order, and does not record why the unit left — do that on the order or the stock ledger.",
};

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
        group_id: asset.group_id || asset.groupId || null,
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
        total_quantity: asset.total_quantity,
        available_quantity: asset.available_quantity,
    });

    const [customCategory, setCustomCategory] = useState("");
    const [customHandlingTag, setCustomHandlingTag] = useState("");
    const [addUnitsQuantity, setAddUnitsQuantity] = useState("1");
    const [stripPhotos, setStripPhotos] = useState<PhotoEntry[]>(
        asset.images.map((img) => ({ previewUrl: img.url, note: img.note ?? "" }))
    );

    useEffect(() => {
        if (open && asset) {
            setFormData({
                company: extractId(asset.company),
                brand_id: extractId(asset.brand) || undefined,
                group_id: asset.group_id || asset.groupId || null,
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
                total_quantity: asset.total_quantity,
                available_quantity: asset.available_quantity,
            });
            setActiveTab(defaultTab);
            setCustomCategory("");
            setCustomHandlingTag("");
            setAddUnitsQuantity("1");
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
    const assetFamiliesData = { data: [] };

    const warehouses = warehousesData?.data || [];
    const zones = zonesData?.data || [];
    const brands = brandsData?.data || [];
    const assetFamilies = assetFamiliesData?.data || [];

    const updateMutation = useUpdateAsset();
    const addUnitsMutation = useAddAssetUnits();
    const imageUploadMutation = useUploadImage();

    const { user } = useToken();
    // The status change rides on PATCH /operations/v1/asset/:id, which enforces
    // requirePermission(ASSETS_UPDATE). Gating on the same key is the only way the
    // control and the API agree — anything else either shows a control the API
    // refuses or hides one it would have accepted.
    const canEditStatus = hasPermission(user, ADMIN_ACTION_PERMISSIONS.assetsUpdate);

    // PLACED says a physical unit is standing at a client site. A pooled row is a
    // quantity and not a unit, so it is never a target for pooled stock even
    // though the API's Zod would take it.
    const statusTargets = ASSET_STATUS_TARGETS.filter(
        (status) => status !== "PLACED" || asset.stock_mode === "SERIALIZED"
    );
    const statusOptions = statusTargets.includes(asset.status)
        ? statusTargets
        : [asset.status, ...statusTargets];

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
        if (asset.stock_mode === "POOLED") {
            const totalQty = Number(formData.total_quantity);
            const availableQty = Number(formData.available_quantity);

            if (!Number.isInteger(totalQty) || totalQty < 1) {
                toast.error("Total quantity must be at least 1");
                setActiveTab("basic");
                return;
            }
            if (!Number.isInteger(availableQty) || availableQty < 0) {
                toast.error("Available quantity cannot be negative");
                setActiveTab("basic");
                return;
            }
            if (availableQty > totalQty) {
                toast.error("Available quantity cannot exceed total quantity");
                setActiveTab("basic");
                return;
            }
        }
        try {
            const existingPhotos = stripPhotos.filter((p) => !p.file);
            const newPhotos = stripPhotos.filter((p) => !!p.file);

            let uploadedUrls: string[] = [];
            if (newPhotos.length > 0) {
                const uploadResult = await imageUploadMutation.mutateAsync({
                    files: newPhotos.map((photo) => photo.file!),
                    companyId: formData.company,
                    profile: "photo",
                });
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
                    group_id: formData.group_id || null,
                    warehouse_id: formData.warehouse_id,
                    zone_id: formData.zone_id,
                    name: formData.name,
                    description: formData.description || null,
                    category: formData.category,
                    images: finalImages,
                    weight_per_unit: Number(formData.weight_per_unit),
                    dimensions: formData.dimensions,
                    volume_per_unit: Number(formData.volume_per_unit),
                    ...(asset.stock_mode === "POOLED"
                        ? {
                              total_quantity: Number(formData.total_quantity),
                              available_quantity: Number(formData.available_quantity),
                          }
                        : {}),
                    handling_tags: formData.handling_tags,
                    packaging: formData.packaging || null,
                    // Only sent when an operator actually moved it. The dialog
                    // otherwise round-trips whatever the row already had, which
                    // turns every unrelated edit — a photo, a dimension — into a
                    // status write that can race a scan or a booking release.
                    ...(canEditStatus && formData.status !== asset.status
                        ? { status: formData.status }
                        : {}),
                } as any,
            });

            toast.success("Asset updated");
            onSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update asset");
        }
    }

    async function handleAddUnits() {
        const quantity = Number(addUnitsQuantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
            toast.error("Add units quantity must be at least 1");
            return;
        }

        try {
            const response = await addUnitsMutation.mutateAsync({
                id: asset.id,
                quantity,
            });
            const createdCount = response?.data?.created_count ?? quantity;
            toast.success(`${createdCount} new unit${createdCount > 1 ? "s" : ""} created`);
            setAddUnitsQuantity("1");
            onSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to add units");
        }
    }

    const isSaving =
        updateMutation.isPending || imageUploadMutation.isPending || addUnitsMutation.isPending;
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

                            <div className="space-y-3 rounded-lg border border-border p-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Tracking Method</Label>
                                    <Input
                                        value={asset.stock_mode}
                                        disabled
                                        className="font-mono"
                                    />
                                </div>

                                {asset.stock_mode === "POOLED" ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">
                                                Total Quantity *
                                            </Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={formData.total_quantity}
                                                onChange={(event) =>
                                                    setFormData({
                                                        ...formData,
                                                        total_quantity:
                                                            Number(event.target.value) || 0,
                                                    })
                                                }
                                                className="font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">
                                                Available Quantity *
                                            </Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={formData.available_quantity}
                                                onChange={(event) =>
                                                    setFormData({
                                                        ...formData,
                                                        available_quantity:
                                                            Number(event.target.value) || 0,
                                                    })
                                                }
                                                className="font-mono"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            Add INDIVIDUAL Units
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={addUnitsQuantity}
                                                onChange={(event) =>
                                                    setAddUnitsQuantity(event.target.value)
                                                }
                                                className="font-mono"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleAddUnits}
                                                disabled={addUnitsMutation.isPending || isSaving}
                                                className="font-mono"
                                            >
                                                {addUnitsMutation.isPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    "Add Units"
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Creates new INDIVIDUAL asset records with unique QR
                                            codes and copied state.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {canEditStatus && (
                                <div className="space-y-3 rounded-lg border border-border p-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">Status</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, status: value as any })
                                            }
                                        >
                                            <SelectTrigger className="font-mono">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statusOptions.map((option) => {
                                                    const lockedReason =
                                                        ASSET_STATUS_LOCKED_REASON[option];
                                                    return (
                                                        <SelectItem
                                                            key={option}
                                                            value={option}
                                                            disabled={Boolean(lockedReason)}
                                                        >
                                                            {ASSET_STATUS_LABELS[option] ?? option}
                                                            {lockedReason
                                                                ? ` — ${lockedReason}`
                                                                : ""}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                                        <Label className="flex items-center gap-1.5 font-mono text-xs text-amber-700">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            CORRECTS THE RECORD ONLY
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Setting a status by hand relabels this unit and nothing
                                            else. It creates no booking and releases none, moves no
                                            stock, and writes nothing to the stock ledger. Use it
                                            when the system recorded the wrong status — not to take
                                            a unit off an order or to write it off.
                                        </p>
                                        {formData.status !== asset.status && (
                                            <p className="text-sm text-amber-800">
                                                {ASSET_STATUS_CONSEQUENCE[formData.status]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                        setFormData({
                                            ...formData,
                                            brand_id: value,
                                            group_id: null,
                                        })
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

                            <div className="space-y-2">
                                <Label className="font-mono text-xs">Asset Group</Label>
                                <Select
                                    value={formData.group_id || "__none__"}
                                    onValueChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            group_id: value === "__none__" ? null : value,
                                        })
                                    }
                                    disabled={!formData.company}
                                >
                                    <SelectTrigger className="font-mono">
                                        <SelectValue
                                            placeholder={
                                                !formData.company
                                                    ? "No company assigned"
                                                    : assetFamilies.length === 0
                                                      ? "No groups available"
                                                      : "Select group"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">No group</SelectItem>
                                        {assetFamilies.map((family) => (
                                            <SelectItem key={family.id} value={family.id}>
                                                {family.name}
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

                            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                                <Label className="font-mono text-xs">Condition</Label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="font-mono">
                                        {asset.condition}
                                    </Badge>
                                    {asset.refurb_days_estimate ? (
                                        <Badge variant="secondary" className="font-mono">
                                            {asset.refurb_days_estimate} refurb day
                                            {asset.refurb_days_estimate === 1 ? "" : "s"}
                                        </Badge>
                                    ) : null}
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
