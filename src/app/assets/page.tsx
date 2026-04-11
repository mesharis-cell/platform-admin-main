"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Grid3x3, Layers3, List, Plus, Search, Upload } from "lucide-react";
import { useAssetFamilies } from "@/hooks/use-asset-families";
import { useCompanies } from "@/hooks/use-companies";
import { AssetWizard } from "@/components/assets/asset-wizard";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { usePlatform } from "@/contexts/platform-context";
import type { AssetFamily } from "@/types/asset-family";

const DEFAULT_CATEGORIES = ["Furniture", "Glassware", "Installation", "Decor"];

const formatStockMode = (stockMode?: string | null) =>
    stockMode ? stockMode.replace(/_/g, " ") : "Unknown";

const formatCount = (value?: number) => (typeof value === "number" ? value : 0);

function FamilyCard({ family, compact = false }: { family: AssetFamily; compact?: boolean }) {
    const redCount = formatCount(family.condition_summary?.red);
    const orangeCount = formatCount(family.condition_summary?.orange);
    const stockRecordCount = formatCount(family.stock_record_count ?? family.asset_count);
    const totalQuantity = formatCount(family.total_quantity);
    const availableQuantity = formatCount(family.available_quantity);
    const imageUrl = family.on_display_image || family.images[0]?.url || null;

    return (
        <Link href={`/assets/families/${family.id}`}>
            <Card className="group h-full overflow-hidden transition-colors hover:border-primary/50">
                <div className={`relative bg-muted ${compact ? "aspect-[3/2]" : "aspect-[4/3]"}`}>
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={family.name}
                            fill
                            className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <Layers3 className="h-10 w-10 opacity-40" />
                        </div>
                    )}
                    <div className="absolute left-3 top-3 flex gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                            {formatStockMode(family.stock_mode)}
                        </Badge>
                        {(redCount > 0 || orangeCount > 0) && (
                            <Badge variant="destructive" className="font-mono text-[10px]">
                                {redCount} red / {orangeCount} orange
                            </Badge>
                        )}
                        {family.low_stock_threshold != null &&
                            Number(family.available_quantity || 0) < Number(family.low_stock_threshold) && (
                            <Badge variant="destructive" className="font-mono text-[10px] bg-amber-500">
                                LOW STOCK
                            </Badge>
                        )}
                    </div>
                </div>
                <CardContent className="space-y-3 p-4">
                    <div>
                        <h3 className="line-clamp-1 font-mono text-sm font-semibold transition-colors group-hover:text-primary">
                            {family.name}
                        </h3>
                        <p className="mt-1 text-xs font-mono text-muted-foreground">
                            {family.company?.name || "Unknown company"} • {family.category}
                        </p>
                        {family.brand?.name && (
                            <p className="mt-1 text-xs font-mono text-muted-foreground">
                                Brand: {family.brand.name}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono pt-1">
                        <div>
                            <span className="text-muted-foreground">
                                {family.stock_mode === "SERIALIZED" ? "Units " : "Total "}
                            </span>
                            <span className="font-semibold">{totalQuantity}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Available </span>
                            <span className="font-semibold text-emerald-600">
                                {availableQuantity}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function AssetsPage() {
    const { user } = useToken();
    const { platform } = usePlatform();
    const router = useRouter();
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showWizard, setShowWizard] = useState(false);
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 24;
    const [filters, setFilters] = useState({
        company: "all",
        category: "all",
        stockMode: "all",
    });

    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    const { data: companies } = useCompanies({ limit: "100" });
    const canCreateAsset = hasPermission(user, ADMIN_ACTION_PERMISSIONS.assetsCreate);
    const canBulkUploadAsset = hasPermission(user, ADMIN_ACTION_PERMISSIONS.assetsBulkUpload);
    const bulkUploadEnabled = platform?.features?.enable_asset_bulk_upload === true;

    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            page: String(page),
            limit: String(ITEMS_PER_PAGE),
        };
        if (debouncedSearch) params.search_term = debouncedSearch;
        if (filters.company !== "all") params.company_id = filters.company;
        if (filters.category !== "all") params.category = filters.category;
        if (filters.stockMode !== "all") params.stock_mode = filters.stockMode;
        return params;
    }, [filters, debouncedSearch, page]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters]);

    const { data, isLoading } = useAssetFamilies(queryParams);
    const families = data?.data || [];
    const totalFamilies = Number((data as any)?.meta?.total || families.length);
    const totalPages = Math.max(1, Math.ceil(totalFamilies / ITEMS_PER_PAGE));

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Layers3}
                title="ASSET FAMILIES"
                description="Catalog Identity · Stock Overview · Physical Records"
                stats={{ label: "TOTAL FAMILIES", value: totalFamilies }}
                actions={
                    canCreateAsset || (canBulkUploadAsset && bulkUploadEnabled) ? (
                        <div className="flex gap-2">
                            {canBulkUploadAsset && bulkUploadEnabled && (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="font-mono"
                                    onClick={() => router.push("/assets/bulk-upload")}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Bulk Upload
                                </Button>
                            )}
                            {canCreateAsset && (
                                <Button onClick={() => setShowWizard(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Asset
                                </Button>
                            )}
                        </div>
                    ) : undefined
                }
            />

            <div className="mx-auto max-w-[1600px] px-6 py-8">
                <div className="mb-6 space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search asset families..."
                                className="bg-background pl-10 font-mono"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Select
                                value={filters.company}
                                onValueChange={(value) =>
                                    setFilters((current) => ({ ...current, company: value }))
                                }
                            >
                                <SelectTrigger className="w-[180px] font-mono">
                                    <SelectValue placeholder="Company" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Companies</SelectItem>
                                    {(companies?.data || []).map((company) => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.category}
                                onValueChange={(value) =>
                                    setFilters((current) => ({ ...current, category: value }))
                                }
                            >
                                <SelectTrigger className="w-[160px] font-mono">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {DEFAULT_CATEGORIES.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.stockMode}
                                onValueChange={(value) =>
                                    setFilters((current) => ({ ...current, stockMode: value }))
                                }
                            >
                                <SelectTrigger className="w-[160px] font-mono">
                                    <SelectValue placeholder="Stock Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stock Modes</SelectItem>
                                    <SelectItem value="SERIALIZED">Serialized</SelectItem>
                                    <SelectItem value="POOLED">Pooled</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex overflow-hidden rounded-lg border border-border">
                                <Button
                                    variant={viewMode === "grid" ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("grid")}
                                    className="rounded-none border-r border-border"
                                >
                                    <Grid3x3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === "list" ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("list")}
                                    className="rounded-none"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div
                        className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                                : "space-y-4"
                        }
                    >
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Card key={index} className="overflow-hidden">
                                <Skeleton className="h-48 w-full" />
                                <CardContent className="space-y-3 p-4">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-3 w-2/3" />
                                    <Skeleton className="h-16 w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : families.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 rounded-full bg-muted/50 p-4">
                            <Layers3 className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 font-mono text-lg font-semibold">
                            No asset families found
                        </h3>
                        <p className="mb-6 max-w-md text-sm font-mono text-muted-foreground">
                            Existing stock records are grouped, but new family-first browsing only
                            shows families. Adjust filters or create stock from the current asset
                            workflows.
                        </p>
                    </div>
                ) : viewMode === "grid" ? (
                    <div
                        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                        data-testid="family-list"
                    >
                        {families.map((family) => (
                            <FamilyCard key={family.id} family={family} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4" data-testid="family-list">
                        {families.map((family) => (
                            <FamilyCard key={family.id} family={family} compact />
                        ))}
                    </div>
                )}
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6">
                        <p className="text-sm text-muted-foreground font-mono">
                            Showing {families.length} of {totalFamilies}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Previous
                            </Button>
                            <span className="text-sm font-mono text-muted-foreground">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <AssetWizard open={showWizard} onOpenChange={setShowWizard} />
        </div>
    );
}
