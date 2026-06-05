"use client";

/**
 * Order item editor (admin order-edit, per-section twin of the client's
 * OrderItemsQuantityEditor). Lists each physical order item with a bounded
 * quantity stepper + a remove control, plus an "Add items" affordance that opens
 * the 2-step OpsAssetPicker (rich catalog-style cards, multi-select + bounded qty)
 * to stage new assets.
 *
 * Quantity bound (task #4 + #11): each row uses the shared <QtyStepper> bound by
 * `available_quantity + currently-booked qty` for that asset — i.e. the most the
 * order could hold without exceeding stock. When the order item doesn't carry an
 * availability figure the stepper is left unbounded above (max=0); the server is
 * authoritative and 409s on a real shortfall.
 *
 * Parent (EditOrderDetailsCard) owns the draft + diffs it into the item-ops array:
 *   - existing item with changed quantity → { op:"UPDATE", order_item_id, quantity }
 *   - existing item marked pending-removal → { op:"REMOVE", order_item_id }
 *   - staged add → { op:"ADD", asset_id, quantity }
 */

import { useState } from "react";
import { Package, PlusCircle, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { QtyStepper, clampQty } from "@/components/assets/asset-picker/QtyStepper";
import {
    OpsAssetPicker,
    type NamedAssetSelection,
} from "@/components/assets/asset-picker/OpsAssetPicker";

// One editable EXISTING row. `order_item_id` is the handle the edit endpoint
// reconciles bookings against. `max` is the upper bound for the stepper
// (available_quantity + currently-booked qty); 0 = unbounded above.
export interface ItemQuantityRow {
    order_item_id: string;
    asset_name: string;
    quantity: number;
    original_quantity: number;
    pending_remove: boolean;
    /** available_quantity + currently-booked qty; 0 = unbounded above. */
    max: number;
}

// One staged ADD — a new asset to attach to the order. `max` carries the asset's
// available_quantity (from the picker) so the staged-add stepper stays bounded.
export interface StagedAdd {
    key: string;
    asset_id: string;
    asset_name: string;
    quantity: number;
    max: number;
}

export function OrderItemsQuantityEditor({
    items,
    onSetItemQuantity,
    onToggleRemove,
    stagedAdds,
    onAddAssets,
    onChangeAddQty,
    onRemoveAdd,
    companyId,
    alreadyOnEntity,
    disabled,
}: {
    items: ItemQuantityRow[];
    onSetItemQuantity: (orderItemId: string, next: number) => void;
    onToggleRemove: (orderItemId: string, remove: boolean) => void;
    stagedAdds: StagedAdd[];
    onAddAssets: (selections: NamedAssetSelection[]) => void;
    onChangeAddQty: (key: string, next: number) => void;
    onRemoveAdd: (key: string) => void;
    companyId?: string | null;
    /** Asset ids already on the order / staged — marked "already added". */
    alreadyOnEntity: string[];
    disabled?: boolean;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);

    // Keep at least one item on the order (server also blocks the last removal).
    const remainingItemCount =
        items.filter((row) => !row.pending_remove).length + stagedAdds.length;

    return (
        <div className="space-y-3">
            <p className="font-mono text-[10px] text-muted-foreground">
                Adjust quantities, remove items, or add new assets. Changes reconcile the asset
                bookings. If inventory isn&apos;t available for the requested dates and quantities
                the change is rejected. Assets requiring maintenance cannot be added. An order must
                keep at least one item. Editing a quoted order&apos;s items returns it to pricing
                review.
            </p>

            {items.length === 0 && stagedAdds.length === 0 ? (
                <p className="font-mono text-[11px] text-muted-foreground">
                    No editable items on this order.
                </p>
            ) : (
                <div className="space-y-2">
                    {items.map((row) => {
                        const exceeds = row.max > 0 && row.quantity > row.max;
                        return (
                            <div
                                key={row.order_item_id}
                                className={`rounded border px-3 py-2 ${
                                    row.pending_remove
                                        ? "border-red-500/40 bg-red-500/5"
                                        : "border-border bg-muted/30"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span
                                            className={`font-mono text-sm truncate ${
                                                row.pending_remove
                                                    ? "line-through text-muted-foreground"
                                                    : ""
                                            }`}
                                        >
                                            {row.asset_name}
                                        </span>
                                        {row.pending_remove && (
                                            <span className="font-mono text-[10px] uppercase tracking-wide text-red-600 shrink-0">
                                                Will be removed
                                            </span>
                                        )}
                                    </div>
                                    {row.pending_remove ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-7 font-mono text-[11px] shrink-0"
                                            disabled={disabled}
                                            onClick={() => onToggleRemove(row.order_item_id, false)}
                                        >
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                            UNDO
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <QtyStepper
                                                qty={row.quantity}
                                                max={row.max}
                                                name={row.asset_name}
                                                disabled={disabled}
                                                onChange={(next) =>
                                                    onSetItemQuantity(
                                                        row.order_item_id,
                                                        clampQty(next, row.max)
                                                    )
                                                }
                                            />
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                disabled={disabled || remainingItemCount <= 1}
                                                onClick={() =>
                                                    onToggleRemove(row.order_item_id, true)
                                                }
                                                aria-label={`Remove ${row.asset_name}`}
                                                title={
                                                    remainingItemCount <= 1
                                                        ? "An order must keep at least one item"
                                                        : "Remove item"
                                                }
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {!row.pending_remove && exceeds && (
                                    <p className="mt-1 font-mono text-[10px] font-medium text-destructive">
                                        Exceeds available ({row.max})
                                    </p>
                                )}
                            </div>
                        );
                    })}

                    {/* Staged ADDs — new assets not yet on the order. */}
                    {stagedAdds.map((add) => {
                        const exceeds = add.max > 0 && add.quantity > add.max;
                        return (
                            <div
                                key={add.key}
                                className="rounded border border-emerald-500/40 bg-emerald-500/5 px-3 py-2"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <PlusCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                                        <span className="font-mono text-sm truncate">
                                            {add.asset_name}
                                        </span>
                                        <span className="font-mono text-[10px] uppercase tracking-wide text-emerald-700 shrink-0">
                                            New
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <QtyStepper
                                            qty={add.quantity}
                                            max={add.max}
                                            name={add.asset_name}
                                            disabled={disabled}
                                            onChange={(next) =>
                                                onChangeAddQty(add.key, clampQty(next, add.max))
                                            }
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                            disabled={disabled}
                                            onClick={() => onRemoveAdd(add.key)}
                                            aria-label={`Discard staged ${add.asset_name}`}
                                            title="Discard staged item"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                {exceeds && (
                                    <p className="mt-1 font-mono text-[10px] font-medium text-destructive">
                                        Exceeds available ({add.max})
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add-item picker — the 2-step canonical AssetPicker (ops adapter)
                in a dialog, scoped to the order's company. */}
            {companyId ? (
                <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-center gap-2 font-mono text-xs"
                            disabled={disabled}
                        >
                            <PlusCircle className="h-3.5 w-3.5" />
                            ADD ITEMS
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
                        <DialogHeader className="border-b border-border px-6 py-4">
                            <DialogTitle className="font-mono text-sm font-bold uppercase tracking-wide">
                                Add Items
                            </DialogTitle>
                            <DialogDescription className="font-mono text-xs">
                                Search the tenant catalog and select assets to add to this order.
                            </DialogDescription>
                        </DialogHeader>
                        <OpsAssetPicker
                            companyId={companyId}
                            alreadyOnEntity={alreadyOnEntity}
                            entityNoun="order"
                            onConfirm={(selections) => {
                                onAddAssets(selections);
                                setPickerOpen(false);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            ) : (
                <p className="font-mono text-[11px] text-muted-foreground">
                    Cannot add items — order has no associated company.
                </p>
            )}
        </div>
    );
}
