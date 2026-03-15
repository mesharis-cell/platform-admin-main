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
    AlertTriangle,
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
import { CreateAssetDialog } from "@/components/assets/create-asset-dialog";
import type { Asset } from "@/types/asset";

const formatStockMode = (stockMode?: string | null) =>
    stockMode ? stockMode.replace(/_/g, " ") : "Unknown";

const formatCount = (value?: number) => (typeof value === "number" ? value : 0);

const formatDimension = (val?: number) => (val != null ? `${val}` : null);

const getConditionColor = (condition?: string) => {
    switch (condition) {
        case "GREEN":
            return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
        case "ORANGE":
            return "bg-amber-500/10 text-amber-700 border-amber-500/20";
        case "RED":
            return "bg-red-500/10 text-red-700 border-red-500/20";
        default:
            return "";
    }
};

const getStatusColor = (status?: string) => {
    switch (status) {
        case "AVAILABLE":
            return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
        case "BOOKED":
            return "bg-blue-500/10 text-blue-700 border-blue-500/20";
        case "OUT":
            return "bg-violet-500/10 text-violet-700 border-violet-500/20";
        case "MAINTENANCE":
            return "bg-amber-500/10 text-amber-700 border-amber-500/20";
        case "TRANSFORMED":
            return "bg-gray-500/10 text-gray-600 border-gray-500/20";
        default:
            return "";
    }
};

export default function AssetFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showCreateAsset, setShowCreateAsset] = useState(false);
    const [stockSearch, setStockSearch] = useState("");

    const { data: familyResponse, isLoading: familyLoading } = useAssetFamily(id);
    const { data: availabilityStats, isLoading: availabilityLoading } =
        useAssetFamilyAvailabilityStats(id);
    const family = familyResponse?.data || null;
    const { data: stockResponse, isLoading: stockLoading } = useAssets(
        family ? { family_id: family.id, limit: "200" } : { family_id: id, limit: "200" }
    );
    const stockRecords: Asset[] = stockResponse?.data || [];
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

    const filteredStock = stockRecords.filter((asset) => {
        if (!stockSearch) return true;
        const q = stockSearch.toLowerCase();
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
                    <h2 className="mb-2 font-mono text-xl font-semibold">Asset family not found</h2>
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

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card">
                <div className="mx-auto max-w-[1400px] px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" asChild className="font-mono">
                            <Link href="/assets">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Families
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="font-mono"
                                onClick={() => setShowEditDialog(true)}
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
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 lg:flex-row">
                        {/* Image gallery */}
                        <div className="relative h-56 w-full overflow-hidden rounded-lg bg-muted lg:w-96 shrink-0">
                            {hasImages ? (
                                <>
                                    <Image
                                        src={images[currentImageIndex]?.url || heroImage || ""}
                                        alt={family.name}
                                        fill
                                        className="object-cover"
                                    />
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    setCurrentImageIndex(
                                                        (prev) =>
                                                            (prev - 1 + images.length) %
                                                            images.length
                                                    )
                                                }
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setCurrentImageIndex(
                                                        (prev) => (prev + 1) % images.length
                                                    )
                                                }
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                                                {currentImageIndex + 1} / {images.length}
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
                                <div className="mb-2 flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="font-mono">
                                        {formatStockMode(family.stock_mode)}
                                    </Badge>
                                    <Badge variant="outline" className="font-mono">
                                        {family.category}
                                    </Badge>
                                    {family.team?.name && (
                                        <Badge variant="outline" className="font-mono">
                                            Team: {family.team.name}
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="font-mono text-3xl font-semibold">{family.name}</h1>
                                <p className="mt-2 text-sm font-mono text-muted-foreground">
                                    {family.company?.name || "Unknown company"}
                                    {family.brand?.name ? ` \u2022 ${family.brand.name}` : ""}
                                </p>
                                {family.description && (
                                    <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                                        {family.description}
                                    </p>
                                )}
                            </div>

                            {/* Stats row 1 */}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            Stock Records
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {formatCount(
                                                family.stock_record_count ?? family.asset_count
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            Total Units
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {formatCount(family.total_quantity)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            Available
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading
                                                ? "..."
                                                : formatCount(
                                                      availabilityStats?.data.available_quantity ??
                                                          family.available_quantity
                                                  )}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            Attention
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold text-amber-600">
                                            {formatCount(family.condition_summary?.red) +
                                                formatCount(family.condition_summary?.orange)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Stats row 2 - availability breakdown */}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="family-availability-stats">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">Booked</div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading ? "..." : formatCount(availabilityStats?.data.booked_quantity)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">Out</div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading ? "..." : formatCount(availabilityStats?.data.out_quantity)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">Maintenance</div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading ? "..." : formatCount(availabilityStats?.data.in_maintenance_quantity)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">Self-Booked</div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading ? "..." : formatCount(availabilityStats?.data.self_booked_quantity)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
                {/* Physical Specs + Handling Tags */}
                {(hasSpecs || family.handling_tags?.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {hasSpecs && (
                            <Card>
                                <CardHeader className="py-3 px-6">
                                    <CardTitle className="font-mono text-sm">
                                        Default Specifications
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-6 pb-6">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {dims &&
                                            (dims.length || dims.width || dims.height) && (
                                                <div className="flex items-start gap-2">
                                                    <Ruler className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            Dimensions (L x W x H)
                                                        </div>
                                                        <div className="font-mono">
                                                            {formatDimension(dims.length) ?? "—"} x{" "}
                                                            {formatDimension(dims.width) ?? "—"} x{" "}
                                                            {formatDimension(dims.height) ?? "—"} cm
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        {family.weight_per_unit != null && (
                                            <div className="flex items-start gap-2">
                                                <Weight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                                <div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        Weight
                                                    </div>
                                                    <div className="font-mono">
                                                        {Number(family.weight_per_unit).toFixed(2)} kg
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {family.volume_per_unit != null && (
                                            <div className="flex items-start gap-2">
                                                <Box className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                                <div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        Volume
                                                    </div>
                                                    <div className="font-mono">
                                                        {Number(family.volume_per_unit).toFixed(3)} m&sup3;
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {family.packaging && (
                                            <div className="flex items-start gap-2">
                                                <Package className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                                <div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        Packaging
                                                    </div>
                                                    <div className="font-mono">
                                                        {family.packaging}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {family.handling_tags?.length > 0 && (
                            <Card>
                                <CardHeader className="py-3 px-6">
                                    <CardTitle className="font-mono text-sm">
                                        Handling Tags
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-6 pb-6">
                                    <div className="flex flex-wrap gap-2">
                                        {family.handling_tags.map((tag) => (
                                            <Badge
                                                key={tag}
                                                variant="outline"
                                                className="font-mono"
                                            >
                                                <Tag className="h-3 w-3 mr-1" />
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Condition breakdown */}
                {family.condition_summary && (
                    <Card>
                        <CardHeader className="py-3 px-6">
                            <CardTitle className="font-mono text-sm">Condition Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                    <span className="text-sm font-mono">
                                        Green: {formatCount(family.condition_summary.green)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                                    <span className="text-sm font-mono">
                                        Orange: {formatCount(family.condition_summary.orange)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-red-500" />
                                    <span className="text-sm font-mono">
                                        Red: {formatCount(family.condition_summary.red)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Metadata */}
                <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created: {new Date(family.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Updated: {new Date(family.updated_at).toLocaleDateString()}
                    </span>
                </div>

                <Separator />

                {/* Stock Records */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
                        <CardTitle className="font-mono text-sm">
                            Stock Records ({filteredStock.length})
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-56">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search records..."
                                    value={stockSearch}
                                    onChange={(e) => setStockSearch(e.target.value)}
                                    className="pl-8 h-8 text-xs font-mono"
                                />
                            </div>
                            <Button
                                size="sm"
                                className="font-mono"
                                onClick={() => setShowCreateAsset(true)}
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Add Stock
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        {stockLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <Skeleton key={index} className="h-14 w-full" />
                                ))}
                            </div>
                        ) : filteredStock.length === 0 ? (
                            <div className="py-12 text-center text-sm font-mono text-muted-foreground">
                                {stockSearch
                                    ? "No stock records match your search."
                                    : "No stock records are linked to this family."}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredStock.map((asset) => (
                                    <Link key={asset.id} href={`/assets/${asset.id}`}>
                                        <div className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:border-primary/50">
                                            {/* Thumbnail */}
                                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
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

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-sm font-semibold truncate">
                                                        {asset.name}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`font-mono text-[10px] ${getConditionColor(asset.condition)}`}
                                                    >
                                                        {asset.condition}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className={`font-mono text-[10px] ${getStatusColor(asset.status)}`}
                                                    >
                                                        {asset.status?.replace(/_/g, " ")}
                                                    </Badge>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-3 text-xs font-mono text-muted-foreground">
                                                    <span>
                                                        {asset.warehouse?.name || "—"} /{" "}
                                                        {asset.zone?.name || "—"}
                                                    </span>
                                                    <span>{asset.total_quantity} total</span>
                                                    <span>{asset.available_quantity} avail</span>
                                                    <span className="flex items-center gap-1">
                                                        <QrCode className="h-3 w-3" />
                                                        {asset.qr_code}
                                                    </span>
                                                </div>
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
                description="Are you sure you want to delete this asset family? This will only work if no stock records are linked."
                confirmText="Delete"
                onConfirm={handleDelete}
                loading={deleteMutation.isPending}
                variant="destructive"
            />

            <EditAssetFamilyDialog
                family={family}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
            />

            {showCreateAsset && (
                <CreateAssetDialog
                    open={showCreateAsset}
                    onOpenChange={setShowCreateAsset}
                    defaultFamilyId={family.id}
                />
            )}
        </div>
    );
}
