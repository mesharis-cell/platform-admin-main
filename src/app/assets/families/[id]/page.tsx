"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useState } from "react";
import {
    ArrowLeft,
    Layers3,
    Package,
    QrCode,
    Edit,
    Trash2,
    Plus,
    Ruler,
    Weight,
    Box,
    Tag,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    MapPin,
    CircleDot,
} from "lucide-react";
import { useAssetFamilyAvailabilityStats } from "@/hooks/use-asset-family-availability-stats";
import { useAssetFamily, useDeleteAssetFamily } from "@/hooks/use-asset-families";
import { EditAssetFamilyDialog } from "@/components/assets/edit-asset-family-dialog";
import { useAssets } from "@/hooks/use-assets";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { AssetWizard } from "@/components/assets/asset-wizard";
import type { Asset } from "@/types/asset";

const formatCount = (value?: number) => (typeof value === "number" ? value : 0);
const formatDim = (val?: number) => (val != null ? `${val}` : null);

const CONDITION_STYLES: Record<string, string> = {
    GREEN: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    ORANGE: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    RED: "bg-red-500/10 text-red-700 border-red-500/20",
};

const STATUS_STYLES: Record<string, string> = {
    AVAILABLE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    BOOKED: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    OUT: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    MAINTENANCE: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    TRANSFORMED: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export default function AssetFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [imgIdx, setImgIdx] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showCreateAsset, setShowCreateAsset] = useState(false);
    const [inventorySearch, setInventorySearch] = useState("");

    const { data: familyResponse, isLoading: familyLoading } = useAssetFamily(id);
    const { data: availabilityStats, isLoading: availLoading } =
        useAssetFamilyAvailabilityStats(id);
    const family = familyResponse?.data || null;
    const { data: stockResponse, isLoading: stockLoading } = useAssets(
        family ? { family_id: family.id, limit: "200" } : { family_id: id, limit: "200" }
    );
    const inventory: Asset[] = stockResponse?.data || [];
    const deleteMutation = useDeleteAssetFamily();

    const images = family?.images || [];
    const hasImages = images.length > 0;
    const heroImage = family?.on_display_image || images[0]?.url || null;

    const dims = family?.dimensions;
    const hasSpecs =
        family?.weight_per_unit ||
        family?.volume_per_unit ||
        (dims && (dims.length || dims.width || dims.height)) ||
        family?.packaging;

    const isSerialized = family?.stock_mode === "SERIALIZED";

    const filtered = inventory.filter((asset) => {
        if (!inventorySearch) return true;
        const q = inventorySearch.toLowerCase();
        return (
            asset.name?.toLowerCase().includes(q) ||
            asset.qr_code?.toLowerCase().includes(q) ||
            asset.condition?.toLowerCase().includes(q) ||
            asset.status?.toLowerCase().includes(q)
        );
    });

    async function handleDelete() {
        if (!family) return;
        try {
            await deleteMutation.mutateAsync(family.id);
            toast.success("Family deleted");
            router.push("/assets");
        } catch {
            toast.error("Failed to delete family");
        }
    }

    if (familyLoading) {
        return (
            <div className="min-h-screen bg-background p-6">
                <div className="mx-auto max-w-[1400px] space-y-6">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-56 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        );
    }

    if (!family) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <Layers3 className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                    <h2 className="mb-2 font-mono text-xl font-semibold">Family not found</h2>
                    <Button asChild>
                        <Link href="/assets">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Families
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const totalQty = formatCount(family.total_quantity);
    const availQty = availLoading
        ? "—"
        : formatCount(availabilityStats?.data.available_quantity ?? family.available_quantity);
    const bookedQty = availLoading ? 0 : formatCount(availabilityStats?.data.booked_quantity);
    const outQty = availLoading ? 0 : formatCount(availabilityStats?.data.out_quantity);
    const maintQty = availLoading
        ? 0
        : formatCount(availabilityStats?.data.in_maintenance_quantity);
    const greenCount = formatCount(family.condition_summary?.green);
    const orangeCount = formatCount(family.condition_summary?.orange);
    const redCount = formatCount(family.condition_summary?.red);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card">
                <div className="mx-auto max-w-[1400px] px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" asChild className="font-mono">
                            <Link href="/assets">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                All Families
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="font-mono"
                                onClick={() => setShowEditDialog(true)}
                                data-testid="family-edit-btn"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="font-mono text-destructive hover:text-destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={deleteMutation.isPending}
                                data-testid="family-delete-btn"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 lg:flex-row">
                        {/* Image gallery */}
                        <div
                            className="relative h-64 w-full overflow-hidden rounded-lg bg-muted lg:w-[420px] shrink-0"
                            data-testid={
                                hasImages || heroImage ? "family-image-gallery" : "family-no-image"
                            }
                        >
                            {hasImages ? (
                                <>
                                    <Image
                                        src={images[imgIdx]?.url || heroImage || ""}
                                        alt={family.name}
                                        fill
                                        className="object-cover"
                                    />
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    setImgIdx(
                                                        (p) =>
                                                            (p - 1 + images.length) % images.length
                                                    )
                                                }
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setImgIdx((p) => (p + 1) % images.length)
                                                }
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                                                {imgIdx + 1} / {images.length}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : heroImage ? (
                                <Image
                                    src={heroImage}
                                    alt={family.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                    <Layers3 className="h-12 w-12 opacity-40" />
                                </div>
                            )}
                        </div>

                        {/* Family info */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                        {isSerialized ? "Serialized" : "Pooled"}
                                    </Badge>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {family.category}
                                    </Badge>
                                    {family.brand?.name && (
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {family.brand.name}
                                        </Badge>
                                    )}
                                    {family.team?.name && (
                                        <Badge variant="outline" className="font-mono text-xs">
                                            Team: {family.team.name}
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="font-mono text-3xl font-semibold">{family.name}</h1>
                                <p className="mt-1 text-sm font-mono text-muted-foreground">
                                    {family.company?.name || "Unknown company"}
                                </p>
                                {family.description && (
                                    <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
                                        {family.description}
                                    </p>
                                )}
                            </div>

                            {/* Availability summary — single compact row */}
                            <div data-testid="family-availability-stats">
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-mono">
                                    <div>
                                        <span className="text-muted-foreground">
                                            {isSerialized ? "Units " : "Total "}
                                        </span>
                                        <span className="font-semibold text-lg">{totalQty}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Available </span>
                                        <span className="font-semibold text-lg text-emerald-600">
                                            {availQty}
                                        </span>
                                    </div>
                                    {bookedQty > 0 && (
                                        <div>
                                            <span className="text-muted-foreground">Booked </span>
                                            <span className="font-semibold text-blue-600">
                                                {bookedQty}
                                            </span>
                                        </div>
                                    )}
                                    {outQty > 0 && (
                                        <div>
                                            <span className="text-muted-foreground">Out </span>
                                            <span className="font-semibold text-violet-600">
                                                {outQty}
                                            </span>
                                        </div>
                                    )}
                                    {maintQty > 0 && (
                                        <div>
                                            <span className="text-muted-foreground">
                                                Maintenance{" "}
                                            </span>
                                            <span className="font-semibold text-amber-600">
                                                {maintQty}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Condition dots — inline, not a separate card */}
                            <div className="flex items-center gap-4 text-xs font-mono">
                                <span className="text-muted-foreground">Condition:</span>
                                <span className="flex items-center gap-1">
                                    <CircleDot className="h-3 w-3 text-emerald-500" />
                                    {greenCount}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CircleDot className="h-3 w-3 text-amber-500" />
                                    {orangeCount}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CircleDot className="h-3 w-3 text-red-500" />
                                    {redCount}
                                </span>
                            </div>

                            {/* Specs inline — only if they exist */}
                            {hasSpecs && (
                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono text-muted-foreground">
                                    {dims && (dims.length || dims.width || dims.height) && (
                                        <span className="flex items-center gap-1">
                                            <Ruler className="h-3 w-3" />
                                            {formatDim(dims.length) ?? "—"} x{" "}
                                            {formatDim(dims.width) ?? "—"} x{" "}
                                            {formatDim(dims.height) ?? "—"} cm
                                        </span>
                                    )}
                                    {family.weight_per_unit != null && (
                                        <span className="flex items-center gap-1">
                                            <Weight className="h-3 w-3" />
                                            {Number(family.weight_per_unit).toFixed(2)} kg
                                        </span>
                                    )}
                                    {family.volume_per_unit != null && (
                                        <span className="flex items-center gap-1">
                                            <Box className="h-3 w-3" />
                                            {Number(family.volume_per_unit).toFixed(3)} m³
                                        </span>
                                    )}
                                    {family.packaging && (
                                        <span className="flex items-center gap-1">
                                            <Package className="h-3 w-3" />
                                            {family.packaging}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Handling tags */}
                            {family.handling_tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {family.handling_tags.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="outline"
                                            className="font-mono text-[10px]"
                                        >
                                            <Tag className="h-2.5 w-2.5 mr-1" />
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-4 text-[10px] font-mono text-muted-foreground pt-1">
                                <span>
                                    Created {new Date(family.created_at).toLocaleDateString()}
                                </span>
                                <span>
                                    Updated {new Date(family.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory */}
            <div className="mx-auto max-w-[1400px] px-6 py-6">
                <Card data-testid="family-stock-list">
                    <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
                        <CardTitle className="font-mono text-sm">
                            Inventory ({filtered.length})
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-56">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Filter by name, QR, condition..."
                                    value={inventorySearch}
                                    onChange={(e) => setInventorySearch(e.target.value)}
                                    className="pl-8 h-8 text-xs font-mono"
                                />
                            </div>
                            <Button
                                size="sm"
                                className="font-mono"
                                onClick={() => setShowCreateAsset(true)}
                                data-testid="family-add-stock-btn"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                {isSerialized ? "Add Units" : "Add Inventory"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        {stockLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-12 text-center text-sm font-mono text-muted-foreground">
                                {inventorySearch
                                    ? "No inventory matches your filter."
                                    : "No inventory under this family yet."}
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {filtered.map((asset) => (
                                    <Link key={asset.id} href={`/assets/${asset.id}`}>
                                        <div className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-md transition-colors hover:bg-muted/50">
                                            {/* Thumbnail */}
                                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted border border-border">
                                                {asset.images?.[0]?.url ? (
                                                    <Image
                                                        src={asset.images[0].url}
                                                        alt={asset.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center">
                                                        <Package className="h-4 w-4 text-muted-foreground/40" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name + badges */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-mono text-sm font-medium truncate">
                                                        {asset.name}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={`font-mono text-[10px] py-0 ${CONDITION_STYLES[asset.condition || ""] || ""}`}
                                                    >
                                                        {asset.condition}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className={`font-mono text-[10px] py-0 ${STATUS_STYLES[asset.status || ""] || ""}`}
                                                    >
                                                        {asset.status?.replace(/_/g, " ")}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Location */}
                                            <div className="hidden md:flex items-center gap-1 text-xs font-mono text-muted-foreground shrink-0">
                                                <MapPin className="h-3 w-3" />
                                                {asset.warehouse?.name || "—"} /{" "}
                                                {asset.zone?.name || "—"}
                                            </div>

                                            {/* Quantity */}
                                            {!isSerialized && (
                                                <div className="text-right shrink-0">
                                                    <div className="text-sm font-mono font-semibold">
                                                        {asset.available_quantity}
                                                        <span className="text-muted-foreground font-normal">
                                                            /{asset.total_quantity}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] font-mono text-muted-foreground">
                                                        avail / total
                                                    </div>
                                                </div>
                                            )}

                                            {/* QR */}
                                            <div className="hidden lg:flex items-center gap-1 text-xs font-mono text-muted-foreground shrink-0">
                                                <QrCode className="h-3 w-3" />
                                                <span className="max-w-[120px] truncate">
                                                    {asset.qr_code}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Delete Family"
                description="Are you sure? This only works if no inventory is linked to this family."
                confirmText="Delete"
                onConfirm={handleDelete}
                variant="destructive"
            />

            <EditAssetFamilyDialog
                family={family}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
            />

            <AssetWizard
                open={showCreateAsset}
                onOpenChange={setShowCreateAsset}
                preselectedFamilyId={family.id}
            />
        </div>
    );
}
