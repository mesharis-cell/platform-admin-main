"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
    BookmarkPlus,
    Search,
    Plus,
    User,
    Package,
    CheckCircle2,
    XCircle,
    Clock,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useSelfBookings } from "@/hooks/use-self-bookings";
import type { SelfBooking, SelfBookingStatus } from "@/types/self-booking";

function StatusBadge({ status }: { status: SelfBookingStatus }) {
    if (status === "ACTIVE")
        return (
            <Badge
                className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono"
                variant="outline"
            >
                <Clock className="w-3 h-3 mr-1" />
                Active
            </Badge>
        );
    if (status === "COMPLETED")
        return (
            <Badge
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono"
                variant="outline"
            >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completed
            </Badge>
        );
    return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-mono" variant="outline">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
        </Badge>
    );
}

function ItemsProgress({ booking }: { booking: SelfBooking }) {
    const total = booking.items.reduce((s, i) => s + i.quantity, 0);
    const returned = booking.items.reduce((s, i) => s + i.returned_quantity, 0);
    return (
        <span className="font-mono text-sm">
            {returned}/{total} returned
        </span>
    );
}

export default function SelfBookingsPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (debouncedSearch) params.search = debouncedSearch;

    const { data, isLoading } = useSelfBookings(params);
    const bookings = data?.data || [];
    const meta = data?.meta;

    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSearch(e.target.value);
        clearTimeout((handleSearchChange as any)._t);
        (handleSearchChange as any)._t = setTimeout(() => setDebouncedSearch(e.target.value), 400);
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-card">
                <div className="max-w-[1400px] mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                                <BookmarkPlus className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold font-mono">Self-Bookings</h1>
                                <p className="text-sm text-muted-foreground font-mono">
                                    Internal asset reservations — no order flow required
                                </p>
                            </div>
                        </div>
                        <Button asChild className="font-mono">
                            <Link href="/self-bookings/new">
                                <Plus className="w-4 h-4 mr-2" />
                                New Self-Booking
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
                {/* Filters */}
                <div className="flex gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or job reference..."
                            value={search}
                            onChange={handleSearchChange}
                            className="pl-9 font-mono"
                        />
                    </div>
                    <Select
                        value={statusFilter || "all"}
                        onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
                    >
                        <SelectTrigger className="w-40 font-mono">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="font-mono text-sm text-muted-foreground">
                            {meta ? `${meta.total} booking${meta.total !== 1 ? "s" : ""}` : ""}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full" />
                                ))}
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <BookmarkPlus className="w-12 h-12 mb-3 opacity-20" />
                                <p className="font-mono text-sm">No self-bookings found</p>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 font-mono"
                                >
                                    <Link href="/self-bookings/new">
                                        <Plus className="w-4 h-4 mr-1" />
                                        Create first booking
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {/* Header */}
                                <div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-6 py-3 bg-muted/30 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                                    <span>Booked For</span>
                                    <span>Job Reference</span>
                                    <span>Items</span>
                                    <span>Created By</span>
                                    <span>Date</span>
                                    <span>Status</span>
                                </div>
                                {bookings.map((booking) => (
                                    <Link
                                        key={booking.id}
                                        href={`/self-bookings/${booking.id}`}
                                        className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center"
                                    >
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="font-mono font-medium text-sm truncate">
                                                {booking.booked_for}
                                            </span>
                                        </div>
                                        <span className="font-mono text-sm text-muted-foreground truncate">
                                            {booking.job_reference || "—"}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                            <ItemsProgress booking={booking} />
                                        </div>
                                        <span className="font-mono text-sm text-muted-foreground truncate">
                                            {booking.created_by_user?.name || "—"}
                                        </span>
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {format(new Date(booking.created_at), "dd MMM yy")}
                                        </span>
                                        <StatusBadge status={booking.status} />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {meta && meta.total_pages > 1 && (
                    <p className="text-xs text-muted-foreground font-mono text-center">
                        Page {meta.page} of {meta.total_pages}
                    </p>
                )}
            </div>
        </div>
    );
}
