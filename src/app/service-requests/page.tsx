"use client";

import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ClipboardList, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const REQUEST_TYPES: ServiceRequestType[] = ["MAINTENANCE", "RESKIN", "REFURBISHMENT", "CUSTOM"];
const BILLING_MODES: ServiceRequestBillingMode[] = ["INTERNAL_ONLY", "CLIENT_BILLABLE"];
const STATUS_FILTERS: Array<ServiceRequestStatus | "all"> = [
    "all",
    "SUBMITTED",
    "IN_REVIEW",
    "APPROVED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
];

export default function ServiceRequestsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | "all">("all");
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
            request_status: statusFilter === "all" ? undefined : statusFilter,
            page: 1,
            limit: 100,
        }),
        [searchTerm, statusFilter]
    );

    const { data, isLoading } = useListServiceRequests(filters);
    const { data: companiesData } = useCompanies({ limit: "200" });
    const createServiceRequest = useCreateServiceRequest();

    const requests = data?.data ?? [];
    const companies = companiesData?.data ?? [];

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
        <div>
            <AdminHeader
                icon={ClipboardList}
                title="SERVICE REQUESTS"
                description="Standalone maintenance/reskin/refurb requests"
                stats={{ label: "TOTAL REQUESTS", value: data?.meta?.total ?? 0 }}
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
                                            {companies.map((company) => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name}
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
                                        onValueChange={(value) =>
                                            setRequestType(value as ServiceRequestType)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REQUEST_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type.replace(/_/g, " ")}
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
                                        onValueChange={(value) =>
                                            setBillingMode(value as ServiceRequestBillingMode)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BILLING_MODES.map((mode) => (
                                                <SelectItem key={mode} value={mode}>
                                                    {mode.replace(/_/g, " ")}
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

            <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative md:col-span-2">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) =>
                            setStatusFilter(value as ServiceRequestStatus | "all")
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_FILTERS.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {status === "all" ? "All statuses" : status.replace(/_/g, " ")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Request</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Billing</TableHead>
                                <TableHead>Operational</TableHead>
                                <TableHead>Commercial</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center text-muted-foreground"
                                    >
                                        Loading service requests...
                                    </TableCell>
                                </TableRow>
                            ) : requests.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center text-muted-foreground"
                                    >
                                        No service requests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell>
                                            <Link
                                                href={`/service-requests/${request.id}`}
                                                className="font-mono font-semibold text-primary hover:underline"
                                            >
                                                {request.service_request_id}
                                            </Link>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {request.title}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            {request.request_type.replace(/_/g, " ")}
                                        </TableCell>
                                        <TableCell>
                                            {request.billing_mode.replace(/_/g, " ")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {request.request_status.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {request.commercial_status.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(request.created_at).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
