"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { WizardState } from "./types";

interface Props {
    state: WizardState;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value) return null;
    return (
        <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
        </div>
    );
}

export function WizardReview({ state }: Props) {
    const isSerialized = state.stockMode === "SERIALIZED";
    const itemName = state.selectedFamily?.name || state.itemName;
    const isNewFamily = state.branch === "new";

    return (
        <div className="py-2 space-y-4">
            {isNewFamily && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                    <p className="text-xs font-medium text-emerald-700">
                        A new {isSerialized ? "serialized" : "pooled"} item will be registered
                    </p>
                </div>
            )}

            <div className="divide-y divide-border">
                <Row label="Item" value={itemName} />
                <Row label="Type" value={isSerialized ? "Serialized" : "Pooled"} />
                <Row label="Category" value={state.category || state.selectedFamily?.category} />
                {isSerialized && state.quantity > 1 && (
                    <Row
                        label="Units to create"
                        value={`${state.quantity} (${itemName} #1 – #${state.quantity})`}
                    />
                )}
                {isSerialized && state.quantity === 1 && <Row label="Units" value="1" />}
                {!isSerialized && (
                    <>
                        <Row label="Total quantity" value={state.quantity} />
                        <Row label="Available" value={state.availableQuantity} />
                        <Row label="Packaging" value={state.packaging} />
                    </>
                )}
                <Row
                    label="Condition"
                    value={
                        <Badge
                            variant="outline"
                            className={
                                state.condition === "GREEN"
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                    : state.condition === "ORANGE"
                                      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                      : "bg-red-500/10 text-red-700 border-red-500/20"
                            }
                        >
                            {state.condition}
                        </Badge>
                    }
                />
                {state.conditionNotes && (
                    <Row label="Condition notes" value={state.conditionNotes} />
                )}
                {state.refurbDaysEstimate && (
                    <Row label="Refurb days" value={`${state.refurbDaysEstimate} days`} />
                )}
                {state.weightPerUnit > 0 && (
                    <Row label="Weight" value={`${state.weightPerUnit} kg`} />
                )}
                {state.volumePerUnit > 0 && (
                    <Row label="Volume" value={`${state.volumePerUnit} m³`} />
                )}
                {state.dimLength > 0 && (
                    <Row
                        label="Dimensions"
                        value={`${state.dimLength} × ${state.dimWidth} × ${state.dimHeight} cm`}
                    />
                )}
            </div>

            {state.photos.length > 0 && (
                <div>
                    <p className="text-sm text-muted-foreground mb-2">
                        Photos ({state.photos.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto">
                        {state.photos.map((photo, i) => (
                            <div
                                key={i}
                                className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-muted border border-border"
                            >
                                <Image
                                    src={photo.previewUrl}
                                    alt={`Photo ${i + 1}`}
                                    width={64}
                                    height={64}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {state.handlingTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {state.handlingTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
