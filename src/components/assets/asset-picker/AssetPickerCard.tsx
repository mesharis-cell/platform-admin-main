"use client";

/**
 * SYNCED CANONICAL COPY — source-of-truth = client. See types.ts header.
 *
 * AssetPickerCard — the picker result card. Its visual body intentionally mirrors
 * client/src/components/catalog/catalog-card.tsx (image via imageUrl, brand /
 * category chips, availability count, GREEN/ORANGE/RED condition badge, grouped-
 * family sibling chooser) so the picker reads like the catalog, not a new design.
 * It adds: select toggle, a qty stepper bounded by availableQuantity, grouped
 * sibling selection, and condition gating (RED disabled; ORANGE flagged).
 */

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, Boxes, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { QtyStepper, clampQty } from "./QtyStepper";
import type { AssetCondition, AssetPickerItem, AssetPickerSibling } from "./types";

function hexWithAlpha(hex: string | null | undefined, alphaHex: string) {
    if (!hex) return undefined;
    const normalized = hex.startsWith("#") ? hex : `#${hex}`;
    return `${normalized}${alphaHex}`;
}

function conditionBadgeClass(condition: AssetCondition) {
    if (condition === "RED") return "bg-red-500/10 text-red-700 border-red-500/25";
    if (condition === "ORANGE") return "bg-amber-500/10 text-amber-700 border-amber-500/25";
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25";
}

export interface AssetPickerCardProps {
    item: AssetPickerItem;
    /** True when this card's resolved asset is selected. */
    selected: boolean;
    /** Current selection quantity (when selected + withQuantity). */
    quantity: number;
    /** The concrete asset_id currently targeted (for grouped: chosen sibling). */
    targetId: string;
    /** The condition of the targeted asset (sibling-aware). */
    targetCondition: AssetCondition;
    /** Available quantity of the targeted asset (sibling-aware). */
    targetAvailable: number;
    withQuantity: boolean;
    /** True when the targeted asset is already on the entity. */
    alreadyAdded: boolean;
    /** "require" gates ORANGE behind a decision; RED is always disabled. */
    conditionDecision: "require" | "none";
    onToggleSelect: () => void;
    onChangeQty: (next: number) => void;
    /** For grouped families: change which sibling is targeted. */
    onPickSibling?: (sibling: AssetPickerSibling) => void;
}

export function AssetPickerCard({
    item,
    selected,
    quantity,
    targetId,
    targetCondition,
    targetAvailable,
    withQuantity,
    alreadyAdded,
    conditionDecision,
    onToggleSelect,
    onChangeQty,
    onPickSibling,
}: AssetPickerCardProps) {
    const [chooserOpen, setChooserOpen] = useState(false);

    const isRed = targetCondition === "RED";
    const isOrange = targetCondition === "ORANGE";
    const unavailable = targetAvailable <= 0;
    // RED is hard-blocked in both modes (it would 409 on save). Zero-availability
    // is blocked too. Everything else is selectable; ORANGE in client mode then
    // requires a decision in the selection tray (handled by the parent).
    const blocked = isRed || unavailable || alreadyAdded;

    const blockReason = alreadyAdded
        ? "Already on this order"
        : isRed
          ? "Requires maintenance — start a new order"
          : unavailable
            ? "No availability"
            : null;

    const catColor = item.categoryColor || null;
    const catBg = hexWithAlpha(catColor, "1A");
    const catBorder = hexWithAlpha(catColor, "40");

    return (
        <div
            data-testid="asset-picker-card"
            data-selected={selected || undefined}
            className={`group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 ${
                selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/60 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            } ${blocked ? "opacity-60" : ""}`}
        >
            <div className="relative bg-muted/30">
                <div className="relative aspect-[4/3] overflow-hidden">
                    {item.imageUrl ? (
                        <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                            className="object-contain p-4"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <Boxes className="h-16 w-16 text-muted-foreground/25" />
                        </div>
                    )}

                    {item.brand && (
                        <div className="absolute left-3 top-3">
                            <Badge
                                variant="secondary"
                                className="border-border/50 bg-background/85 text-[10px] font-medium text-foreground/80 backdrop-blur-sm"
                            >
                                {item.brand}
                            </Badge>
                        </div>
                    )}

                    {item.grouped && (item.siblings?.length ?? 0) > 0 && (
                        <div className="absolute right-3 top-3">
                            <Badge className="bg-background/85 text-[10px] text-foreground shadow-sm backdrop-blur-sm hover:bg-background/85">
                                {item.siblings!.length} stock records
                            </Badge>
                        </div>
                    )}

                    {(isRed || isOrange) && (
                        <div className="absolute bottom-3 left-3">
                            <Badge
                                variant="outline"
                                className={`text-[10px] backdrop-blur-sm ${conditionBadgeClass(targetCondition)}`}
                            >
                                <AlertCircle className="mr-1 h-2.5 w-2.5" />
                                {targetCondition}
                            </Badge>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {item.grouped && (
                            <Badge variant="secondary" className="text-[10px]">
                                Grouped
                            </Badge>
                        )}
                        {item.category && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium"
                                style={
                                    catColor
                                        ? {
                                              backgroundColor: catBg,
                                              color: catColor,
                                              borderColor: catBorder,
                                          }
                                        : undefined
                                }
                            >
                                {item.category}
                            </Badge>
                        )}
                    </div>

                    <p className="line-clamp-2 text-base font-semibold leading-tight text-foreground">
                        {item.name}
                    </p>
                    {item.code && !item.grouped && (
                        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
                            {item.code}
                        </p>
                    )}
                </div>

                <div className="text-sm">
                    <span
                        className={`font-mono font-bold ${
                            targetAvailable > 0 ? "text-emerald-600" : "text-muted-foreground"
                        }`}
                    >
                        {targetAvailable}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                        {item.grouped ? "available (selected record)" : "available"}
                    </span>
                </div>

                {/* Grouped family — pick which concrete stock record to target. */}
                {item.grouped && (item.siblings?.length ?? 0) > 0 && (
                    <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                                Choose stock record
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{item.name}</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                                {item.siblings!.map((sibling) => {
                                    const sibBlocked =
                                        sibling.condition === "RED" ||
                                        sibling.availableQuantity <= 0;
                                    const isTarget = sibling.id === targetId;
                                    return (
                                        <div
                                            key={sibling.id}
                                            className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                                                isTarget
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border"
                                            }`}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted/30">
                                                    {sibling.imageUrl ? (
                                                        <Image
                                                            src={sibling.imageUrl}
                                                            alt=""
                                                            fill
                                                            className="object-contain p-1"
                                                        />
                                                    ) : (
                                                        <Boxes className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/30" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {sibling.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {sibling.condition} ·{" "}
                                                        {sibling.availableQuantity} available
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={isTarget ? "default" : "outline"}
                                                disabled={sibBlocked}
                                                onClick={() => {
                                                    onPickSibling?.(sibling);
                                                    setChooserOpen(false);
                                                }}
                                            >
                                                {isTarget ? "Selected" : "Use this"}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                <div className="mt-auto flex items-center gap-2">
                    {selected && withQuantity ? (
                        <QtyStepper
                            qty={quantity}
                            max={targetAvailable}
                            name={item.name}
                            disabled={blocked}
                            onChange={(next) => onChangeQty(clampQty(next, targetAvailable))}
                        />
                    ) : null}
                    <Button
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        className="flex-1 gap-1.5"
                        disabled={blocked && !selected}
                        onClick={onToggleSelect}
                        data-testid="asset-picker-toggle"
                        title={blockReason ?? undefined}
                    >
                        {selected ? (
                            <>
                                <Check className="h-3.5 w-3.5" />
                                Selected
                            </>
                        ) : blockReason ? (
                            blockReason
                        ) : (
                            "Select"
                        )}
                    </Button>
                </div>

                {selected && withQuantity && quantity > targetAvailable && targetAvailable > 0 && (
                    <p className="text-[11px] font-medium text-destructive">
                        Exceeds available ({targetAvailable})
                    </p>
                )}
            </div>
        </div>
    );
}
