"use client";

import Link from "next/link";
import Image from "next/image";
import { use } from "react";
import { ArrowLeft, Layers3, Package, QrCode } from "lucide-react";
import { useAssetFamilyAvailabilityStats } from "@/hooks/use-asset-family-availability-stats";
import { useAssetFamily } from "@/hooks/use-asset-families";
import { useAssets } from "@/hooks/use-assets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const formatStockMode = (stockMode?: string | null) =>
    stockMode ? stockMode.replace(/_/g, " ") : "Unknown";

const formatCount = (value?: number) => (typeof value === "number" ? value : 0);

export default function AssetFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: familyResponse, isLoading: familyLoading } = useAssetFamily(id);
    const { data: availabilityStats, isLoading: availabilityLoading } =
        useAssetFamilyAvailabilityStats(id);
    const family = familyResponse?.data || null;
    const { data: stockResponse, isLoading: stockLoading } = useAssets(
        family ? { family_id: family.id, limit: "200" } : { family_id: id, limit: "200" }
    );
    const stockRecords = stockResponse?.data || [];
    const imageUrl = family?.on_display_image || family?.images?.[0]?.url || null;

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
            <div className="border-b border-border bg-card">
                <div className="mx-auto max-w-[1400px] px-6 py-6">
                    <Button variant="ghost" asChild className="mb-4 font-mono">
                        <Link href="/assets">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Families
                        </Link>
                    </Button>

                    <div className="flex flex-col gap-6 lg:flex-row">
                        <div className="relative h-56 w-full overflow-hidden rounded-lg bg-muted lg:w-96">
                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
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
                                    {family.brand?.name ? ` • ${family.brand.name}` : ""}
                                </p>
                                {family.description && (
                                    <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                                        {family.description}
                                    </p>
                                )}
                            </div>

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
                                            Available Units
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
                                        <div className="mt-2 text-2xl font-semibold">
                                            {formatCount(family.condition_summary?.red) +
                                                formatCount(family.condition_summary?.orange)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div
                                className="grid grid-cols-2 gap-3 md:grid-cols-4"
                                data-testid="family-availability-stats"
                            >
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            Booked Units
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading
                                                ? "..."
                                                : formatCount(
                                                      availabilityStats?.data.booked_quantity
                                                  )}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            Out Units
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading
                                                ? "..."
                                                : formatCount(availabilityStats?.data.out_quantity)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            Maintenance Units
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading
                                                ? "..."
                                                : formatCount(
                                                      availabilityStats?.data
                                                          .in_maintenance_quantity
                                                  )}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            Self-Booked Units
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold">
                                            {availabilityLoading
                                                ? "..."
                                                : formatCount(
                                                      availabilityStats?.data.self_booked_quantity
                                                  )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1400px] px-6 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-mono">Stock Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stockLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <Skeleton key={index} className="h-14 w-full" />
                                ))}
                            </div>
                        ) : stockRecords.length === 0 ? (
                            <div className="py-12 text-center text-sm font-mono text-muted-foreground">
                                No stock records are linked to this family.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {stockRecords.map((asset) => (
                                    <Link key={asset.id} href={`/assets/${asset.id}`}>
                                        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50 md:flex-row md:items-center md:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="font-mono text-sm font-semibold">
                                                        {asset.name}
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[10px]"
                                                    >
                                                        {asset.tracking_method}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[10px]"
                                                    >
                                                        {asset.condition}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[10px]"
                                                    >
                                                        {asset.status.replace(/_/g, " ")}
                                                    </Badge>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                                                    <span>
                                                        {asset.warehouse?.name ||
                                                            "Unknown warehouse"}{" "}
                                                        / {asset.zone?.name || "Unknown zone"}
                                                    </span>
                                                    <span>{asset.total_quantity} total</span>
                                                    <span>
                                                        {asset.available_quantity} available
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <QrCode className="h-3 w-3" />
                                                        {asset.qr_code}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                                <Package className="h-4 w-4" />
                                                Open stock record
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
