"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, ArrowRightLeft, MoreVertical, Package, Search, QrCode, MapPin } from "lucide-react";
import { useAssets } from "@/hooks/use-assets";
import { useCompanies } from "@/hooks/use-companies";
import { useAssetCategories } from "@/hooks/use-asset-categories";
import { useWarehouses } from "@/hooks/use-warehouses";
import { MoveToFamilyModal } from "@/components/assets/move-to-family-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Asset } from "@/types/asset";

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

const TYPE_STYLES: Record<string, string> = {
    INDIVIDUAL: "bg-sky-500/10 text-sky-700 border-sky-500/20",
    BATCH: "bg-orange-500/10 text-orange-700 border-orange-500/20",
};

interface AssetTableProps {
    companyFilter?: string;
}

export function AssetTable({ companyFilter }: AssetTableProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [movingAsset, setMovingAsset] = useState<Asset | null>(null);
    const ITEMS_PER_PAGE = 30;
    const [filters, setFilters] = useState({
        company: companyFilter || "all",
        category_id: "all",
        condition: "all",
        status: "all",
        warehouse: "all",
        tracking_method: "all",
    });

    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters]);

    const { data: companies } = useCompanies({ limit: "100" });
    // Filter dropdown shows categories scoped to the currently-selected
    // company (plus universals). When "all" is chosen, show every scope.
    const { data: categoriesData } = useAssetCategories(
        filters.company !== "all" ? filters.company : undefined,
        { allScopes: filters.company === "all" }
    );
    const categoryList = categoriesData?.data || [];
    const { data: warehouseData } = useWarehouses({ limit: "100" });
    const warehouseList = warehouseData?.data || [];

    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            page: String(page),
            limit: String(ITEMS_PER_PAGE),
        };
        if (debouncedSearch) params.search_term = debouncedSearch;
        if (filters.company !== "all") params.company_id = filters.company;
        if (filters.category_id !== "all") params.category_id = filters.category_id;
        if (filters.condition !== "all") params.condition = filters.condition;
        if (filters.status !== "all") params.status = filters.status;
        if (filters.warehouse !== "all") params.warehouse_id = filters.warehouse;
        if (filters.tracking_method !== "all") params.tracking_method = filters.tracking_method;
        return params;
    }, [filters, debouncedSearch, page]);

    const { data, isLoading } = useAssets(queryParams);
    const assets = data?.data || [];
    const totalAssets = Number(data?.meta?.total || assets.length);
    const totalPages = Math.max(1, Math.ceil(totalAssets / ITEMS_PER_PAGE));

    return (
        <div>
            {/* Filters */}
            <div className="mb-6 space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search assets by name, QR code..."
                            className="bg-background pl-10 font-mono"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filters.company}
                            onValueChange={(value) => setFilters((c) => ({ ...c, company: value }))}
                        >
                            <SelectTrigger className="w-[160px] font-mono">
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
                            value={filters.category_id}
                            onValueChange={(value) =>
                                setFilters((c) => ({ ...c, category_id: value }))
                            }
                        >
                            <SelectTrigger className="w-[150px] font-mono">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categoryList.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        <span className="inline-flex items-center gap-2">
                                            <span
                                                className="inline-block h-2 w-2 rounded-full shrink-0"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            {cat.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.condition}
                            onValueChange={(value) =>
                                setFilters((c) => ({ ...c, condition: value }))
                            }
                        >
                            <SelectTrigger className="w-[140px] font-mono">
                                <SelectValue placeholder="Condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Conditions</SelectItem>
                                <SelectItem value="GREEN">Green</SelectItem>
                                <SelectItem value="ORANGE">Orange</SelectItem>
                                <SelectItem value="RED">Red</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.status}
                            onValueChange={(value) => setFilters((c) => ({ ...c, status: value }))}
                        >
                            <SelectTrigger className="w-[140px] font-mono">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="AVAILABLE">Available</SelectItem>
                                <SelectItem value="BOOKED">Booked</SelectItem>
                                <SelectItem value="OUT">Out</SelectItem>
                                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.warehouse}
                            onValueChange={(value) =>
                                setFilters((c) => ({ ...c, warehouse: value }))
                            }
                        >
                            <SelectTrigger className="w-[160px] font-mono">
                                <SelectValue placeholder="Warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Warehouses</SelectItem>
                                {warehouseList.map((wh) => (
                                    <SelectItem key={wh.id} value={wh.id}>
                                        {wh.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.tracking_method}
                            onValueChange={(value) =>
                                setFilters((c) => ({ ...c, tracking_method: value }))
                            }
                        >
                            <SelectTrigger className="w-[150px] font-mono">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                <SelectItem value="BATCH">Batch</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-full bg-muted/50 p-4">
                        <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 font-mono text-lg font-semibold">No assets found</h3>
                    <p className="mb-6 max-w-md text-sm font-mono text-muted-foreground">
                        Adjust filters or create assets from the asset family pages.
                    </p>
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        {/* Table header */}
                        <div className="hidden xl:grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_80px_80px_80px_100px_120px_48px] gap-2 px-4 py-2 border-b text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                            <div>Name</div>
                            <div>Family</div>
                            <div>Category</div>
                            <div>Company</div>
                            <div>Location</div>
                            <div>Condition</div>
                            <div>Status</div>
                            <div>Type</div>
                            <div>Qty</div>
                            <div>QR</div>
                            <div />
                        </div>

                        {/* Table rows */}
                        <div className="divide-y divide-border">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="group xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_80px_80px_80px_100px_120px_48px] gap-2 px-4 py-2.5 items-center transition-colors hover:bg-muted/50 flex flex-wrap"
                                >
                                    {/* Name */}
                                    <Link
                                        href={`/assets/${asset.id}`}
                                        className="flex items-center gap-3 min-w-0"
                                    >
                                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted border border-border">
                                            {asset.images?.[0]?.url ? (
                                                <Image
                                                    src={asset.images[0].url}
                                                    alt={asset.name}
                                                    fill
                                                    className="object-contain"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <Package className="h-3.5 w-3.5 text-muted-foreground/40" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-mono text-sm font-medium truncate hover:text-primary transition-colors">
                                            {asset.name}
                                        </span>
                                    </Link>

                                    {/* Family */}
                                    <div className="font-mono text-xs text-muted-foreground truncate">
                                        {asset.family?.name || "\u2014"}
                                    </div>

                                    {/* Category */}
                                    <div>
                                        {asset.family?.category ? (
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                                style={{
                                                    borderColor: asset.family.category.color,
                                                    color: asset.family.category.color,
                                                }}
                                            >
                                                <span
                                                    className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            asset.family.category.color,
                                                    }}
                                                />
                                                {asset.family.category.name}
                                            </Badge>
                                        ) : (
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {"\u2014"}
                                            </span>
                                        )}
                                    </div>

                                    {/* Company */}
                                    <div className="font-mono text-xs text-muted-foreground truncate">
                                        {asset.company?.name || "\u2014"}
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground truncate">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate">
                                            {asset.warehouse?.name || "\u2014"} /{" "}
                                            {asset.zone?.name || "\u2014"}
                                        </span>
                                    </div>

                                    {/* Condition */}
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={`font-mono text-[10px] py-0 ${CONDITION_STYLES[asset.condition || ""] || ""}`}
                                        >
                                            {asset.condition}
                                        </Badge>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={`font-mono text-[10px] py-0 ${STATUS_STYLES[asset.status || ""] || ""}`}
                                        >
                                            {asset.status?.replace(/_/g, " ")}
                                        </Badge>
                                    </div>

                                    {/* Type */}
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={`font-mono text-[10px] py-0 ${TYPE_STYLES[asset.tracking_method || ""] || ""}`}
                                        >
                                            {asset.tracking_method}
                                        </Badge>
                                    </div>

                                    {/* Qty */}
                                    <div className="font-mono text-xs">
                                        <span className="font-semibold">
                                            {asset.available_quantity}
                                        </span>
                                        <span className="text-muted-foreground">
                                            /{asset.total_quantity}
                                        </span>
                                    </div>

                                    {/* QR */}
                                    <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                                        <QrCode className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{asset.qr_code}</span>
                                    </div>

                                    {/* Actions */}
                                    <div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        router.push(`/assets/${asset.id}`)
                                                    }
                                                    className="font-mono text-xs"
                                                >
                                                    <Eye className="h-3.5 w-3.5 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setMovingAsset(asset)}
                                                    className="font-mono text-xs"
                                                >
                                                    <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                                                    Move to Family
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6">
                    <p className="text-sm text-muted-foreground font-mono">
                        Showing {assets.length} of {totalAssets}
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

            {/* Move to Family Modal */}
            {movingAsset && (
                <MoveToFamilyModal
                    open={!!movingAsset}
                    onOpenChange={(o) => !o && setMovingAsset(null)}
                    asset={movingAsset}
                    currentFamilyName={movingAsset.family?.name}
                    onSuccess={() => setMovingAsset(null)}
                />
            )}
        </div>
    );
}
