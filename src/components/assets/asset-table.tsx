"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ChevronDown,
    ChevronRight,
    Grid3X3,
    Layers3,
    List,
    MapPin,
    Package,
    Search,
} from "lucide-react";
import { useAssets } from "@/hooks/use-assets";
import { useAssetCategories } from "@/hooks/use-asset-categories";
import { useBrands } from "@/hooks/use-brands";
import { useCompanies } from "@/hooks/use-companies";
import { useWarehouses } from "@/hooks/use-warehouses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { Asset } from "@/types/asset";

type InventoryItem =
    | { kind: "asset"; id: string; asset: Asset; assets: Asset[] }
    | { kind: "group"; id: string; name: string; assets: Asset[] };

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

const STOCK_MODE_LABELS: Record<string, string> = {
    SERIALIZED: "Serialized",
    POOLED: "Pooled",
};

const ITEMS_PER_PAGE = 30;
const GROUPED_ITEMS_PER_PAGE = 200;

const getGroupId = (asset: Asset) => asset.group_id || asset.groupId || null;
const getGroupName = (asset: Asset) => asset.group_name || asset.groupName || null;
const getAssetImage = (asset: Asset) =>
    (asset as any).on_display_image || asset.images?.[0]?.url || null;
const getGroupImage = (assets: Asset[]) => {
    for (const asset of assets) {
        const image = (asset as any).group_on_display_image || asset.group_images?.[0]?.url;
        if (image) return image;
    }
    return getAssetImage(assets[0]);
};

const formatDate = (value?: string | Date | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
};

function useDebouncedValue(value: string, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [delay, value]);
    return debounced;
}

function toInventoryItems(assets: Asset[], foldGroups: boolean): InventoryItem[] {
    if (!foldGroups) {
        return assets.map((asset) => ({ kind: "asset", id: asset.id, asset, assets: [asset] }));
    }

    const byGroup = new Map<string, Asset[]>();
    const raw: InventoryItem[] = [];
    for (const asset of assets) {
        const groupId = getGroupId(asset);
        if (!groupId) {
            raw.push({ kind: "asset", id: asset.id, asset, assets: [asset] });
            continue;
        }
        byGroup.set(groupId, [...(byGroup.get(groupId) || []), asset]);
    }

    const grouped = Array.from(byGroup.entries()).map(([id, siblings]) => ({
        kind: "group" as const,
        id,
        name: getGroupName(siblings[0]) || siblings[0].name,
        assets: siblings,
    }));

    return [...grouped, ...raw].sort((a, b) => {
        const aDate = a.assets[0]?.created_at || "";
        const bDate = b.assets[0]?.created_at || "";
        return bDate.localeCompare(aDate);
    });
}

function itemStats(item: InventoryItem) {
    const assets = item.assets;
    return {
        company: assets[0]?.company?.name || "-",
        brand: assets[0]?.brand?.name || "-",
        category: assets[0]?.category || "-",
        warehouse: assets[0]?.warehouse?.name || "-",
        zone: assets[0]?.zone?.name || "-",
        stockMode: STOCK_MODE_LABELS[assets[0]?.stock_mode || ""] || "-",
        total: assets.reduce((sum, asset) => sum + Number(asset.total_quantity || 0), 0),
        available: assets.reduce((sum, asset) => sum + Number(asset.available_quantity || 0), 0),
        red: assets.filter((asset) => asset.condition === "RED").length,
        orange: assets.filter((asset) => asset.condition === "ORANGE").length,
    };
}

function ConditionBadge({ condition }: { condition?: string }) {
    if (!condition) return null;
    return (
        <Badge
            variant="outline"
            className={`font-mono text-[10px] ${CONDITION_STYLES[condition] || ""}`}
        >
            {condition}
        </Badge>
    );
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return null;
    return (
        <Badge variant="outline" className={`font-mono text-[10px] ${STATUS_STYLES[status] || ""}`}>
            {status.replace(/_/g, " ")}
        </Badge>
    );
}

function InventoryImage({ item }: { item: InventoryItem }) {
    const image = item.kind === "group" ? getGroupImage(item.assets) : getAssetImage(item.asset);
    const label = item.kind === "group" ? item.name : item.asset.name;
    return (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {image ? (
                <Image src={image} alt={label} fill className="object-contain" />
            ) : (
                <div className="flex h-full w-full items-center justify-center">
                    {item.kind === "group" ? (
                        <Layers3 className="h-4 w-4 text-muted-foreground/40" />
                    ) : (
                        <Package className="h-4 w-4 text-muted-foreground/40" />
                    )}
                </div>
            )}
        </div>
    );
}

function SiblingList({ assets }: { assets: Asset[] }) {
    return (
        <div className="col-span-full bg-muted/25 px-4 py-3">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => (
                    <Link
                        key={asset.id}
                        href={`/assets/${asset.id}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-primary/50"
                    >
                        <span className="min-w-0 truncate font-mono font-medium">{asset.name}</span>
                        <span className="shrink-0 text-muted-foreground">{asset.qr_code}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function AssetTable() {
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search);
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<"rows" | "cards">("rows");
    const [foldGroups, setFoldGroups] = useState(false);
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        company_id: "all",
        brand_id: "all",
        category_id: "all",
        condition: "all",
        status: "all",
        warehouse_id: "all",
        stock_mode: "all",
    });

    useEffect(() => setPage(1), [debouncedSearch, filters, foldGroups]);

    const { data: companiesData } = useCompanies({ limit: "200" });
    const { data: brandsData } = useBrands(
        filters.company_id !== "all"
            ? { company_id: filters.company_id, limit: "200" }
            : { limit: "200" }
    );
    const { data: categoriesData } = useAssetCategories(
        filters.company_id !== "all" ? filters.company_id : undefined,
        { allScopes: filters.company_id === "all" }
    );
    const { data: warehousesData } = useWarehouses({ limit: "200" });

    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            page: String(page),
            limit: String(foldGroups ? GROUPED_ITEMS_PER_PAGE : ITEMS_PER_PAGE),
        };
        if (debouncedSearch) params.search_term = debouncedSearch;
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== "all") params[key] = value;
        });
        return params;
    }, [debouncedSearch, filters, foldGroups, page]);

    const { data, isLoading } = useAssets(queryParams);
    const assets = data?.data || [];
    const totalAssets = Number(data?.meta?.total || assets.length);
    const totalPages = Math.max(1, Math.ceil(totalAssets / ITEMS_PER_PAGE));
    const items = useMemo(() => toInventoryItems(assets, foldGroups), [assets, foldGroups]);

    const updateFilter = (key: keyof typeof filters, value: string) => {
        setFilters((current) => ({
            ...current,
            [key]: value,
            ...(key === "company_id" ? { brand_id: "all", category_id: "all" } : {}),
        }));
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3 border-b border-border bg-card px-4 py-4">
                <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, QR code, or group"
                            className="pl-10 font-mono"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filters.company_id}
                            onValueChange={(value) => updateFilter("company_id", value)}
                        >
                            <SelectTrigger className="w-[170px] font-mono">
                                <SelectValue placeholder="Company" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All companies</SelectItem>
                                {(companiesData?.data || []).map((company) => (
                                    <SelectItem key={company.id} value={company.id}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.brand_id}
                            onValueChange={(value) => updateFilter("brand_id", value)}
                        >
                            <SelectTrigger className="w-[160px] font-mono">
                                <SelectValue placeholder="Brand" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All brands</SelectItem>
                                {(brandsData?.data || []).map((brand) => (
                                    <SelectItem key={brand.id} value={brand.id}>
                                        {brand.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.category_id}
                            onValueChange={(value) => updateFilter("category_id", value)}
                        >
                            <SelectTrigger className="w-[165px] font-mono">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {(categoriesData?.data || [])
                                    .filter((category) => category.is_active)
                                    .map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.condition}
                            onValueChange={(value) => updateFilter("condition", value)}
                        >
                            <SelectTrigger className="w-[140px] font-mono">
                                <SelectValue placeholder="Condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All condition</SelectItem>
                                <SelectItem value="GREEN">GREEN</SelectItem>
                                <SelectItem value="ORANGE">ORANGE</SelectItem>
                                <SelectItem value="RED">RED</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.status}
                            onValueChange={(value) => updateFilter("status", value)}
                        >
                            <SelectTrigger className="w-[140px] font-mono">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="AVAILABLE">Available</SelectItem>
                                <SelectItem value="BOOKED">Booked</SelectItem>
                                <SelectItem value="OUT">Out</SelectItem>
                                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                <SelectItem value="TRANSFORMED">Transformed</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.warehouse_id}
                            onValueChange={(value) => updateFilter("warehouse_id", value)}
                        >
                            <SelectTrigger className="w-[160px] font-mono">
                                <SelectValue placeholder="Warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All warehouses</SelectItem>
                                {(warehousesData?.data || []).map((warehouse) => (
                                    <SelectItem key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.stock_mode}
                            onValueChange={(value) => updateFilter("stock_mode", value)}
                        >
                            <SelectTrigger className="w-[145px] font-mono">
                                <SelectValue placeholder="Stock" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All stock</SelectItem>
                                <SelectItem value="SERIALIZED">Serialized</SelectItem>
                                <SelectItem value="POOLED">Pooled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <Switch checked={foldGroups} onCheckedChange={setFoldGroups} />
                        <span className="font-mono text-xs text-muted-foreground">
                            Fold grouped records
                        </span>
                    </div>
                    <div className="flex overflow-hidden rounded-md border border-border">
                        <Button
                            variant={viewMode === "rows" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("rows")}
                            className="rounded-none border-r border-border"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "cards" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("cards")}
                            className="rounded-none"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-full bg-muted/50 p-4">
                        <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 font-mono text-lg font-semibold">No assets found</h3>
                    <p className="max-w-md text-sm font-mono text-muted-foreground">
                        Adjust filters or create a new asset.
                    </p>
                </div>
            ) : viewMode === "cards" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => {
                        const stats = itemStats(item);
                        const title = item.kind === "group" ? item.name : item.asset.name;
                        return (
                            <Card key={item.id} className="overflow-hidden">
                                <CardContent className="space-y-3 p-4">
                                    <div className="flex items-start gap-3">
                                        <InventoryImage item={item} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                {item.kind === "group" && (
                                                    <Badge variant="secondary">Group</Badge>
                                                )}
                                                <Link
                                                    href={
                                                        item.kind === "asset"
                                                            ? `/assets/${item.asset.id}`
                                                            : `/assets/${item.assets[0].id}`
                                                    }
                                                    className="truncate font-mono text-sm font-semibold hover:text-primary"
                                                >
                                                    {title}
                                                </Link>
                                            </div>
                                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                                {stats.company} · {stats.brand}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">{stats.stockMode}</Badge>
                                        {item.kind === "asset" && (
                                            <>
                                                <ConditionBadge condition={item.asset.condition} />
                                                <StatusBadge status={item.asset.status} />
                                            </>
                                        )}
                                        {item.kind === "group" && (stats.red || stats.orange) ? (
                                            <Badge variant="destructive">
                                                {stats.red} red / {stats.orange} orange
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                        <div>
                                            <p className="text-muted-foreground">Records</p>
                                            <p className="font-semibold">{item.assets.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Available</p>
                                            <p className="font-semibold">{stats.available}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Total</p>
                                            <p className="font-semibold">{stats.total}</p>
                                        </div>
                                    </div>
                                    {item.kind === "group" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() =>
                                                setExpandedGroupId(
                                                    expandedGroupId === item.id ? null : item.id
                                                )
                                            }
                                        >
                                            {expandedGroupId === item.id ? "Hide" : "Show"} records
                                        </Button>
                                    )}
                                    {item.kind === "group" && expandedGroupId === item.id && (
                                        <SiblingList assets={item.assets} />
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="hidden xl:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_110px_110px_110px_90px] gap-3 border-b bg-muted/50 px-4 py-2 font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        <div>Name</div>
                        <div>Company</div>
                        <div>Brand</div>
                        <div>Location</div>
                        <div>Condition</div>
                        <div>Status</div>
                        <div>Available</div>
                        <div>Created</div>
                    </div>
                    <div className="divide-y divide-border">
                        {items.map((item) => {
                            const stats = itemStats(item);
                            const first = item.assets[0];
                            const isExpanded = expandedGroupId === item.id;
                            return (
                                <div key={item.id}>
                                    <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_110px_110px_110px_90px] xl:items-center">
                                        <div className="flex min-w-0 items-center gap-3">
                                            {item.kind === "group" ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedGroupId(
                                                            isExpanded ? null : item.id
                                                        )
                                                    }
                                                    className="rounded p-1 hover:bg-muted"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="w-6" />
                                            )}
                                            <InventoryImage item={item} />
                                            <div className="min-w-0">
                                                <Link
                                                    href={
                                                        item.kind === "asset"
                                                            ? `/assets/${item.asset.id}`
                                                            : `/assets/${first.id}`
                                                    }
                                                    className="block truncate font-mono text-sm font-semibold hover:text-primary"
                                                >
                                                    {item.kind === "group"
                                                        ? item.name
                                                        : item.asset.name}
                                                </Link>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {item.kind === "group"
                                                        ? `${item.assets.length} stock records`
                                                        : item.asset.qr_code}
                                                    {" · "}
                                                    {stats.category}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="truncate font-mono text-xs">
                                            {stats.company}
                                        </div>
                                        <div className="truncate font-mono text-xs">
                                            {stats.brand}
                                        </div>
                                        <div className="flex items-center gap-1 truncate font-mono text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            {stats.warehouse} / {stats.zone}
                                        </div>
                                        <div>
                                            {item.kind === "asset" ? (
                                                <ConditionBadge condition={item.asset.condition} />
                                            ) : (
                                                <Badge variant="outline">
                                                    {stats.red} red / {stats.orange} orange
                                                </Badge>
                                            )}
                                        </div>
                                        <div>
                                            {item.kind === "asset" ? (
                                                <StatusBadge status={item.asset.status} />
                                            ) : (
                                                <Badge variant="secondary">{stats.stockMode}</Badge>
                                            )}
                                        </div>
                                        <div className="font-mono text-xs">
                                            {stats.available} / {stats.total}
                                        </div>
                                        <div className="font-mono text-xs text-muted-foreground">
                                            {formatDate(first.created_at)}
                                        </div>
                                    </div>
                                    {item.kind === "group" && isExpanded && (
                                        <SiblingList assets={item.assets} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!foldGroups && totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="font-mono text-sm text-muted-foreground">
                        Showing {assets.length} of {totalAssets}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((current) => current - 1)}
                        >
                            Previous
                        </Button>
                        <span className="font-mono text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
