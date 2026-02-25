"use client";

/**
 * Asset Detail Page - Comprehensive View with QR Code Display
 * Phase 3: Asset Management & QR Code Generation
 *
 * Design: Industrial detail terminal with QR code scanning interface
 */

import { useEffect, useState, use } from "react";
import {
    useAsset,
    useGenerateQRCode,
    useDeleteAsset,
    useAssetVersions,
    useUploadImage,
    useUpdateAsset,
} from "@/hooks/use-assets";
import { useConditionHistory } from "@/hooks/use-conditions";
import { useAssetAvailabilityStats } from "@/hooks/use-asset-availability-stats";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    Package,
    QrCode,
    Download,
    Edit,
    Trash2,
    Warehouse,
    MapPin,
    Ruler,
    Weight,
    Box,
    Tag,
    Calendar,
    User,
    Scan,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Camera,
    X,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ConditionHistoryTimeline } from "@/components/conditions/condition-history-timeline";
import { AddNotesDialog } from "@/components/conditions/add-notes-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditAssetDialog, type EditAssetTab } from "@/components/assets/edit-asset-dialog";
import { PrintQrAction } from "@/components/qr/PrintQrAction";
import { generateQRCode } from "@/lib/services/qr-code";

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editDialogTab, setEditDialogTab] = useState<EditAssetTab>("basic");

    // Fetch asset
    const { data, isLoading: loading, error } = useAsset(id);
    const asset = data?.data || null;

    // Fetch version history
    const { data: versions } = useAssetVersions(asset?.id || null);

    // Fetch availability stats
    const { data: availabilityStats, isLoading: statsLoading } = useAssetAvailabilityStats(id);

    // Generate QR code
    const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);

    // Mutations
    const deleteMutation = useDeleteAsset();
    const uploadImageMutation = useUploadImage();
    const updateAssetMutation = useUpdateAsset();

    // Generate QR code when asset loads
    useEffect(() => {
        if (asset?.qr_code) {
            generateQRCode(asset.qr_code)
                .then((data) => {
                    setQrCodeImage(data);
                })
                .catch((error) => {
                    console.error("Failed to generate QR code:", error);
                });
        }
    }, [asset?.qr_code]);

    // Handle error
    if (error) {
        toast.error("Failed to load asset");
        router.push("/assets");
    }

    function downloadQRCode() {
        if (!qrCodeImage || !asset) return;

        if (typeof document !== "undefined") {
            const link = document.createElement("a");
            link.href = qrCodeImage;
            link.download = `QR-${asset.qr_code}.png`;
            link.click();
        }
    }

    async function handleDelete() {
        if (!asset) return;

        try {
            await deleteMutation.mutateAsync(asset.id);
            toast.success("Asset deleted successfully");
            router.push("/assets");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete asset");
        }
    }

    function handleEdit(tab: EditAssetTab = "basic") {
        setEditDialogTab(tab);
        setShowEditDialog(true);
    }

    async function handleInlinePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!asset) return;
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        e.target.value = "";

        try {
            const companyId = typeof asset.company === "string" ? asset.company : asset.company?.id;
            const fd = new FormData();
            fd.append("companyId", companyId || "");
            files.forEach((f) => fd.append("files", f));
            const result = await uploadImageMutation.mutateAsync(fd);
            const newUrls: string[] = result.data?.imageUrls || [];
            await updateAssetMutation.mutateAsync({
                id: asset.id,
                data: { images: [...asset.images, ...newUrls.map((url) => ({ url }))] } as any,
            });
            toast.success(`${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} added`);
        } catch {
            toast.error("Failed to upload photo");
        }
    }

    async function handleInlinePhotoDelete(index: number) {
        if (!asset) return;
        try {
            const newImages = asset.images.filter((_, i) => i !== index);
            await updateAssetMutation.mutateAsync({
                id: asset.id,
                data: { images: newImages } as any,
            });
            if (currentImageIndex >= newImages.length)
                setCurrentImageIndex(Math.max(0, newImages.length - 1));
            toast.success("Photo removed");
        } catch {
            toast.error("Failed to remove photo");
        }
    }

    function getConditionColor(condition: string) {
        switch (condition) {
            case "GREEN":
                return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            case "ORANGE":
                return "bg-amber-500/10 text-amber-600 border-amber-500/20";
            case "RED":
                return "bg-red-500/10 text-red-600 border-red-500/20";
            default:
                return "bg-gray-500/10 text-gray-600 border-gray-500/20";
        }
    }

    function getStatusColor(status: string) {
        switch (status) {
            case "AVAILABLE":
                return "bg-primary/10 text-primary border-primary/20";
            case "BOOKED":
                return "bg-secondary/10 text-secondary border-secondary/20";
            case "OUT":
                return "bg-purple-500/10 text-purple-600 border-purple-500/20";
            case "IN_MAINTENANCE":
                return "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20";
            default:
                return "bg-gray-500/10 text-gray-600 border-gray-500/20";
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-6">
                <div className="max-w-[1400px] mx-auto space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Skeleton className="h-96 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                        <div className="space-y-6">
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold font-mono mb-2">Asset Not Found</h2>
                    <Button asChild>
                        <Link href="/admin/assets">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Assets
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
                <div className="max-w-[1400px] mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" asChild className="font-mono">
                            <Link href="/assets">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Assets
                            </Link>
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="font-mono"
                                onClick={() => handleEdit("basic")}
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

                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <Package className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold font-mono mb-2">{asset.name}</h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge
                                    variant="outline"
                                    className={`${getConditionColor(asset.condition)} font-mono`}
                                >
                                    {asset.condition}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`${getStatusColor(asset.status)} font-mono`}
                                >
                                    {asset.status.replace("_", " ")}
                                </Badge>
                                <span className="text-sm text-muted-foreground font-mono">
                                    {asset.category}
                                </span>
                                <span className="text-sm text-muted-foreground font-mono">•</span>
                                <span className="text-sm text-muted-foreground font-mono">
                                    {asset.tracking_method}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[1400px] mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Image gallery */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
                                <CardTitle className="font-mono text-sm">
                                    Photos ({asset?.images?.length || 0})
                                </CardTitle>
                                <label htmlFor="inline-photo-upload" className="cursor-pointer">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="font-mono pointer-events-none"
                                        disabled={
                                            uploadImageMutation.isPending ||
                                            updateAssetMutation.isPending
                                        }
                                        asChild
                                    >
                                        <span>
                                            {uploadImageMutation.isPending ||
                                            updateAssetMutation.isPending ? (
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <Camera className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            Add Photo
                                        </span>
                                    </Button>
                                    <input
                                        id="inline-photo-upload"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleInlinePhotoUpload}
                                    />
                                </label>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                {asset?.images?.length > 0 ? (
                                    <>
                                        <div className="relative aspect-16/10 bg-muted rounded-lg overflow-hidden mb-4">
                                            <Image
                                                src={asset.images[currentImageIndex].url}
                                                alt={asset.name}
                                                fill
                                                className="object-cover"
                                            />
                                            <button
                                                onClick={() =>
                                                    handleInlinePhotoDelete(currentImageIndex)
                                                }
                                                className="absolute top-2 right-2 p-1.5 bg-destructive/90 text-destructive-foreground rounded-md hover:bg-destructive transition-colors"
                                                title="Remove this photo"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>

                                            {asset.images.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            setCurrentImageIndex(
                                                                (prev) =>
                                                                    (prev -
                                                                        1 +
                                                                        asset.images.length) %
                                                                    asset.images.length
                                                            )
                                                        }
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/90 backdrop-blur-sm rounded-full border border-border hover:bg-background transition-colors"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setCurrentImageIndex(
                                                                (prev) =>
                                                                    (prev + 1) % asset.images.length
                                                            )
                                                        }
                                                        className="absolute right-10 top-1/2 -translate-y-1/2 p-2 bg-background/90 backdrop-blur-sm rounded-full border border-border hover:bg-background transition-colors"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {asset.images[currentImageIndex]?.note && (
                                            <p className="text-xs text-muted-foreground italic px-1 py-1">
                                                {asset.images[currentImageIndex].note}
                                            </p>
                                        )}

                                        {asset.images.length > 1 && (
                                            <div className="flex gap-2 overflow-x-auto">
                                                {asset.images.map((img, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => setCurrentImageIndex(index)}
                                                        className={`relative w-20 h-20 shrink-0 rounded-md overflow-hidden border-2 ${
                                                            index === currentImageIndex
                                                                ? "border-primary"
                                                                : "border-border hover:border-primary/50"
                                                        } transition-colors`}
                                                    >
                                                        <Image
                                                            src={img.url}
                                                            alt={`Thumbnail ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Camera className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm font-mono">No photos yet</p>
                                        <p className="text-xs font-mono mt-1">
                                            Use "Add Photo" above to upload
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Description */}
                        {asset?.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-mono text-sm">Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                                        {asset?.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Physical Specifications */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Ruler className="w-4 h-4 text-primary" />
                                    Physical Specifications
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-mono h-7 px-2 text-xs"
                                    onClick={() => handleEdit("specs")}
                                >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Length
                                        </p>
                                        <p className="text-sm font-semibold font-mono">
                                            {asset?.dimensions?.length} cm
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Width
                                        </p>
                                        <p className="text-sm font-semibold font-mono">
                                            {asset?.dimensions?.width} cm
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Height
                                        </p>
                                        <p className="text-sm font-semibold font-mono">
                                            {asset?.dimensions?.height} cm
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Weight
                                        </p>
                                        <p className="text-sm font-semibold font-mono">
                                            {asset?.weight_per_unit} kg
                                        </p>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Total Volume
                                        </p>
                                        <p className="text-lg font-bold font-mono text-primary">
                                            {asset?.volume_per_unit} m³
                                        </p>
                                    </div>

                                    {asset?.handling_tags?.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Handling Requirements
                                            </p>
                                            <div className="flex flex-wrap gap-1 justify-end">
                                                {asset?.handling_tags?.map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="outline"
                                                        className="font-mono text-[10px]"
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Location */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    Storage Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Warehouse className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Warehouse
                                        </p>
                                        <p className="text-sm font-semibold font-mono">
                                            {asset?.warehouse?.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            {asset?.warehouse?.city}
                                        </p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-start gap-3">
                                    <Box className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Zone
                                        </p>
                                        <p className="text-sm font-semibold font-mono">
                                            {asset?.zone?.name}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* QR Code */}
                        <Card className="border-primary/20">
                            <CardHeader className="bg-primary/5">
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <QrCode className="w-4 h-4 text-primary" />
                                    QR Code
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {qrCodeImage ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white rounded-lg border-2 border-border">
                                            <img
                                                src={qrCodeImage}
                                                alt="QR Code"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground font-mono text-center">
                                                {asset?.qr_code}
                                            </p>
                                            <Button
                                                onClick={downloadQRCode}
                                                className="w-full font-mono"
                                                size="sm"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download QR Code
                                            </Button>
                                            <PrintQrAction
                                                qrCode={asset?.qr_code}
                                                assetName={asset?.name}
                                                meta={
                                                    [asset?.category, asset?.tracking_method]
                                                        .filter(Boolean)
                                                        .join(" · ") || undefined
                                                }
                                                className="w-full font-mono"
                                                size="sm"
                                                variant="outline"
                                                iconOnly={false}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-square flex items-center justify-center bg-muted rounded-lg">
                                        <QrCode className="w-12 h-12 text-muted-foreground animate-pulse" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Inventory Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Package className="w-4 h-4 text-primary" />
                                    Inventory Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm font-mono">
                                        <span className="text-muted-foreground">
                                            Total Quantity
                                        </span>
                                        <span className="font-semibold">
                                            {asset?.total_quantity}
                                        </span>
                                    </div>
                                    <Separator />

                                    {/* Real-time availability breakdown */}
                                    {statsLoading ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-6 w-full" />
                                            <Skeleton className="h-6 w-full" />
                                            <Skeleton className="h-6 w-full" />
                                            <Skeleton className="h-6 w-full" />
                                        </div>
                                    ) : availabilityStats.data ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm font-mono">
                                                <span className="text-emerald-600">Available</span>
                                                <span className="font-semibold text-emerald-600">
                                                    {availabilityStats.data.available_quantity}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm font-mono">
                                                <span className="text-amber-600">Booked</span>
                                                <span className="font-semibold text-amber-600">
                                                    {availabilityStats.data.booked_quantity}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm font-mono">
                                                <span className="text-purple-600">Out</span>
                                                <span className="font-semibold text-purple-600">
                                                    {availabilityStats.data.out_quantity}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm font-mono">
                                                <span className="text-muted-foreground">
                                                    In Maintenance
                                                </span>
                                                <span className="font-semibold">
                                                    {availabilityStats.data.in_maintenance_quantity}
                                                </span>
                                            </div>
                                            {(availabilityStats.data as any).self_booked_quantity >
                                                0 && (
                                                <div className="flex items-center justify-between text-sm font-mono">
                                                    <span className="text-blue-600">
                                                        Self-Booked
                                                    </span>
                                                    <span className="font-semibold text-blue-600">
                                                        {
                                                            (availabilityStats.data as any)
                                                                .self_booked_quantity
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-md">
                                            <p className="text-xs font-mono text-blue-600 mb-1">
                                                ℹ️ Date-Based Availability
                                            </p>
                                            <p className="text-xs font-mono text-muted-foreground">
                                                Availability calculated based on event dates and
                                                bookings.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {asset?.packaging && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Packaging
                                            </p>
                                            <p className="text-sm font-mono">{asset.packaging}</p>
                                        </div>
                                    </>
                                )}

                                {/* Feedback #2: Display refurb estimate for damaged items */}
                                {asset?.refurb_days_estimate &&
                                    (asset?.condition === "ORANGE" ||
                                        asset?.condition === "RED") && (
                                        <>
                                            <Separator />
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    Estimated Refurb Time
                                                </p>
                                                <p className="text-sm font-mono font-semibold text-amber-600">
                                                    ~{asset.refurb_days_estimate} days
                                                </p>
                                            </div>
                                        </>
                                    )}
                            </CardContent>
                        </Card>

                        {/* Company & Brand */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-primary" />
                                    Organization
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-mono">
                                        Company
                                    </p>
                                    <p className="text-sm font-semibold font-mono">
                                        {asset?.company?.name}
                                    </p>
                                </div>
                                {asset?.brand && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Brand
                                            </p>
                                            <p className="text-sm font-semibold font-mono">
                                                {asset?.brand?.name}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Metadata */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    Metadata
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs font-mono">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Created</p>
                                    <p>{new Date(asset?.created_at).toLocaleString()}</p>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Last Updated</p>
                                    <p>{new Date(asset?.updated_at).toLocaleString()}</p>
                                </div>
                                {asset?.last_scanned_at && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground">Last Scanned</p>
                                            <p>
                                                {new Date(asset?.last_scanned_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Condition History - Phase 12 */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="flex items-center gap-2 font-mono text-sm">
                                        <AlertCircle className="h-4 w-4 text-primary" />
                                        Condition History
                                    </CardTitle>
                                    <div className="flex gap-2 shrink-0">
                                        <AddNotesDialog
                                            assetId={asset.id}
                                            assetName={asset.name}
                                            onSuccess={() => {}}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {asset?.condition_history ? (
                                    <ConditionHistoryTimeline
                                        history={asset?.condition_history}
                                        assetName={asset.name}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center py-8">
                                        <Skeleton className="h-32 w-full" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Version History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Version History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {versions && versions.length > 0 ? (
                                    <div className="space-y-1 relative">
                                        {versions.map((v: any, idx: number) => {
                                            const snap = v.snapshot || {};
                                            const isFirst = idx === 0;
                                            return (
                                                <div key={v.id} className="flex gap-3 py-2">
                                                    <div className="flex flex-col items-center">
                                                        <div
                                                            className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${isFirst ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/40"}`}
                                                        />
                                                        {idx < versions.length - 1 && (
                                                            <div className="w-px flex-1 bg-border min-h-[20px]" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono font-bold text-muted-foreground">
                                                                v{v.version_number}
                                                            </span>
                                                            <span className="text-sm font-semibold">
                                                                {v.reason}
                                                            </span>
                                                            {snap.condition &&
                                                                snap.condition !== "GREEN" && (
                                                                    <span
                                                                        className={`text-xs font-mono px-1.5 py-0.5 rounded ${snap.condition === "RED" ? "bg-destructive/10 text-destructive" : "bg-orange-500/10 text-orange-600"}`}
                                                                    >
                                                                        {snap.condition}
                                                                    </span>
                                                                )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {new Date(
                                                                v.created_at
                                                            ).toLocaleDateString()}{" "}
                                                            {new Date(
                                                                v.created_at
                                                            ).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>
                                                        {snap.images?.[0] && (
                                                            <div className="mt-2 w-16 h-12 rounded overflow-hidden bg-muted">
                                                                <img
                                                                    src={snap.images[0]}
                                                                    alt="Snapshot"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground py-4 text-center">
                                        No version history yet
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Edit Asset Dialog */}
            {asset && (
                <EditAssetDialog
                    asset={asset}
                    open={showEditDialog}
                    onOpenChange={setShowEditDialog}
                    defaultTab={editDialogTab}
                    onSuccess={() => setShowEditDialog(false)}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                onConfirm={handleDelete}
                title="Delete Asset"
                description={`Are you sure you want to delete "${asset.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />
        </div>
    );
}
