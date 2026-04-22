"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminSelfPickups } from "@/hooks/use-self-pickups";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    PackageCheck,
    Calendar,
    User,
    Filter,
    X,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";

const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    PRICING_REVIEW: {
        label: "Pricing Review",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    PENDING_APPROVAL: {
        label: "Pending Approval",
        color: "bg-orange-100 text-orange-700 border-orange-300",
    },
    QUOTED: { label: "Quoted", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 border-red-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    READY_FOR_PICKUP: {
        label: "Ready for Pickup",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    PICKED_UP: { label: "Picked Up", color: "bg-teal-100 text-teal-700 border-teal-300" },
    AWAITING_RETURN: {
        label: "Awaiting Return",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700 border-gray-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

const SORT_OPTIONS = [
    { value: "created_at", label: "Created" },
    { value: "updated_at", label: "Updated" },
    { value: "self_pickup_id", label: "ID" },
];

export default function SelfPickupsListPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [company, setCompany] = useState("");
    const [brand, setBrand] = useState("");
    const [status, setStatus] = useState("");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const { data, isLoading, error } = useAdminSelfPickups({
        page,
        limit: 20,
        company: company || undefined,
        brand: brand || undefined,
        self_pickup_status: status || undefined,
        search: search || undefined,
        sortBy,
        sortOrder,
    });

    const companiesData = useCompanies();
    const brandsData = useBrands();

    const pickups = data?.data?.self_pickups || [];
    const totalPages = data?.data?.total_pages || 1;
    const totalItems = data?.data?.total || pickups.length;

    const activeFilterCount = [search, company, brand, status].filter(Boolean).length;
    const clearFilters = () => {
        setSearch("");
        setCompany("");
        setBrand("");
        setStatus("");
        setPage(1);
    };

    const pageStart = (page - 1) * 20 + 1;
    const pageEnd = Math.min(page * 20, totalItems);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
            <AdminHeader
                icon={PackageCheck}
                title="SELF PICKUPS"
                description="Manage · Track · Fulfill"
                stats={{ label: "TOTAL PICKUPS", value: totalItems }}
            />

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filters sidebar */}
                    <Card className="lg:col-span-1 h-fit border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100 py-4 px-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm font-semibold text-slate-700">
                                        Filters
                                    </span>
                                </div>
                                {activeFilterCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-7 text-xs text-slate-500 hover:text-slate-700"
                                    >
                                        <X className="h-3 w-3 mr-1" />
                                        Clear ({activeFilterCount})
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {/* Search */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ID or collector..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="pl-10 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Company */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Company
                                </label>
                                <Select
                                    value={company || "_all_"}
                                    onValueChange={(v) => {
                                        setCompany(v === "_all_" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="All companies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_all_">All companies</SelectItem>
                                        {(companiesData?.data?.data || []).map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Brand */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Brand
                                </label>
                                <Select
                                    value={brand || "_all_"}
                                    onValueChange={(v) => {
                                        setBrand(v === "_all_" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="All brands" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_all_">All brands</SelectItem>
                                        {(brandsData?.data?.data || []).map((b: any) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Status
                                </label>
                                <Select
                                    value={status || "_all_"}
                                    onValueChange={(v) => {
                                        setStatus(v === "_all_" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_all_">All statuses</SelectItem>
                                        {Object.entries(PICKUP_STATUS_CONFIG).map(
                                            ([key, config]) => (
                                                <SelectItem key={key} value={key}>
                                                    {config.label}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Sort */}
                            <div className="border-t border-slate-100 pt-4 space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Sort By
                                </label>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SORT_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={sortOrder}
                                    onValueChange={(v: "asc" | "desc") => setSortOrder(v)}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="desc">Newest first</SelectItem>
                                        <SelectItem value="asc">Oldest first</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main content */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="p-8 space-y-4">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Skeleton key={i} className="h-16 w-full" />
                                        ))}
                                    </div>
                                ) : error ? (
                                    <div className="text-center p-8 text-red-500 text-sm">
                                        Failed to load self-pickups. Please try again.
                                    </div>
                                ) : pickups.length === 0 ? (
                                    <div className="text-center p-12 space-y-3">
                                        <PackageCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                                        <p className="font-medium text-muted-foreground">
                                            No self-pickups found
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Self-pickups will appear here once submitted by clients.
                                        </p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                                <TableHead className="font-semibold">ID</TableHead>
                                                <TableHead className="font-semibold">
                                                    Company
                                                </TableHead>
                                                <TableHead className="font-semibold">
                                                    Collector
                                                </TableHead>
                                                <TableHead className="font-semibold">
                                                    Pickup Window
                                                </TableHead>
                                                <TableHead className="font-semibold">
                                                    Status
                                                </TableHead>
                                                <TableHead className="font-semibold">
                                                    Created
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pickups.map((pickup: any) => {
                                                const statusConfig = PICKUP_STATUS_CONFIG[
                                                    pickup.self_pickup_status
                                                ] || {
                                                    label: pickup.self_pickup_status,
                                                    color: "bg-gray-100 text-gray-700",
                                                };
                                                const pickupWindow = pickup.pickup_window as any;

                                                return (
                                                    <TableRow
                                                        key={pickup.id}
                                                        className="group hover:bg-slate-50/50"
                                                    >
                                                        <TableCell>
                                                            <Link
                                                                href={`/self-pickups/${pickup.id}`}
                                                                className="font-medium text-primary hover:underline"
                                                            >
                                                                {pickup.self_pickup_id}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            {pickup.company_name || "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <User className="h-3 w-3 text-muted-foreground" />
                                                                {pickup.collector_name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                                {pickupWindow?.start
                                                                    ? new Date(
                                                                          pickupWindow.start
                                                                      ).toLocaleDateString()
                                                                    : "—"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={`${statusConfig.color} font-medium border whitespace-nowrap`}
                                                            >
                                                                {statusConfig.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {new Date(
                                                                pickup.created_at
                                                            ).toLocaleDateString()}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}

                                {/* Pagination */}
                                {!isLoading && pickups.length > 0 && totalPages > 1 && (
                                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/30">
                                        <p className="text-sm text-muted-foreground">
                                            Showing {pageStart} to {pageEnd} of {totalItems} pickups
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                disabled={page <= 1}
                                                className="gap-1"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setPage((p) => Math.min(totalPages, p + 1))
                                                }
                                                disabled={page >= totalPages}
                                                className="gap-1"
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
