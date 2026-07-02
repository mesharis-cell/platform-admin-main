"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Edit, Minus, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
    useListLineItems,
    usePatchEntityLineItemsVisibility,
    usePatchLineItemVisibility,
    usePatchLineItemMetadata,
    useUpdateLineItem,
    useVoidLineItem,
} from "@/hooks/use-order-line-items";
import { VoidLineItemDialog } from "./VoidLineItemDialog";
import { LineVisibilityChip } from "./LineVisibilityChip";
import type { LineItemBillingMode, OrderLineItem } from "@/types/hybrid-pricing";

interface OrderLineItemsListProps {
    targetId: string;
    canManage?: boolean;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP";
    allowClientVisibilityControls?: boolean;
}

type EditDraft = {
    quantity: string;
    unitRate: string;
    billingMode: LineItemBillingMode;
    notes: string;
    metadataJson: string;
    // Per-unit sell override. `sellUnitRate` is a free-text string; blank =
    // no override (blanket-margin math applies). `sellTouched` records that
    // the sell/margin control was explicitly edited during this edit session
    // so the save path knows whether to include sellUnitRate in the payload
    // (untouched = OMIT so the API leaves the column as-is).
    sellUnitRate: string;
    sellTouched: boolean;
    // Snapshot of the override that existed on the line when edit opened.
    // Used to render the "Override" chip + decide reset semantics.
    hadOverride: boolean;
};

const EMPTY_DRAFT: EditDraft = {
    quantity: "1",
    unitRate: "0",
    billingMode: "BILLABLE",
    notes: "",
    metadataJson: "",
    sellUnitRate: "",
    sellTouched: false,
    hadOverride: false,
};

// margin% derived from buy + sell. Returns a display token, not just a number,
// because buy=0 is a legitimate "fee" line where margin% is undefined.
const deriveMargin = (
    buy: number,
    sell: number
): { display: string; isFee: boolean; percent: number | null } => {
    if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
        return { display: "—", isFee: false, percent: null };
    }
    if (buy > 0) {
        const pct = Math.round(((sell - buy) / buy) * 100);
        return { display: `${pct}%`, isFee: false, percent: pct };
    }
    // buy == 0
    if (sell > 0) {
        return { display: "Fee", isFee: true, percent: null };
    }
    return { display: "—", isFee: false, percent: null };
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// Read the active sell override off a line item. The list response runs
// mapArraySnakeToCamel, so it arrives as `sellUnitRate`; fall back to the raw
// snake key defensively. NULL / absent = no override.
const readSellOverride = (item: OrderLineItem): number | null => {
    const raw = item.sellUnitRate ?? item.sell_unit_rate ?? null;
    if (raw == null) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
};

const getSystemLineCopy = (item: OrderLineItem) => {
    if (item.systemKey === "BASE_OPS") {
        return "Calculated from total volume and warehouse operations rate.";
    }

    return "Calculated automatically by the platform.";
};

const mapDraftFromItem = (item: OrderLineItem): EditDraft => {
    const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : undefined;
    const metadataJson =
        metadata && Object.keys(metadata).length > 0 ? JSON.stringify(metadata, null, 2) : "";

    const sellOverride = readSellOverride(item);

    return {
        quantity: String(item.quantity ?? 1),
        unitRate: String(item.unitRate ?? 0),
        billingMode: (item.billingMode || "BILLABLE") as LineItemBillingMode,
        notes: item.notes || "",
        metadataJson,
        // Pre-fill the sell field only when a real override exists. Blank when
        // none — so the placeholder can hint the auto (blanket-margin) sell.
        sellUnitRate: sellOverride != null ? String(sellOverride) : "",
        sellTouched: false,
        hadOverride: sellOverride != null,
    };
};

export function OrderLineItemsList({
    targetId,
    canManage = false,
    purposeType = "ORDER",
    allowClientVisibilityControls = false,
}: OrderLineItemsListProps) {
    const { data: lineItems, isLoading } = useListLineItems(targetId, purposeType);
    const voidLineItem = useVoidLineItem(targetId, purposeType);
    const updateLineItem = useUpdateLineItem(targetId, purposeType);
    const patchLineItemMetadata = usePatchLineItemMetadata(targetId, purposeType);
    const patchLineVisibility = usePatchLineItemVisibility(targetId, purposeType);
    const patchBulkVisibility = usePatchEntityLineItemsVisibility(targetId, purposeType);

    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<OrderLineItem | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [draft, setDraft] = useState<EditDraft>(EMPTY_DRAFT);

    const activeItems = useMemo(
        () => lineItems?.filter((item: OrderLineItem) => !item.isVoided) || [],
        [lineItems]
    );

    const catalogItems = activeItems.filter(
        (item: OrderLineItem) => item.lineItemType === "CATALOG"
    );
    const customItems = activeItems.filter((item: OrderLineItem) => item.lineItemType === "CUSTOM");
    const systemItems = activeItems.filter((item: OrderLineItem) => item.lineItemType === "SYSTEM");
    const visibilityEligibleItems = activeItems;

    const allClientVisible =
        visibilityEligibleItems.length > 0 &&
        visibilityEligibleItems.every((item) => item.clientPriceVisible);

    const openVoidDialog = (item: OrderLineItem) => {
        setSelectedItem(item);
        setVoidDialogOpen(true);
    };

    const startEdit = (item: OrderLineItem) => {
        setEditingItemId(item.id);
        setDraft(mapDraftFromItem(item));
    };

    const cancelEdit = () => {
        setEditingItemId(null);
        setDraft(EMPTY_DRAFT);
    };

    const parseMetadata = () => {
        const trimmed = draft.metadataJson.trim();
        if (!trimmed) return undefined;
        try {
            const parsed = JSON.parse(trimmed);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Metadata must be a JSON object");
            }
            return parsed as Record<string, unknown>;
        } catch {
            throw new Error("Metadata must be valid JSON object");
        }
    };

    const handleVoid = async (reason: string) => {
        if (!selectedItem) return;

        try {
            await voidLineItem.mutateAsync({
                itemId: selectedItem.id,
                data: { void_reason: reason },
            });
            toast.success("Line item removed");
            setVoidDialogOpen(false);
            setSelectedItem(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to void line item");
        }
    };

    const handleSaveEdit = async (item: OrderLineItem) => {
        try {
            const metadata = parseMetadata();

            if (item.canEditPricingFields === false) {
                await patchLineItemMetadata.mutateAsync({
                    itemId: item.id,
                    data: {
                        notes: draft.notes || undefined,
                        metadata,
                    },
                });
                toast.success("Metadata updated");
            } else {
                const quantityNumber = Number(draft.quantity || 0);
                const unitRateNumber = Number(draft.unitRate || 0);
                if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
                    toast.error("Quantity must be greater than 0");
                    return;
                }
                if (!Number.isFinite(unitRateNumber) || unitRateNumber < 0) {
                    toast.error("Unit rate must be 0 or greater");
                    return;
                }

                // Sell override: only include in the payload when the sell/margin
                // control was actually edited this session (sellTouched).
                //   - blank field  → send null  (clear override → back to auto)
                //   - number field → send that number (set/keep override)
                //   - untouched    → OMIT the key (absent = no change)
                let sellUnitRatePayload: { sellUnitRate?: number | null } = {};
                if (draft.sellTouched) {
                    const trimmed = draft.sellUnitRate.trim();
                    if (trimmed === "") {
                        sellUnitRatePayload = { sellUnitRate: null };
                    } else {
                        const sellNum = Number(trimmed);
                        if (!Number.isFinite(sellNum) || sellNum < 0) {
                            toast.error("Sell rate must be 0 or greater");
                            return;
                        }
                        sellUnitRatePayload = { sellUnitRate: sellNum };
                    }
                }

                await updateLineItem.mutateAsync({
                    itemId: item.id,
                    data: {
                        quantity: quantityNumber,
                        unitRate: unitRateNumber,
                        billingMode: draft.billingMode,
                        notes: draft.notes || undefined,
                        metadata,
                        ...sellUnitRatePayload,
                    },
                });
                toast.success("Line item updated");
            }

            cancelEdit();
        } catch (error: any) {
            toast.error(error.message || "Failed to update line item");
        }
    };

    const handleLineVisibility = async (
        itemId: string,
        next: { clientPriceVisible?: boolean; logisticsVisible?: boolean }
    ) => {
        try {
            await patchLineVisibility.mutateAsync({ itemId, data: next });
            toast.success("Visibility updated");
        } catch (error: any) {
            toast.error(error.message || "Failed to update visibility");
        }
    };

    const handleBulkClientVisibility = async (next: boolean) => {
        try {
            await patchBulkVisibility.mutateAsync({
                clientPriceVisible: next,
                lineItemIds: visibilityEligibleItems.map((item) => item.id),
            });
            toast.success(
                next ? "All line prices shown to client" : "All line prices hidden from client"
            );
        } catch (error: any) {
            toast.error(error.message || "Failed to update client visibility");
        }
    };

    const adjustQty = (delta: number) => {
        const current = Number(draft.quantity || "1");
        const next = Math.max(1, Math.floor(current + delta));
        setDraft((prev) => ({ ...prev, quantity: String(next) }));
    };

    // --- Linked Buy · Sell · Margin% control -------------------------------
    // Editing buy HOLDS the sell (per owner: "hold sell") and lets margin%
    // re-derive. Editing sell keeps buy, re-derives margin%. Editing margin%
    // keeps buy, recomputes sell = buy × (1 + margin%/100).

    const handleBuyChange = (value: string) => {
        // Hold sell as-is; margin% re-derives from the new buy in render.
        setDraft((prev) => ({ ...prev, unitRate: value }));
    };

    const handleSellChange = (value: string) => {
        // A sell edit is an explicit override. Blank clears it (auto margin).
        setDraft((prev) => ({ ...prev, sellUnitRate: value, sellTouched: true }));
    };

    const handleMarginChange = (value: string) => {
        setDraft((prev) => {
            const trimmed = value.trim();
            // Blank margin → clear the sell override (back to auto).
            if (trimmed === "") {
                return { ...prev, sellUnitRate: "", sellTouched: true };
            }
            const pct = Number(trimmed);
            const buy = Number(prev.unitRate || 0);
            if (!Number.isFinite(pct) || !Number.isFinite(buy) || buy <= 0) {
                // Can't derive a sell from margin% when buy is 0/invalid.
                // Keep the sell untouched-blank; the "Fee" display governs.
                return prev;
            }
            const sell = roundMoney(buy * (1 + pct / 100));
            return { ...prev, sellUnitRate: String(sell), sellTouched: true };
        });
    };

    // "Reset to auto" — clear the sell override so blanket-margin math resumes.
    const handleResetSell = () => {
        setDraft((prev) => ({ ...prev, sellUnitRate: "", sellTouched: true }));
    };

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">Loading line items...</p>;
    }

    if (activeItems.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground text-sm">
                No service line items added yet
            </div>
        );
    }

    const renderLineItem = (item: OrderLineItem, highlighted = false) => {
        const isEditing = editingItemId === item.id;
        const isSystemLine = item.lineItemType === "SYSTEM";
        const pricingLocked = isSystemLine || item.canEditPricingFields === false;
        const canMutateLine = canManage && !isSystemLine;
        const canManageVisibility = allowClientVisibilityControls && canManage;
        const visibilityBusy = patchLineVisibility.isPending || patchBulkVisibility.isPending;

        return (
            <div
                key={item.id}
                className={`p-3 border border-border rounded-md ${highlighted ? "bg-amber-50/30 dark:bg-amber-950/10" : "bg-muted/30"}`}
            >
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{item.description}</span>
                    <Badge variant="outline" className="text-xs">
                        {item.category}
                    </Badge>
                    {item.billingMode && (
                        <Badge variant="secondary" className="text-xs">
                            {item.billingMode.replaceAll("_", " ")}
                        </Badge>
                    )}
                    <Badge variant={pricingLocked ? "outline" : "default"} className="text-xs">
                        {isSystemLine
                            ? "System Managed"
                            : pricingLocked
                              ? "Pricing Locked"
                              : "Pricing Editable"}
                    </Badge>
                    {!isSystemLine && readSellOverride(item) != null ? (
                        <Badge variant="secondary" className="text-xs">
                            Sell override
                        </Badge>
                    ) : null}
                    {canManageVisibility ? (
                        <div className="ml-auto">
                            <LineVisibilityChip
                                clientPriceVisible={Boolean(item.clientPriceVisible)}
                                logisticsVisible={item.logisticsVisible !== false}
                                onChange={(next) => handleLineVisibility(item.id, next)}
                                disabled={visibilityBusy}
                            />
                        </div>
                    ) : null}
                </div>

                {pricingLocked && item.lockReason && !isSystemLine ? (
                    <p className="text-[11px] text-muted-foreground mt-1">{item.lockReason}</p>
                ) : null}
                {isSystemLine && item.systemKey ? (
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Auto-managed charge: {item.systemKey.replaceAll("_", " ")}
                    </p>
                ) : null}

                {!isEditing ? (
                    <>
                        <p className="text-xs text-muted-foreground mt-1">
                            {item.quantity || 0} {item.unit || "unit"} ×{" "}
                            {item.unitRate?.toFixed(2) || "0.00"} AED
                            {!isSystemLine && readSellOverride(item) != null ? (
                                <span className="ml-2 inline-flex items-center gap-1 text-primary">
                                    · Sell override {readSellOverride(item)?.toFixed(2)} AED / unit
                                </span>
                            ) : null}
                        </p>
                        {isSystemLine ? (
                            <p className="text-xs text-muted-foreground mt-1">
                                {getSystemLineCopy(item)}
                            </p>
                        ) : null}
                        {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">Note: {item.notes}</p>
                        )}
                        {!isSystemLine &&
                        item.metadata &&
                        typeof item.metadata === "object" &&
                        Object.keys(item.metadata).length > 0 ? (
                            <pre className="mt-2 rounded border border-border/60 bg-background/70 p-2 text-[11px] whitespace-pre-wrap break-all">
                                {JSON.stringify(item.metadata, null, 2)}
                            </pre>
                        ) : null}
                    </>
                ) : (
                    <div className="mt-3 space-y-3 rounded-md border border-border/80 bg-background p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Quantity</Label>
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8"
                                        disabled={pricingLocked}
                                        onClick={() => adjustQty(-1)}
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Input
                                        value={draft.quantity}
                                        type="number"
                                        min={1}
                                        step={1}
                                        disabled={pricingLocked}
                                        className="text-center"
                                        onChange={(event) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                quantity: event.target.value,
                                            }))
                                        }
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8"
                                        disabled={pricingLocked}
                                        onClick={() => adjustQty(1)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Billing Mode</Label>
                                <Select
                                    value={draft.billingMode}
                                    disabled={pricingLocked}
                                    onValueChange={(value) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            billingMode: value as LineItemBillingMode,
                                        }))
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
                        </div>

                        {/* Linked Buy · Sell · Margin% control. Buy is the unit
                            cost. Sell is the optional per-unit override — blank
                            means blanket-margin math (the placeholder hints the
                            auto sell). Margin% is the derived lever:
                              • edit margin% → sell = buy × (1 + margin%/100)
                              • edit sell    → margin% re-derives
                              • edit buy     → sell is HELD, margin% re-derives
                            buy=0 shows "Fee" (margin% undefined). An override chip
                            + "Reset to auto" surface/clear an active override. */}
                        {(() => {
                            const buyNum = Number(draft.unitRate || 0);
                            const sellTrimmed = draft.sellUnitRate.trim();
                            const hasSell = sellTrimmed !== "";
                            const sellNum = hasSell ? Number(sellTrimmed) : NaN;
                            const autoSell =
                                Number.isFinite(buyNum) && buyNum >= 0
                                    ? roundMoney(buyNum) // fallback hint when margin unknown at line level
                                    : 0;
                            // Effective sell used to derive margin%: the typed
                            // override if present, else the auto (buy passthrough
                            // hint — the real blanket margin is applied server-side).
                            const effectiveSell = hasSell ? sellNum : autoSell;
                            const margin = deriveMargin(buyNum, effectiveSell);
                            // An override is "active" whenever a sell value is
                            // present in the draft (pending save). Also treat the
                            // line's pre-existing override as active until the user
                            // explicitly touches (and possibly clears) the control.
                            const overrideActive =
                                hasSell || (draft.hadOverride && !draft.sellTouched);
                            const marginValue =
                                hasSell && margin.percent != null ? String(margin.percent) : "";
                            return (
                                <div className="space-y-2 rounded-md border border-border/60 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label className="text-xs">Pricing (per unit)</Label>
                                        <div className="flex items-center gap-2">
                                            {overrideActive && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] uppercase tracking-wide"
                                                >
                                                    Override
                                                </Badge>
                                            )}
                                            {overrideActive && !pricingLocked ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[11px]"
                                                    onClick={handleResetSell}
                                                >
                                                    <RotateCcw className="h-3 w-3 mr-1" />
                                                    Reset to auto
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[11px] text-muted-foreground">
                                                Buy (AED)
                                            </Label>
                                            <Input
                                                value={draft.unitRate}
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                disabled={pricingLocked}
                                                onChange={(event) =>
                                                    handleBuyChange(event.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px] text-muted-foreground">
                                                Sell (AED)
                                            </Label>
                                            <Input
                                                value={draft.sellUnitRate}
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                disabled={pricingLocked}
                                                placeholder="auto"
                                                onChange={(event) =>
                                                    handleSellChange(event.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px] text-muted-foreground">
                                                Margin %
                                            </Label>
                                            {margin.isFee ? (
                                                <Input
                                                    value="Fee"
                                                    readOnly
                                                    className="bg-muted text-center"
                                                    disabled={pricingLocked}
                                                />
                                            ) : (
                                                <Input
                                                    value={marginValue}
                                                    type="number"
                                                    step="1"
                                                    disabled={pricingLocked}
                                                    placeholder={hasSell ? "—" : "auto"}
                                                    onChange={(event) =>
                                                        handleMarginChange(event.target.value)
                                                    }
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                        {overrideActive
                                            ? "Sell override active — this line ignores blanket-margin math."
                                            : "Sell is blank — this line uses the blanket-margin calculation. Set a sell or margin % to override."}
                                    </p>
                                </div>
                            );
                        })()}

                        {/* legacy apply-margin toggle removed — Margin % above is
                            the control now; the apply_margin column stays in the
                            data/API and is no longer edited from this form. */}

                        <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                                value={draft.notes}
                                rows={2}
                                onChange={(event) =>
                                    setDraft((prev) => ({ ...prev, notes: event.target.value }))
                                }
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Metadata (JSON object)</Label>
                            <Textarea
                                value={draft.metadataJson}
                                rows={4}
                                onChange={(event) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        metadataJson: event.target.value,
                                    }))
                                }
                                placeholder='{"driver_name":"John"}'
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                    <span className="font-mono font-semibold">{item.total.toFixed(2)} AED</span>
                    {canMutateLine ? (
                        <div className="flex items-center gap-1">
                            {isEditing ? (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelEdit}
                                        disabled={
                                            updateLineItem.isPending ||
                                            patchLineItemMetadata.isPending
                                        }
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSaveEdit(item)}
                                        disabled={
                                            updateLineItem.isPending ||
                                            patchLineItemMetadata.isPending
                                        }
                                    >
                                        <Save className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openVoidDialog(item)}
                                disabled={voidLineItem.isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {allowClientVisibilityControls && canManage && visibilityEligibleItems.length > 0 ? (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkClientVisibility(!allClientVisible)}
                        disabled={patchBulkVisibility.isPending}
                    >
                        {allClientVisible ? "Hide all from client" : "Show all to client"}
                    </Button>
                </div>
            ) : null}

            {catalogItems.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                        Catalog Services
                    </h4>
                    <div className="space-y-2">
                        {catalogItems.map((item) => renderLineItem(item))}
                    </div>
                </div>
            )}

            {customItems.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                        Custom Charges
                    </h4>
                    <div className="space-y-2">
                        {customItems.map((item) => renderLineItem(item, true))}
                    </div>
                </div>
            )}

            {systemItems.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                        Auto-Calculated Charges
                    </h4>
                    <div className="space-y-2">
                        {systemItems.map((item) => renderLineItem(item))}
                    </div>
                </div>
            )}

            <VoidLineItemDialog
                open={voidDialogOpen}
                onOpenChange={setVoidDialogOpen}
                item={selectedItem}
                onConfirm={handleVoid}
                isPending={voidLineItem.isPending}
            />
        </div>
    );
}
