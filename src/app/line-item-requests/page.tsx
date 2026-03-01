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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    useApproveLineItemRequest,
    useLineItemRequests,
    useRejectLineItemRequest,
} from "@/hooks/use-line-item-requests";
import type { LineItemBillingMode, ServiceCategory } from "@/types/hybrid-pricing";
import { PackageSearch } from "lucide-react";

type DraftMap = Record<
    string,
    {
        description: string;
        category: ServiceCategory;
        quantity: string;
        unit: string;
        unitRate: string;
        notes: string;
        adminNote: string;
        billingMode: LineItemBillingMode;
    }
>;

type RequestDraft = DraftMap[string];

const EMPTY_REQUEST_DRAFT: RequestDraft = {
    description: "",
    category: "OTHER",
    quantity: "1",
    unit: "service",
    unitRate: "0",
    notes: "",
    adminNote: "",
    billingMode: "BILLABLE",
};

const toDraft = (request: any) => ({
    description: request.description || "",
    category: (request.category || "OTHER") as ServiceCategory,
    quantity: String(request.quantity ?? 1),
    unit: request.unit || "service",
    unitRate: String(request.unitRate ?? 0),
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

    const setDraftValue = <K extends keyof RequestDraft>(
        requestId: string,
        key: K,
        value: RequestDraft[K]
    ) => {
        setDrafts((prev) => ({
            ...prev,
            [requestId]: {
                ...(prev[requestId] || EMPTY_REQUEST_DRAFT),
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
        <div className="container mx-auto px-4 py-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-semibold font-mono">Line Item Requests</h1>
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
            </div>

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
                                <CardHeader className="pb-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <CardTitle className="text-base font-mono">
                                            {request.lineItemRequestId}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{request.purposeType}</Badge>
                                            <Badge>{request.status}</Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Description</Label>
                                            <Input
                                                value={draft.description}
                                                disabled={!isRequested}
                                                onChange={(event) =>
                                                    setDraftValue(
                                                        request.id,
                                                        "description",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Category</Label>
                                            <Select
                                                value={draft.category}
                                                disabled={!isRequested}
                                                onValueChange={(value) =>
                                                    setDraftValue(
                                                        request.id,
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
                                                    <SelectItem value="RESKIN">RESKIN</SelectItem>
                                                    <SelectItem value="TRANSPORT">
                                                        TRANSPORT
                                                    </SelectItem>
                                                    <SelectItem value="OTHER">OTHER</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Billing Mode</Label>
                                            <Select
                                                value={draft.billingMode}
                                                disabled={!isRequested}
                                                onValueChange={(value) =>
                                                    setDraftValue(
                                                        request.id,
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
                                            <Label className="text-xs">Quantity</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={draft.quantity}
                                                disabled={!isRequested}
                                                onChange={(event) =>
                                                    setDraftValue(
                                                        request.id,
                                                        "quantity",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Unit</Label>
                                            <Input
                                                value={draft.unit}
                                                disabled={!isRequested}
                                                onChange={(event) =>
                                                    setDraftValue(
                                                        request.id,
                                                        "unit",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Unit Rate</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={draft.unitRate}
                                                disabled={!isRequested}
                                                onChange={(event) =>
                                                    setDraftValue(
                                                        request.id,
                                                        "unitRate",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Request Notes</Label>
                                            <Textarea
                                                rows={2}
                                                value={draft.notes}
                                                disabled={!isRequested}
                                                onChange={(event) =>
                                                    setDraftValue(
                                                        request.id,
                                                        "notes",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Admin Note</Label>
                                            <Textarea
                                                rows={2}
                                                value={draft.adminNote}
                                                disabled={!isRequested}
                                                onChange={(event) =>
                                                    setDraftValue(
                                                        request.id,
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
    );
}
