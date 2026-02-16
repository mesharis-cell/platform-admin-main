"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCompanies } from "@/hooks/use-companies";
import { useCreateServiceRequest, useListServiceRequests } from "@/hooks/use-service-requests";
import type {
    ServiceRequestBillingMode,
    ServiceRequestStatus,
    ServiceRequestType,
} from "@/types/service-request";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Filter,
    Plus,
    Search,
    Wrench,
} from "lucide-react";
import { toast } from "sonner";

const REQUEST_TYPES: ServiceRequestType[] = ["MAINTENANCE", "RESKIN", "REFURBISHMENT", "CUSTOM"];
const BILLING_MODES: ServiceRequestBillingMode[] = ["INTERNAL_ONLY", "CLIENT_BILLABLE"];
const STATUS_OPTIONS: ServiceRequestStatus[] = [
    "SUBMITTED",
    "IN_REVIEW",
    "APPROVED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
];

const SR_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-300" },
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    IN_REVIEW: { label: "In Review", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 border-green-300" },
    IN_PROGRESS: { label: "In Progress", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    COMPLETED: { label: "Completed", color: "bg-teal-100 text-teal-700 border-teal-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-300" },
};

const COMMERCIAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    INTERNAL: { label: "Internal", color: "bg-slate-100 text-slate-700 border-slate-300" },
    PENDING_QUOTE: { label: "Pending Quote", color: "bg-blue-100 text-blue-700 border-blue-300" },
    QUOTED: { label: "Quoted", color: "bg-purple-100 text-purple-700 border-purple-300" },
    QUOTE_APPROVED: {
        label: "Quote Approved",
        color: "bg-green-100 text-green-700 border-green-300",
    },
    INVOICED: { label: "Invoiced", color: "bg-amber-100 text-amber-700 border-amber-300" },
    PAID: { label: "Paid", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-300" },
};

export default function ServiceRequestsPage() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [billingFilter, setBillingFilter] = useState("");
    const [companyFilter, setCompanyFilter] = useState("");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const [createOpen, setCreateOpen] = useState(false);
    const [companyId, setCompanyId] = useState("");
    const [requestType, setRequestType] = useState<ServiceRequestType>("MAINTENANCE");
    const [billingMode, setBillingMode] = useState<ServiceRequestBillingMode>("INTERNAL_ONLY");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [requestedStartAt, setRequestedStartAt] = useState("");
    const [requestedDueAt, setRequestedDueAt] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemQuantity, setItemQuantity] = useState("1");
    const [itemRefurbDays, setItemRefurbDays] = useState("");
    const [itemNotes, setItemNotes] = useState("");

    const filters = useMemo(
        () => ({
            search_term: searchTerm || undefined,
            request_status: (statusFilter || undefined) as ServiceRequestStatus | undefined,
            request_type: (typeFilter || undefined) as ServiceRequestType | undefined,
            billing_mode: (billingFilter || undefined) as ServiceRequestBillingMode | undefined,
            company_id: companyFilter || undefined,
            page,
            limit,
        }),
        [searchTerm, statusFilter, typeFilter, billingFilter, companyFilter, page, limit]
    );

    const { data, isLoading, error } = useListServiceRequests(filters);
    const { data: companiesData } = useCompanies({ limit: "200" });
    const createServiceRequest = useCreateServiceRequest();

    const companies = companiesData?.data ?? [];
    const requests = data?.data ?? [];
    const totalRequests = data?.meta?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRequests / limit));

    const handleSearch = () => {
        setSearchTerm(searchInput);
        setPage(1);
    };
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    const activeFiltersCount =
        (searchTerm ? 1 : 0) +
        (statusFilter ? 1 : 0) +
        (typeFilter ? 1 : 0) +
        (billingFilter ? 1 : 0) +
        (companyFilter ? 1 : 0);

    const clearFilters = () => {
        setSearchTerm("");
        setSearchInput("");
        setStatusFilter("");
        setTypeFilter("");
        setBillingFilter("");
        setCompanyFilter("");
        setPage(1);
    };

    const resetCreateForm = () => {
        setCompanyId("");
        setRequestType("MAINTENANCE");
        setBillingMode("INTERNAL_ONLY");
        setTitle("");
        setDescription("");
        setRequestedStartAt("");
        setRequestedDueAt("");
        setItemName("");
        setItemQuantity("1");
        setItemRefurbDays("");
        setItemNotes("");
    };

    const handleCreate = async () => {
        const quantity = Number(itemQuantity || 1);
        const refurbDays = itemRefurbDays ? Number(itemRefurbDays) : undefined;

        if (!companyId) return toast.error("Company is required");
        if (!title.trim()) return toast.error("Title is required");
        if (!itemName.trim()) return toast.error("At least one item is required");
        if (!Number.isFinite(quantity) || quantity <= 0)
            return toast.error("Quantity must be positive");
        if (itemRefurbDays && (!Number.isFinite(refurbDays) || refurbDays! < 0))
            return toast.error("Refurb days must be 0 or greater");

        try {
            await createServiceRequest.mutateAsync({
                company_id: companyId,
                request_type: requestType,
                billing_mode: billingMode,
                title: title.trim(),
                description: description.trim() || undefined,
                requested_start_at: requestedStartAt
                    ? new Date(requestedStartAt).toISOString()
                    : undefined,
                requested_due_at: requestedDueAt
                    ? new Date(requestedDueAt).toISOString()
                    : undefined,
                items: [
                    {
                        asset_name: itemName.trim(),
                        quantity,
                        refurb_days_estimate: refurbDays,
                        notes: itemNotes.trim() || undefined,
                    },
                ],
            });
            toast.success("Service request created");
            setCreateOpen(false);
            resetCreateForm();
        } catch (error: any) {
            toast.error(error.message || "Failed to create service request");
        }
    };

    return (
        <div className="min-h-screen bg-linear-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
            <AdminHeader
                icon={ClipboardList}
                title="SERVICE REQUESTS"
                description="Manage · Track · Fulfill"
                stats={data ? { label: "TOTAL REQUESTS", value: totalRequests } : undefined}
                actions={
                    <Dialog
                        open={createOpen}
                        onOpenChange={(open) => {
                            setCreateOpen(open);
                            if (!open) resetCreateForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="font-mono gap-2">
                                <Plus className="h-4 w-4" />
                                NEW REQUEST
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create Service Request</DialogTitle>
                                <DialogDescription>
                                    Create a standalone maintenance/reskin request with one starter
                                    item.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>
                                        Company <span className="text-destructive">*</span>
                                    </Label>
                                    <Select value={companyId} onValueChange={setCompanyId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select company" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companies.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>
                                        Request Type <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={requestType}
                                        onValueChange={(v) =>
                                            setRequestType(v as ServiceRequestType)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REQUEST_TYPES.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t.replace(/_/g, " ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>
                                        Billing Mode <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={billingMode}
                                        onValueChange={(v) =>
                                            setBillingMode(v as ServiceRequestBillingMode)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BILLING_MODES.map((m) => (
                                                <SelectItem key={m} value={m}>
                                                    {m.replace(/_/g, " ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Requested Start</Label>
                                    <Input
                                        type="datetime-local"
                                        value={requestedStartAt}
                                        onChange={(e) => setRequestedStartAt(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>
                                        Title <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Fix booth panel skin and repaint edges"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Operational details and context..."
                                    />
                                </div>
                                <div>
                                    <Label>
                                        Item Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        value={itemName}
                                        onChange={(e) => setItemName(e.target.value)}
                                        placeholder="Backbar unit"
                                    />
                                </div>
                                <div>
                                    <Label>
                                        Quantity <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={itemQuantity}
                                        onChange={(e) => setItemQuantity(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Item Refurb Days</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={itemRefurbDays}
                                        onChange={(e) => setItemRefurbDays(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Requested Due</Label>
                                    <Input
                                        type="datetime-local"
                                        value={requestedDueAt}
                                        onChange={(e) => setRequestedDueAt(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Item Notes</Label>
                                    <Textarea
                                        rows={2}
                                        value={itemNotes}
                                        onChange={(e) => setItemNotes(e.target.value)}
                                        placeholder="Damage area, paint code, special handling..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setCreateOpen(false)}
                                    disabled={createServiceRequest.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={createServiceRequest.isPending}
                                >
                                    {createServiceRequest.isPending
                                        ? "Creating..."
                                        : "Create Request"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                }
            />

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filter Sidebar */}
                    <Card className="lg:col-span-1 h-fit border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filters
                                </CardTitle>
                                {activeFiltersCount > 0 && (
                                    <Button
                                        onClick={clearFilters}
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                    >
                                        Clear ({activeFiltersCount})
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Search
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Title, ID..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleSearch} size="icon" variant="secondary">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Company
                                </label>
                                <Select
                                    value={companyFilter}
                                    onValueChange={(v) => {
                                        setCompanyFilter(v === "all" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Companies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Companies</SelectItem>
                                        {companies.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Type
                                </label>
                                <Select
                                    value={typeFilter}
                                    onValueChange={(v) => {
                                        setTypeFilter(v === "all" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {REQUEST_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t.replace(/_/g, " ")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Billing
                                </label>
                                <Select
                                    value={billingFilter}
                                    onValueChange={(v) => {
                                        setBillingFilter(v === "all" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Modes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Modes</SelectItem>
                                        {BILLING_MODES.map((m) => (
                                            <SelectItem key={m} value={m}>
                                                {m.replace(/_/g, " ")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Status
                                </label>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(v) => {
                                        setStatusFilter(v === "all" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {STATUS_OPTIONS.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {SR_STATUS_CONFIG[s]?.label ?? s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Sort By
                                </label>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="created_at">Date Created</SelectItem>
                                        <SelectItem value="updated_at">Date Updated</SelectItem>
                                        <SelectItem value="request_status">Status</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={sortOrder}
                                    onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="desc">Newest First</SelectItem>
                                        <SelectItem value="asc">Oldest First</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-4">
                        {data?.data && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                                    Total Requests
                                                </p>
                                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                                    {totalRequests}
                                                </p>
                                            </div>
                                            <Wrench className="h-8 w-8 text-slate-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-200 shadow-sm">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                                    Current Page
                                                </p>
                                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                                    {page} of {totalPages}
                                                </p>
                                            </div>
                                            <Calendar className="h-8 w-8 text-slate-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-200 shadow-sm">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                                    Showing
                                                </p>
                                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                                    {requests.length} requests
                                                </p>
                                            </div>
                                            <ClipboardList className="h-8 w-8 text-slate-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="p-8 space-y-4">
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton key={i} className="h-16 w-full" />
                                        ))}
                                    </div>
                                ) : error ? (
                                    <div className="p-8 text-center text-red-600">
                                        <p>Failed to load service requests. Please try again.</p>
                                    </div>
                                ) : requests.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <ClipboardList className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                                        <p className="text-slate-600 font-medium">
                                            No service requests found
                                        </p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Try adjusting your filters or create a new request
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                                    <TableHead className="font-semibold">
                                                        Request
                                                    </TableHead>
                                                    <TableHead className="font-semibold">
                                                        Type
                                                    </TableHead>
                                                    <TableHead className="font-semibold">
                                                        Billing
                                                    </TableHead>
                                                    <TableHead className="font-semibold">
                                                        Operational
                                                    </TableHead>
                                                    <TableHead className="font-semibold">
                                                        Commercial
                                                    </TableHead>
                                                    <TableHead className="font-semibold">
                                                        Created
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-right">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {requests.map((request) => {
                                                    const opsCfg =
                                                        SR_STATUS_CONFIG[request.request_status];
                                                    const comCfg =
                                                        COMMERCIAL_STATUS_CONFIG[
                                                            request.commercial_status
                                                        ];
                                                    return (
                                                        <TableRow
                                                            key={request.id}
                                                            className="group hover:bg-slate-50/50"
                                                        >
                                                            <TableCell>
                                                                <p className="font-mono text-xs font-medium">
                                                                    {request.service_request_id}
                                                                </p>
                                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                                                    {request.title}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs whitespace-nowrap"
                                                                >
                                                                    {request.request_type.replace(
                                                                        /_/g,
                                                                        " "
                                                                    )}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-slate-700">
                                                                {request.billing_mode.replace(
                                                                    /_/g,
                                                                    " "
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`${opsCfg?.color || "bg-gray-100 text-gray-700 border-gray-300"} font-medium border whitespace-nowrap`}
                                                                >
                                                                    {opsCfg?.label ||
                                                                        request.request_status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`${comCfg?.color || "bg-gray-100 text-gray-700 border-gray-300"} font-medium border whitespace-nowrap`}
                                                                >
                                                                    {comCfg?.label ||
                                                                        request.commercial_status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-slate-500">
                                                                {new Date(
                                                                    request.created_at
                                                                ).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Link
                                                                    href={`/service-requests/${request.id}`}
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        View Details
                                                                    </Button>
                                                                </Link>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>

                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/30">
                                                <p className="text-sm text-slate-600">
                                                    Showing {(page - 1) * limit + 1} to{" "}
                                                    {Math.min(page * limit, totalRequests)} of{" "}
                                                    {totalRequests} requests
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() =>
                                                            setPage((p) => Math.max(1, p - 1))
                                                        }
                                                        disabled={page === 1}
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" /> Previous
                                                    </Button>
                                                    <Button
                                                        onClick={() =>
                                                            setPage((p) =>
                                                                Math.min(totalPages, p + 1)
                                                            )
                                                        }
                                                        disabled={page >= totalPages}
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1"
                                                    >
                                                        Next <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
