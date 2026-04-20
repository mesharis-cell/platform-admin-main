"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    AlertCircle,
    AlertTriangle,
    Building2,
    ChevronRight,
    Filter,
    Layers,
    MapPin,
    Package,
    Warehouse,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetFamilies } from "@/hooks/use-asset-families";
import { useCompanies } from "@/hooks/use-companies";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useZones } from "@/hooks/use-zones";
import type { AssetFamily } from "@/types/asset-family";

const ITEMS_PER_PAGE = 20;

const getFamilyImageUrl = (family: AssetFamily): string | null => {
    if (family.on_display_image) return family.on_display_image;
    if (!Array.isArray(family.images) || family.images.length === 0) return null;
    const [firstImage] = family.images;
    if (typeof firstImage === "string") return firstImage;
    if (firstImage && typeof firstImage === "object" && "url" in firstImage) {
        return typeof firstImage.url === "string" ? firstImage.url : null;
    }
    return null;
};

export default function ItemsNeedingAttentionPage() {
    const [conditionFilter, setConditionFilter] = useState<"RED" | "ORANGE" | "RED,ORANGE">(
        "RED,ORANGE"
    );
    const [companyFilter, setCompanyFilter] = useState<string | undefined>(undefined);
    const [warehouseFilter, setWarehouseFilter] = useState<string | undefined>(undefined);
    const [zoneFilter, setZoneFilter] = useState<string | undefined>(undefined);
    const [page, setPage] = useState(1);

    const familyParams = useMemo(
        () => ({
            condition: conditionFilter,
            company_id: companyFilter,
            warehouse_id: warehouseFilter,
            zone_id: zoneFilter,
        }),
        [companyFilter, conditionFilter, warehouseFilter, zoneFilter]
    );

    const { data, isLoading } = useAssetFamilies(familyParams);
    const { data: companiesData } = useCompanies({ limit: "100" });
    const { data: warehousesData } = useWarehouses({ limit: "100" });
    const { data: zonesData } = useZones({ limit: "100" });

    useEffect(() => {
        setPage(1);
    }, [familyParams]);

    const families = data?.data ?? [];
    const totalPages = Math.max(1, Math.ceil(families.length / ITEMS_PER_PAGE));
    const pagedFamilies = useMemo(
        () => families.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
        [families, page]
    );

    const summary = useMemo(
        () =>
            families.reduce(
                (totals, family) => {
                    totals.red += Number(family.condition_summary?.red || 0);
                    totals.orange += Number(family.condition_summary?.orange || 0);
                    totals.stockRecords += Number(family.stock_record_count || 0);
                    return totals;
                },
                { red: 0, orange: 0, stockRecords: 0 }
            ),
        [families]
    );

    const selectedWarehouse = warehousesData?.data.find(
        (warehouse) => warehouse.id === warehouseFilter
    );
    const selectedZone = zonesData?.data.find((zone) => zone.id === zoneFilter);

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={AlertCircle}
                title="CONDITION MANAGEMENT"
                description="Review flagged families first, then drill into stock records"
                stats={{
                    label: "FAMILIES FLAGGED",
                    value: String(families.length),
                }}
            />

            <div className="p-6 font-mono">
                <div className="mb-8 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-l-4 border-l-destructive bg-linear-to-br from-destructive/5 to-background">
                            <CardHeader className="pb-3">
                                <CardDescription className="text-xs uppercase tracking-wider">
                                    Critical Stock Records
                                </CardDescription>
                                <CardTitle className="flex items-baseline gap-2">
                                    <span className="font-mono text-4xl font-bold tabular-nums">
                                        {isLoading ? (
                                            <Skeleton className="h-10 w-16" />
                                        ) : (
                                            summary.red
                                        )}
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        red
                                    </span>
                                </CardTitle>
                            </CardHeader>
                        </Card>

                        <Card className="border-l-4 border-l-orange-500 bg-linear-to-br from-orange-500/5 to-background">
                            <CardHeader className="pb-3">
                                <CardDescription className="text-xs uppercase tracking-wider">
                                    Review Stock Records
                                </CardDescription>
                                <CardTitle className="flex items-baseline gap-2">
                                    <span className="font-mono text-4xl font-bold tabular-nums">
                                        {isLoading ? (
                                            <Skeleton className="h-10 w-16" />
                                        ) : (
                                            summary.orange
                                        )}
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        orange
                                    </span>
                                </CardTitle>
                            </CardHeader>
                        </Card>

                        <Card className="border-l-4 border-l-primary bg-linear-to-br from-primary/5 to-background">
                            <CardHeader className="pb-3">
                                <CardDescription className="text-xs uppercase tracking-wider">
                                    Stock Records In Scope
                                </CardDescription>
                                <CardTitle className="flex items-baseline gap-2">
                                    <span className="font-mono text-4xl font-bold tabular-nums">
                                        {isLoading ? (
                                            <Skeleton className="h-10 w-16" />
                                        ) : (
                                            summary.stockRecords
                                        )}
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        records
                                    </span>
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    <Card className="border-2">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-sm uppercase tracking-wider">
                                    Filter Controls
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Condition
                                    </label>
                                    <Select
                                        value={conditionFilter}
                                        onValueChange={(value) =>
                                            setConditionFilter(
                                                value as "RED,ORANGE" | "RED" | "ORANGE"
                                            )
                                        }
                                    >
                                        <SelectTrigger className="font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RED,ORANGE">
                                                All Conditions
                                            </SelectItem>
                                            <SelectItem value="RED">Critical (Red)</SelectItem>
                                            <SelectItem value="ORANGE">Flagged (Orange)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Company
                                    </label>
                                    <Select
                                        value={companyFilter || "all"}
                                        onValueChange={(value) =>
                                            setCompanyFilter(value === "all" ? undefined : value)
                                        }
                                    >
                                        <SelectTrigger className="font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Companies</SelectItem>
                                            {companiesData?.data.map((company) => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Warehouse
                                    </label>
                                    <Select
                                        value={warehouseFilter || "all"}
                                        onValueChange={(value) =>
                                            setWarehouseFilter(value === "all" ? undefined : value)
                                        }
                                    >
                                        <SelectTrigger className="font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Warehouses</SelectItem>
                                            {warehousesData?.data.map((warehouse) => (
                                                <SelectItem key={warehouse.id} value={warehouse.id}>
                                                    {warehouse.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Zone
                                    </label>
                                    <Select
                                        value={zoneFilter || "all"}
                                        onValueChange={(value) =>
                                            setZoneFilter(value === "all" ? undefined : value)
                                        }
                                    >
                                        <SelectTrigger className="font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Zones</SelectItem>
                                            {zonesData?.data.map((zone) => (
                                                <SelectItem key={zone.id} value={zone.id}>
                                                    {zone.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {(selectedWarehouse || selectedZone) && (
                    <div className="mb-4 flex flex-wrap gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        {selectedWarehouse && (
                            <Badge variant="outline" className="font-mono">
                                Warehouse: {selectedWarehouse.name}
                            </Badge>
                        )}
                        {selectedZone && (
                            <Badge variant="outline" className="font-mono">
                                Zone: {selectedZone.name}
                            </Badge>
                        )}
                    </div>
                )}

                <div className="space-y-4" data-testid="condition-family-list">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                            <Card key={index} className="border-l-4">
                                <CardContent className="p-6">
                                    <div className="flex gap-6">
                                        <Skeleton className="h-24 w-24 shrink-0" />
                                        <div className="flex-1 space-y-3">
                                            <Skeleton className="h-6 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                            <Skeleton className="h-4 w-2/3" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : pagedFamilies.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <Layers className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                                <h3 className="mb-2 text-lg font-semibold">No Families Found</h3>
                                <p className="text-sm text-muted-foreground">
                                    No asset families match the current condition filters.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        pagedFamilies.map((family) => {
                            const familyImageUrl = getFamilyImageUrl(family);
                            const redCount = Number(family.condition_summary?.red || 0);
                            const orangeCount = Number(family.condition_summary?.orange || 0);

                            return (
                                <Link
                                    key={family.id}
                                    href={`/assets/families/${family.id}`}
                                    className="block"
                                    data-testid="condition-family-card"
                                >
                                    <Card className="group border-l-4 border-l-primary transition-all hover:shadow-lg hover:border-l-primary/80">
                                        <CardContent className="p-6">
                                            <div className="flex gap-6">
                                                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border-2 bg-muted">
                                                    {familyImageUrl ? (
                                                        <Image
                                                            src={familyImageUrl}
                                                            alt={family.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center">
                                                            <Package className="h-8 w-8 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                                {redCount > 0 && (
                                                                    <Badge
                                                                        variant="destructive"
                                                                        className="gap-1 font-mono text-xs uppercase tracking-wider"
                                                                    >
                                                                        <AlertTriangle className="h-3 w-3" />
                                                                        {redCount} Red
                                                                    </Badge>
                                                                )}
                                                                {orangeCount > 0 && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="gap-1 border-orange-500/50 bg-orange-500/10 font-mono text-xs uppercase tracking-wider text-orange-600"
                                                                    >
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        {orangeCount} Orange
                                                                    </Badge>
                                                                )}
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-mono text-xs uppercase tracking-wider"
                                                                >
                                                                    {family.stock_mode}
                                                                </Badge>
                                                            </div>
                                                            <h3 className="text-lg font-semibold group-hover:text-primary">
                                                                {family.name}
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                {family.category?.name ||
                                                                    "Uncategorized"}
                                                            </p>
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                                    </div>

                                                    <div className="grid gap-2 md:grid-cols-3">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-muted-foreground">
                                                                {family.company?.name ||
                                                                    "Unassigned company"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Layers className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-muted-foreground">
                                                                {family.stock_record_count || 0}{" "}
                                                                stock records
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Package className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-muted-foreground">
                                                                {family.available_quantity || 0} /{" "}
                                                                {family.total_quantity || 0} units
                                                                available
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-md border-l-2 border-l-primary/50 bg-muted/50 p-3 text-sm text-muted-foreground">
                                                        Review this family first, then drill into
                                                        individual stock records for condition
                                                        notes, QR history, and version history.
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })
                    )}
                </div>

                {families.length > ITEMS_PER_PAGE && (
                    <div className="mt-8 flex items-center justify-between">
                        <p className="font-mono text-sm text-muted-foreground">
                            Page {page} of {totalPages} • Total: {families.length} families
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setPage((currentPage) => Math.max(1, currentPage - 1))
                                }
                                disabled={page === 1}
                                className="font-mono"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setPage((currentPage) => Math.min(totalPages, currentPage + 1))
                                }
                                disabled={page === totalPages}
                                className="font-mono"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
