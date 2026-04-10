"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminSelfPickups } from "@/hooks/use-self-pickups";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Package,
    Calendar,
    User,
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
    IN_USE: { label: "In Use", color: "bg-purple-100 text-purple-700 border-purple-300" },
    AWAITING_RETURN: {
        label: "Awaiting Return",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    RETURNED: { label: "Returned", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700 border-gray-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

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

    return (
        <div className="space-y-6">
            <AdminHeader
                title="Self Pickups"
                description="Manage self-pickup orders"
            />

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by ID or collector..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={company || "_all_"}
                            onValueChange={(v) => {
                                setCompany(v === "_all_" ? "" : v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
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

                        <Select
                            value={status || "_all_"}
                            onValueChange={(v) => {
                                setStatus(v === "_all_" ? "" : v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
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
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Collector</TableHead>
                                <TableHead>Pickup Window</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <TableCell key={j}>
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : pickups.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center py-12 text-muted-foreground"
                                    >
                                        No self-pickups found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pickups.map((pickup: any) => {
                                    const statusConfig =
                                        PICKUP_STATUS_CONFIG[pickup.self_pickup_status] || {
                                            label: pickup.self_pickup_status,
                                            color: "bg-gray-100 text-gray-700",
                                        };
                                    const pickupWindow = pickup.pickup_window as any;

                                    return (
                                        <TableRow key={pickup.id}>
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
                                                {pickupWindow?.start
                                                    ? new Date(
                                                          pickupWindow.start
                                                      ).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={statusConfig.color}
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
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
