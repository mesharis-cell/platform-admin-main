"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
    useApproveLineItemRequest,
    useLineItemRequests,
    useRejectLineItemRequest,
} from "@/hooks/use-line-item-requests";
import type { LineItemBillingMode, ServiceCategory } from "@/types/hybrid-pricing";
import { ClipboardList, PackageSearch } from "lucide-react";
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

export default function LineItemRequestsPage() {
    const [statusFilter, setStatusFilter] = useState<"REQUESTED" | "APPROVED" | "REJECTED">(
        "REQUESTED"
    );
    const { data, isLoading, refetch } = useLineItemRequests({
        status: statusFilter,
        limit: 100,
    });
    const approve = useApproveLineItemRequest();
    const reject = useRejectLineItemRequest();
    const [drafts, setDrafts] = useState<DraftMap>({});

    const requests = useMemo(() => data || [], [data]);

    const getDraft = (request: any) => drafts[request.id] || toDraft(request);

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

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={ClipboardList}
                title="LINE ITEM REQUESTS"
                description="Logistics Requests · Admin Review · Approval"
                stats={{ label: "SHOWING", value: requests.length }}
                actions={
                    <div className="w-52">
                        <Select
                            value={statusFilter}
                            onValueChange={(value) =>
                                setStatusFilter(value as "REQUESTED" | "APPROVED" | "REJECTED")
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="REQUESTED">REQUESTED</SelectItem>
                                <SelectItem value="APPROVED">APPROVED</SelectItem>
                                <SelectItem value="REJECTED">REJECTED</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                }
            />

            <div className="mx-auto max-w-[1600px] px-6 py-8 space-y-4">
                {isLoading ? (
                    <Card>
                        <CardContent className="p-6 text-sm text-muted-foreground">
                            Loading line item requests...
                        </CardContent>
                    </Card>
                ) : requests.length === 0 ? (
                    <Card>
                        <CardContent className="p-10 text-center">
                            <PackageSearch className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No line item requests found.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {requests.map((request: any) => {
                            const draft = getDraft(request);
                            const isRequested = request.status === "REQUESTED";
                            return (
                                <Card key={request.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <CardTitle className="text-base font-mono">
                                                    {request.lineItemRequestId}
                                                </CardTitle>
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-[10px] uppercase tracking-wide"
                                                >
                                                    {request.purposeType}
                                                </Badge>
                                                <Badge className="font-mono text-[10px] uppercase tracking-wide">
                                                    {request.status}
                                                </Badge>
                                            </div>
                                            {request.createdAt && (
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    {new Date(request.createdAt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Description spans full width — it's the most important
                                        field and was getting cramped in the 3-col grid. */}
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                Description
                                            </Label>
                                            <Input
                                                value={draft.description}
                                                disabled={!isRequested}
                                                className="font-mono"
                                                onChange={(event) =>
                                                    setDraftValue(
                                                        request,
                                                        "description",
                                                        event.target.value
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
                                                    value={draft.category}
                                                    disabled={!isRequested}
                                                    onValueChange={(value) =>
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
                                                        <SelectItem value="OTHER">OTHER</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                    Billing Mode
                                                </Label>
                                                <Select
                                                    value={draft.billingMode}
                                                    disabled={!isRequested}
                                                    onValueChange={(value) =>
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
                                                    value={draft.quantity}
                                                    disabled={!isRequested}
                                                    className="font-mono"
                                                    onChange={(event) =>
                                                        setDraftValue(
                                                            request,
                                                            "quantity",
                                                            event.target.value
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
                                                    disabled={!isRequested}
                                                    className="font-mono"
                                                    onChange={(event) =>
                                                        setDraftValue(
                                                            request,
                                                            "unit",
                                                            event.target.value
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
                                                    value={draft.unitRate}
                                                    disabled={!isRequested}
                                                    className="font-mono"
                                                    onChange={(event) =>
                                                        setDraftValue(
                                                            request,
                                                            "unitRate",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            {/* Commercial half (P3-4): per-line sell override.
                                                Only BILLABLE lines can carry a sell override
                                                (API guard). Blank → seed-derived sell. */}
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                    Sell Rate (override)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={draft.sellRate}
                                                    disabled={
                                                        !isRequested ||
                                                        draft.billingMode !== "BILLABLE"
                                                    }
                                                    placeholder={
                                                        draft.billingMode === "BILLABLE"
                                                            ? "Auto (seed margin)"
                                                            : "N/A"
                                                    }
                                                    className="font-mono"
                                                    onChange={(event) =>
                                                        setDraftValue(
                                                            request,
                                                            "sellRate",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* Client price visibility — whether this individual
                                            line's price shows on client-facing views. Only
                                            meaningful for BILLABLE lines. */}
                                        {draft.billingMode === "BILLABLE" && (
                                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Checkbox
                                                    checked={draft.clientPriceVisible}
                                                    disabled={!isRequested}
                                                    onCheckedChange={(checked) =>
                                                        setDraftValue(
                                                            request,
                                                            "clientPriceVisible",
                                                            checked === true
                                                        )
                                                    }
                                                />
                                                Show this line&apos;s price to the client
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
                                                    disabled={!isRequested}
                                                    className="font-mono text-sm"
                                                    onChange={(event) =>
                                                        setDraftValue(
                                                            request,
                                                            "notes",
                                                            event.target.value
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
                                                    value={draft.adminNote}
                                                    disabled={!isRequested}
                                                    className="font-mono text-sm"
                                                    onChange={(event) =>
                                                        setDraftValue(
                                                            request,
                                                            "adminNote",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {isRequested ? (
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleReject(request)}
                                                    disabled={reject.isPending || approve.isPending}
                                                >
                                                    Reject
                                                </Button>
                                                <Button
                                                    onClick={() => handleApprove(request)}
                                                    disabled={approve.isPending || reject.isPending}
                                                >
                                                    Approve & Create
                                                </Button>
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
