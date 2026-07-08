"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
    useApproveLineItemRequest,
    useLineItemRequests,
    useRejectLineItemRequest,
} from "@/hooks/use-line-item-requests";
import type { LineItemBillingMode, PurposeType, ServiceCategory } from "@/types/hybrid-pricing";
import {
    ChevronDown,
    ChevronRight,
    ClipboardList,
    ExternalLink,
    PackageSearch,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";

type DraftMap = Record<
    string,
    {
        description: string;
        category: ServiceCategory;
        quantity: string;
        unit: string;
        unitRate: string;
        // Commercial half of the approval decision (P3-4). Empty sellRate → the
        // server seed-derives sell from the entity margin. Only applies to
        // BILLABLE lines (API rejects a sell override on non-billable).
        sellRate: string;
        clientPriceVisible: boolean;
        notes: string;
        adminNote: string;
        billingMode: LineItemBillingMode;
    }
>;

type RequestDraft = DraftMap[string];

const toDraft = (request: any) => ({
    description: request.description || "",
    category: (request.category || "OTHER") as ServiceCategory,
    quantity: String(request.quantity ?? 1),
    unit: request.unit || "service",
    unitRate: String(request.unitRate ?? 0),
    // Empty by default — leaving it blank means "seed-derived sell" (the API's
    // own default when sell_unit_rate is absent/null).
    sellRate: "",
    clientPriceVisible: false,
    notes: request.notes || "",
    adminNote: "",
    billingMode: "BILLABLE" as LineItemBillingMode,
});

// Status → badge treatment (Tier-1 table idiom, aligns with the Orders page
// status badges + the pricing-ledger D1 language).
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    REQUESTED: {
        label: "Requested",
        className: "bg-amber-100 text-amber-700 border-amber-300",
    },
    APPROVED: {
        label: "Approved",
        className: "bg-teal-100 text-teal-700 border-teal-300",
    },
    REJECTED: {
        label: "Rejected",
        className: "bg-red-100 text-red-700 border-red-300",
    },
};

// Entity type → human label + the admin detail route that carries the request's
// target. The list payload only exposes order/inbound/service-request FKs (no
// self-pickup id), so SELF_PICKUP renders as a label-only badge.
const ENTITY_CONFIG: Record<
    PurposeType,
    { label: string; route: ((r: any) => string | null) | null }
> = {
    ORDER: { label: "Order", route: (r) => (r.orderId ? `/orders/${r.orderId}` : null) },
    INBOUND_REQUEST: {
        label: "Inbound",
        route: (r) => (r.inboundRequestId ? `/inbound-request/${r.inboundRequestId}` : null),
    },
    SERVICE_REQUEST: {
        label: "Service Request",
        route: (r) => (r.serviceRequestId ? `/service-requests/${r.serviceRequestId}` : null),
    },
    SELF_PICKUP: { label: "Self-Pickup", route: null },
};

const formatMoney = (value: number) =>
    (Number.isFinite(value) ? value : 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function LineItemRequestsPage() {
    const [statusFilter, setStatusFilter] = useState<"REQUESTED" | "APPROVED" | "REJECTED">(
        "REQUESTED"
    );
    const [entityFilter, setEntityFilter] = useState<PurposeType | "ALL">("ALL");
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const { data, isLoading, refetch } = useLineItemRequests({
        status: statusFilter,
        purposeType: entityFilter === "ALL" ? undefined : entityFilter,
        limit: 100,
    });
    const approve = useApproveLineItemRequest();
    const reject = useRejectLineItemRequest();
    const [drafts, setDrafts] = useState<DraftMap>({});

    const requests = useMemo(() => data || [], [data]);

    // Client-side search over the fetched page (ref + description + entity id).
    // The list endpoint has no search param, so this is a pure UI narrowing —
    // no new API contract.
    const visibleRequests = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return requests;
        return requests.filter((request: any) =>
            [
                request.lineItemRequestId,
                request.description,
                request.orderId,
                request.inboundRequestId,
                request.serviceRequestId,
            ]
                .filter(Boolean)
                .some((field: string) => String(field).toLowerCase().includes(term))
        );
    }, [requests, search]);

    const getDraft = (request: any) => drafts[request.id] || toDraft(request);

    const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    // CRITICAL: when a row's draft hasn't been touched, prev[request.id] is
    // undefined. Fall back to toDraft(request) — the request's own values —
    // so untouched fields keep the request's submitted values. The earlier
    // shape spread an empty-defaults constant on first edit, which silently
    // wiped every other field the moment the admin typed into ANY one field.
    const setDraftValue = <K extends keyof RequestDraft>(
        request: any,
        key: K,
        value: RequestDraft[K]
    ) => {
        setDrafts((prev) => ({
            ...prev,
            [request.id]: {
                ...(prev[request.id] || toDraft(request)),
                [key]: value,
            },
        }));
    };

    const handleApprove = async (request: any) => {
        const draft = getDraft(request);
        const quantity = Number(draft.quantity || 0);
        const unitRate = Number(draft.unitRate || 0);

        if (!draft.description.trim()) {
            toast.error("Description is required");
            return;
        }
        if (!draft.unit.trim()) {
            toast.error("Unit is required");
            return;
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            toast.error("Quantity must be greater than 0");
            return;
        }
        if (!Number.isFinite(unitRate) || unitRate < 0) {
            toast.error("Unit rate must be 0 or greater");
            return;
        }

        // Sell override is only meaningful (and only accepted by the API) on
        // BILLABLE lines. Blank → omit so the server seed-derives the sell.
        const isBillable = draft.billingMode === "BILLABLE";
        const sellRaw = draft.sellRate.trim();
        let sellUnitRate: number | undefined;
        if (isBillable && sellRaw !== "") {
            const parsed = Number(sellRaw);
            if (!Number.isFinite(parsed) || parsed < 0) {
                toast.error("Sell rate must be 0 or greater");
                return;
            }
            sellUnitRate = parsed;
        }

        try {
            await approve.mutateAsync({
                id: request.id,
                data: {
                    description: draft.description.trim(),
                    category: draft.category,
                    quantity,
                    unit: draft.unit.trim(),
                    unitRate,
                    notes: draft.notes.trim() || undefined,
                    adminNote: draft.adminNote.trim() || undefined,
                    billingMode: draft.billingMode,
                    ...(sellUnitRate !== undefined ? { sellUnitRate } : {}),
                    clientPriceVisible: isBillable ? draft.clientPriceVisible : false,
                },
            });
            toast.success("Line item request approved");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve request");
        }
    };

    const handleReject = async (request: any) => {
        const draft = getDraft(request);
        if (!draft.adminNote.trim()) {
            toast.error("Admin note is required to reject");
            return;
        }
        try {
            await reject.mutateAsync({
                id: request.id,
                data: {
                    adminNote: draft.adminNote.trim(),
                },
            });
            toast.success("Line item request rejected");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Failed to reject request");
        }
    };

    const columnCount = 9;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="min-h-screen bg-background">
                <AdminHeader
                    icon={ClipboardList}
                    title="LINE ITEM REQUESTS"
                    description="Logistics Requests · Admin Review · Approval"
                    stats={{ label: "SHOWING", value: visibleRequests.length }}
                />

                {/* Filter strip (Tier-1 product page) */}
                <div className="border-b border-border bg-card px-8 py-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-mono font-bold uppercase tracking-wide text-muted-foreground">
                                Status
                            </Label>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) =>
                                    setStatusFilter(value as "REQUESTED" | "APPROVED" | "REJECTED")
                                }
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REQUESTED">Requested</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-mono font-bold uppercase tracking-wide text-muted-foreground">
                                Entity Type
                            </Label>
                            <Select
                                value={entityFilter}
                                onValueChange={(value) =>
                                    setEntityFilter(value as PurposeType | "ALL")
                                }
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All entity types</SelectItem>
                                    <SelectItem value="ORDER">Order</SelectItem>
                                    <SelectItem value="INBOUND_REQUEST">Inbound</SelectItem>
                                    <SelectItem value="SERVICE_REQUEST">Service Request</SelectItem>
                                    <SelectItem value="SELF_PICKUP">Self-Pickup</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-[240px] max-w-md">
                            <Label className="text-[10px] font-mono font-bold uppercase tracking-wide text-muted-foreground">
                                Search
                            </Label>
                            <Input
                                placeholder="Request ref, description, entity ID…"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Content area */}
                <div className="px-8 py-6">
                    {isLoading ? (
                        <div className="border border-border rounded-lg bg-card p-8 text-sm text-muted-foreground">
                            Loading line item requests…
                        </div>
                    ) : visibleRequests.length === 0 ? (
                        <div className="border border-border rounded-lg bg-card p-12 text-center">
                            <PackageSearch className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No line item requests found.
                            </p>
                        </div>
                    ) : (
                        <div className="border border-border rounded-lg overflow-hidden bg-card">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 border-border/50 hover:bg-muted/50">
                                            <TableHead className="w-8" />
                                            <TableHead className="font-mono text-xs font-bold uppercase">
                                                Request
                                            </TableHead>
                                            <TableHead className="font-mono text-xs font-bold uppercase">
                                                Entity
                                            </TableHead>
                                            <TableHead className="font-mono text-xs font-bold uppercase">
                                                Description
                                            </TableHead>
                                            <TableHead className="font-mono text-xs font-bold uppercase text-right">
                                                Qty
                                            </TableHead>
                                            <TableHead className="font-mono text-xs font-bold uppercase text-right">
                                                Unit Rate
                                            </TableHead>
                                            <TableHead className="font-mono text-xs font-bold uppercase">
                                                Requested By
                                            </TableHead>
                                            <TableHead className="font-mono text-xs font-bold uppercase">
                                                Date
                                            </TableHead>
                                            <TableHead className="font-mono text-xs font-bold uppercase">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleRequests.map((request: any) => {
                                            const draft = getDraft(request);
                                            const isRequested = request.status === "REQUESTED";
                                            const isOpen = !!expanded[request.id];
                                            const statusCfg = STATUS_CONFIG[request.status] || {
                                                label: request.status,
                                                className:
                                                    "bg-gray-100 text-gray-700 border-gray-300",
                                            };
                                            const entityCfg =
                                                ENTITY_CONFIG[request.purposeType as PurposeType];
                                            const entityHref = entityCfg?.route
                                                ? entityCfg.route(request)
                                                : null;

                                            return (
                                                <Fragment key={request.id}>
                                                    <TableRow
                                                        className="group cursor-pointer hover:bg-muted/40"
                                                        onClick={() => toggleExpanded(request.id)}
                                                    >
                                                        <TableCell className="align-middle">
                                                            {isOpen ? (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                                                            {request.lineItemRequestId}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-mono text-[10px] uppercase tracking-wide"
                                                                >
                                                                    {entityCfg?.label ||
                                                                        request.purposeType}
                                                                </Badge>
                                                                {entityHref && (
                                                                    <Link
                                                                        href={entityHref}
                                                                        onClick={(e) =>
                                                                            e.stopPropagation()
                                                                        }
                                                                        className="text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="max-w-[280px]">
                                                            <p className="text-sm truncate">
                                                                {request.description}
                                                            </p>
                                                            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                {request.category}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm text-right">
                                                            {request.quantity}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm text-right whitespace-nowrap">
                                                            {formatMoney(Number(request.unitRate))}
                                                        </TableCell>
                                                        <TableCell>
                                                            {request.requestedBy ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="font-mono text-xs text-muted-foreground">
                                                                            {String(
                                                                                request.requestedBy
                                                                            ).slice(0, 8)}
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        {request.requestedBy}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <span className="text-muted-foreground">
                                                                    —
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                                            {request.createdAt
                                                                ? new Date(
                                                                      request.createdAt
                                                                  ).toLocaleString()
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={`${statusCfg.className} font-medium border whitespace-nowrap`}
                                                            >
                                                                {statusCfg.label}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>

                                                    {isOpen && (
                                                        <TableRow className="hover:bg-transparent">
                                                            <TableCell
                                                                colSpan={columnCount}
                                                                className="bg-muted/20 p-0"
                                                            >
                                                                <div className="px-6 py-5 space-y-4">
                                                                    {/* Description spans full width — most
                                                                    important field. */}
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                            Description
                                                                        </Label>
                                                                        <Input
                                                                            value={
                                                                                draft.description
                                                                            }
                                                                            disabled={!isRequested}
                                                                            className="font-mono"
                                                                            onChange={(event) =>
                                                                                setDraftValue(
                                                                                    request,
                                                                                    "description",
                                                                                    event.target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Category
                                                                            </Label>
                                                                            <Select
                                                                                value={
                                                                                    draft.category
                                                                                }
                                                                                disabled={
                                                                                    !isRequested
                                                                                }
                                                                                onValueChange={(
                                                                                    value
                                                                                ) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "category",
                                                                                        value as ServiceCategory
                                                                                    )
                                                                                }
                                                                            >
                                                                                <SelectTrigger>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="ASSEMBLY">
                                                                                        ASSEMBLY
                                                                                    </SelectItem>
                                                                                    <SelectItem value="EQUIPMENT">
                                                                                        EQUIPMENT
                                                                                    </SelectItem>
                                                                                    <SelectItem value="HANDLING">
                                                                                        HANDLING
                                                                                    </SelectItem>
                                                                                    <SelectItem value="RESKIN">
                                                                                        RESKIN
                                                                                    </SelectItem>
                                                                                    <SelectItem value="TRANSPORT">
                                                                                        TRANSPORT
                                                                                    </SelectItem>
                                                                                    <SelectItem value="OTHER">
                                                                                        OTHER
                                                                                    </SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Billing Mode
                                                                            </Label>
                                                                            <Select
                                                                                value={
                                                                                    draft.billingMode
                                                                                }
                                                                                disabled={
                                                                                    !isRequested
                                                                                }
                                                                                onValueChange={(
                                                                                    value
                                                                                ) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "billingMode",
                                                                                        value as LineItemBillingMode
                                                                                    )
                                                                                }
                                                                            >
                                                                                <SelectTrigger>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="BILLABLE">
                                                                                        BILLABLE
                                                                                    </SelectItem>
                                                                                    <SelectItem value="NON_BILLABLE">
                                                                                        NON_BILLABLE
                                                                                    </SelectItem>
                                                                                    <SelectItem value="COMPLIMENTARY">
                                                                                        COMPLIMENTARY
                                                                                    </SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Quantity
                                                                            </Label>
                                                                            <Input
                                                                                type="number"
                                                                                min={1}
                                                                                step={1}
                                                                                value={
                                                                                    draft.quantity
                                                                                }
                                                                                disabled={
                                                                                    !isRequested
                                                                                }
                                                                                className="font-mono"
                                                                                onChange={(event) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "quantity",
                                                                                        event.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Unit
                                                                            </Label>
                                                                            <Input
                                                                                value={draft.unit}
                                                                                disabled={
                                                                                    !isRequested
                                                                                }
                                                                                className="font-mono"
                                                                                onChange={(event) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "unit",
                                                                                        event.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Unit Rate (Buy)
                                                                            </Label>
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                step="0.01"
                                                                                value={
                                                                                    draft.unitRate
                                                                                }
                                                                                disabled={
                                                                                    !isRequested
                                                                                }
                                                                                className="font-mono"
                                                                                onChange={(event) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "unitRate",
                                                                                        event.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                        {/* Commercial half (P3-4): per-line
                                                                            sell override. Only BILLABLE lines
                                                                            can carry a sell override (API
                                                                            guard). Blank → seed-derived sell. */}
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Sell Rate (override)
                                                                            </Label>
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                step="0.01"
                                                                                value={
                                                                                    draft.sellRate
                                                                                }
                                                                                disabled={
                                                                                    !isRequested ||
                                                                                    draft.billingMode !==
                                                                                        "BILLABLE"
                                                                                }
                                                                                placeholder={
                                                                                    draft.billingMode ===
                                                                                    "BILLABLE"
                                                                                        ? "Auto (seed margin)"
                                                                                        : "N/A"
                                                                                }
                                                                                className="font-mono"
                                                                                onChange={(event) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "sellRate",
                                                                                        event.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Client price visibility — whether this
                                                                        individual line's price shows on
                                                                        client-facing views. Only meaningful for
                                                                        BILLABLE lines. */}
                                                                    {draft.billingMode ===
                                                                        "BILLABLE" && (
                                                                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                            <Checkbox
                                                                                checked={
                                                                                    draft.clientPriceVisible
                                                                                }
                                                                                disabled={
                                                                                    !isRequested
                                                                                }
                                                                                onCheckedChange={(
                                                                                    checked
                                                                                ) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "clientPriceVisible",
                                                                                        checked ===
                                                                                            true
                                                                                    )
                                                                                }
                                                                            />
                                                                            Show this line&apos;s
                                                                            price to the client
                                                                        </label>
                                                                    )}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Request Notes
                                                                            </Label>
                                                                            <Textarea
                                                                                rows={2}
                                                                                value={draft.notes}
                                                                                disabled={
                                                                                    !isRequested
                                                                                }
                                                                                className="font-mono text-sm"
                                                                                onChange={(event) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "notes",
                                                                                        event.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Admin Note
                                                                            </Label>
                                                                            <Textarea
                                                                                rows={2}
                                                                                value={
                                                                                    draft.adminNote
                                                                                }
                                                                                disabled={
                                                                                    !isRequested
                                                                                }
                                                                                className="font-mono text-sm"
                                                                                onChange={(event) =>
                                                                                    setDraftValue(
                                                                                        request,
                                                                                        "adminNote",
                                                                                        event.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {isRequested ? (
                                                                        <div className="flex flex-wrap justify-end gap-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                onClick={() =>
                                                                                    handleReject(
                                                                                        request
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    reject.isPending ||
                                                                                    approve.isPending
                                                                                }
                                                                            >
                                                                                Reject
                                                                            </Button>
                                                                            <Button
                                                                                onClick={() =>
                                                                                    handleApprove(
                                                                                        request
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    approve.isPending ||
                                                                                    reject.isPending
                                                                                }
                                                                            >
                                                                                Approve & Create
                                                                            </Button>
                                                                        </div>
                                                                    ) : request.adminNote ? (
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                                                Admin Note
                                                                            </Label>
                                                                            <p className="text-sm font-mono text-muted-foreground">
                                                                                {request.adminNote}
                                                                            </p>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
