"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useListServiceTypes } from "@/hooks/use-service-types";
import { useCreateCatalogLineItem } from "@/hooks/use-order-line-items";
import type { LineItemBillingMode, ServiceCategory } from "@/types/hybrid-pricing";

interface AddCatalogLineItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetId?: string;
    orderId?: string;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
}

type ServiceRow = {
    id: string;
    name: string;
    category: ServiceCategory;
    unit: string;
    default_rate: number;
    description?: string | null;
};

type SelectedEntry = {
    service: ServiceRow;
    quantity: string;
};

const CATEGORY_OPTIONS: Array<"ALL" | ServiceCategory> = [
    "ALL",
    "ASSEMBLY",
    "EQUIPMENT",
    "HANDLING",
    "RESKIN",
    "TRANSPORT",
    "OTHER",
];

export function AddCatalogLineItemModal({
    open,
    onOpenChange,
    targetId,
    orderId,
    purposeType = "ORDER",
}: AddCatalogLineItemModalProps) {
    const resolvedTargetId = targetId || orderId || "";
    const createLineItem = useCreateCatalogLineItem(resolvedTargetId, purposeType);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [category, setCategory] = useState<"ALL" | ServiceCategory>("ALL");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>("BILLABLE");
    const [notes, setNotes] = useState("");
    const [selectedById, setSelectedById] = useState<Record<string, SelectedEntry>>({});

    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    useEffect(() => {
        if (!open) {
            setSearch("");
            setDebouncedSearch("");
            setCategory("ALL");
            setPage(1);
            setLimit(20);
            setBillingMode("BILLABLE");
            setNotes("");
            setSelectedById({});
        }
    }, [open]);

    const { data: serviceTypesResponse, isFetching } = useListServiceTypes({
        page: String(page),
        limit: String(limit),
        search_term: debouncedSearch || undefined,
        category: category === "ALL" ? undefined : category,
    });

    const serviceTypes = useMemo(
        () => (serviceTypesResponse?.data || []) as ServiceRow[],
        [serviceTypesResponse?.data]
    );
    const total = Number(serviceTypesResponse?.meta?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const selectedIds = Object.keys(selectedById);

    const allCurrentPageSelected =
        serviceTypes.length > 0 && serviceTypes.every((service) => selectedById[service.id]);

    const toggleServiceSelection = (service: ServiceRow, checked: boolean) => {
        setSelectedById((prev) => {
            const next = { ...prev };
            if (checked) {
                const existing = next[service.id];
                next[service.id] = {
                    service,
                    quantity: existing?.quantity || "1",
                };
                return next;
            }
            delete next[service.id];
            return next;
        });
    };

    const toggleSelectAllOnPage = (checked: boolean) => {
        setSelectedById((prev) => {
            const next = { ...prev };
            if (checked) {
                for (const service of serviceTypes) {
                    const existing = next[service.id];
                    next[service.id] = {
                        service,
                        quantity: existing?.quantity || "1",
                    };
                }
                return next;
            }
            for (const service of serviceTypes) {
                delete next[service.id];
            }
            return next;
        });
    };

    const updateQuantity = (serviceId: string, value: string) => {
        setSelectedById((prev) => {
            const existing = prev[serviceId];
            if (!existing) return prev;
            return {
                ...prev,
                [serviceId]: {
                    ...existing,
                    quantity: value,
                },
            };
        });
    };

    const bumpQuantity = (serviceId: string, delta: number) => {
        const current = Number(selectedById[serviceId]?.quantity || "1");
        const next = Math.max(1, Math.floor(current + delta));
        updateQuantity(serviceId, String(next));
    };

    const handleAddSelected = async () => {
        if (!resolvedTargetId) {
            toast.error("Missing target ID");
            return;
        }
        if (selectedIds.length === 0) {
            toast.error("Select at least one service");
            return;
        }

        try {
            for (const id of selectedIds) {
                const selected = selectedById[id];
                if (!selected) continue;
                const quantityValue = Number(selected.quantity || "1");
                if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
                    toast.error(`Invalid quantity for ${selected.service.name}`);
                    return;
                }

                await createLineItem.mutateAsync({
                    service_type_id: id,
                    quantity: quantityValue,
                    billing_mode: billingMode,
                    notes: notes.trim() || undefined,
                });
            }

            toast.success(`${selectedIds.length} service line item(s) added`);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to add selected services");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-6xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add Catalog Services</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1 md:col-span-2">
                            <Label className="text-xs">Search services</Label>
                            <Input
                                placeholder="Search by name, category, or unit..."
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Select
                                value={category}
                                onValueChange={(value) => {
                                    setCategory(value as "ALL" | ServiceCategory);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORY_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Page size</Label>
                            <Select
                                value={String(limit)}
                                onValueChange={(value) => {
                                    setLimit(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 40, 80].map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Billing mode</Label>
                            <Select
                                value={billingMode}
                                onValueChange={(value) =>
                                    setBillingMode(value as LineItemBillingMode)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BILLABLE">BILLABLE</SelectItem>
                                    <SelectItem value="NON_BILLABLE">NON_BILLABLE</SelectItem>
                                    <SelectItem value="COMPLIMENTARY">COMPLIMENTARY</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="self-end text-xs text-muted-foreground">
                            Selected: {selectedIds.length} service
                            {selectedIds.length === 1 ? "" : "s"}
                        </div>
                    </div>

                    <div className="rounded-md border border-border overflow-hidden">
                        <div className="max-h-[46vh] overflow-auto hidden md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0 z-10">
                                    <tr className="border-b border-border">
                                        <th className="w-10 px-3 py-2 text-left">
                                            <Checkbox
                                                checked={allCurrentPageSelected}
                                                onCheckedChange={(checked) =>
                                                    toggleSelectAllOnPage(Boolean(checked))
                                                }
                                            />
                                        </th>
                                        <th className="px-3 py-2 text-left">Service</th>
                                        <th className="px-3 py-2 text-left">Category</th>
                                        <th className="px-3 py-2 text-left">Unit</th>
                                        <th className="px-3 py-2 text-left">Default Rate</th>
                                        <th className="px-3 py-2 text-left">Qty</th>
                                        <th className="px-3 py-2 text-left">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isFetching ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-8 text-center text-muted-foreground"
                                            >
                                                Loading services...
                                            </td>
                                        </tr>
                                    ) : serviceTypes.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-8 text-center text-muted-foreground"
                                            >
                                                No services found
                                            </td>
                                        </tr>
                                    ) : (
                                        serviceTypes.map((service) => {
                                            const checked = Boolean(selectedById[service.id]);
                                            const quantity =
                                                selectedById[service.id]?.quantity || "1";
                                            return (
                                                <tr
                                                    key={service.id}
                                                    className="border-b border-border/70 hover:bg-muted/30"
                                                >
                                                    <td className="px-3 py-2 align-top">
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={(value) =>
                                                                toggleServiceSelection(
                                                                    service,
                                                                    Boolean(value)
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleServiceSelection(
                                                                    service,
                                                                    !checked
                                                                )
                                                            }
                                                            className="font-medium text-left hover:underline"
                                                        >
                                                            {service.name}
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        {service.category}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        {service.unit}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        {(
                                                            Number(service.default_rate) || 0
                                                        ).toFixed(2)}{" "}
                                                        AED
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8"
                                                                disabled={!checked}
                                                                onClick={() =>
                                                                    bumpQuantity(service.id, -1)
                                                                }
                                                            >
                                                                <Minus className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                step={1}
                                                                className="h-8 w-20 text-center"
                                                                disabled={!checked}
                                                                value={quantity}
                                                                onChange={(event) =>
                                                                    updateQuantity(
                                                                        service.id,
                                                                        event.target.value
                                                                    )
                                                                }
                                                            />
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8"
                                                                disabled={!checked}
                                                                onClick={() =>
                                                                    bumpQuantity(service.id, 1)
                                                                }
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-muted-foreground">
                                                        {service.description || "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden divide-y divide-border">
                            {isFetching ? (
                                <div className="p-4 text-sm text-muted-foreground">
                                    Loading services...
                                </div>
                            ) : serviceTypes.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">
                                    No services found
                                </div>
                            ) : (
                                serviceTypes.map((service) => {
                                    const checked = Boolean(selectedById[service.id]);
                                    const quantity = selectedById[service.id]?.quantity || "1";
                                    return (
                                        <div key={service.id} className="p-3 space-y-2">
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={(value) =>
                                                        toggleServiceSelection(
                                                            service,
                                                            Boolean(value)
                                                        )
                                                    }
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleServiceSelection(
                                                                service,
                                                                !checked
                                                            )
                                                        }
                                                        className="font-medium text-left hover:underline"
                                                    >
                                                        {service.name}
                                                    </button>
                                                    <p className="text-xs text-muted-foreground">
                                                        {service.category} · {service.unit} ·{" "}
                                                        {(
                                                            Number(service.default_rate) || 0
                                                        ).toFixed(2)}{" "}
                                                        AED
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8"
                                                    disabled={!checked}
                                                    onClick={() => bumpQuantity(service.id, -1)}
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    className="h-8 text-center"
                                                    disabled={!checked}
                                                    value={quantity}
                                                    onChange={(event) =>
                                                        updateQuantity(
                                                            service.id,
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8"
                                                    disabled={!checked}
                                                    onClick={() => bumpQuantity(service.id, 1)}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={page <= 1}
                            >
                                Prev
                            </Button>
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={page >= totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (applies to all selected)</Label>
                        <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={3}
                            placeholder="Internal note for selected line items"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createLineItem.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAddSelected}
                        disabled={createLineItem.isPending || selectedIds.length === 0}
                    >
                        {createLineItem.isPending
                            ? "Adding..."
                            : `Add Selected (${selectedIds.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
