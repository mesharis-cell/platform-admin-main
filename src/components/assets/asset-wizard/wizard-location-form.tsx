"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useZones } from "@/hooks/use-zones";
import type { WizardState } from "./types";

const PACKAGING_PRESETS = ["Box", "Crate", "Pallet", "Bag", "Carton", "Bundle"];

interface Props {
    state: WizardState;
    update: (fields: Partial<WizardState>) => void;
}

export function WizardLocationForm({ state, update }: Props) {
    const { data: warehousesData } = useWarehouses();
    const { data: zonesData } = useZones(
        state.warehouseId ? { warehouse_id: state.warehouseId } : undefined
    );
    const warehouses = warehousesData?.data || [];
    const zones = zonesData?.data || [];
    const isSerialized = state.stockMode === "SERIALIZED";
    const itemName = state.selectedFamily?.name || state.itemName || "";
    const [customPackaging, setCustomPackaging] = useState(false);

    // Check if current packaging value is a preset
    const isPreset = PACKAGING_PRESETS.includes(state.packaging);

    return (
        <div className="py-2 space-y-4">
            {/* Item context */}
            <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">{itemName[0] || "?"}</span>
                </div>
                <div>
                    <p className="font-medium text-sm">{itemName}</p>
                    <p className="text-xs text-muted-foreground">
                        {isSerialized ? "Serialized" : "Pooled"} &middot;{" "}
                        {state.category || state.selectedFamily?.category || "—"}
                    </p>
                </div>
            </div>

            {isSerialized && (
                <p className="text-xs text-muted-foreground">
                    The system will automatically name each unit: {itemName} #1, #2, etc.
                </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Warehouse *</Label>
                    <Select
                        value={state.warehouseId}
                        onValueChange={(v) => update({ warehouseId: v, zoneId: "" })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                    {w.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Zone *</Label>
                    <Select
                        value={state.zoneId}
                        onValueChange={(v) => update({ zoneId: v })}
                        disabled={!state.warehouseId}
                    >
                        <SelectTrigger>
                            <SelectValue
                                placeholder={
                                    state.warehouseId ? "Select zone" : "Select warehouse first"
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {zones.map((z) => (
                                <SelectItem key={z.id} value={z.id}>
                                    {z.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{isSerialized ? "Number of units to create" : "Total quantity"}</Label>
                    <Input
                        type="number"
                        min={1}
                        value={state.quantity}
                        onChange={(e) => {
                            const qty = Math.max(1, Number(e.target.value) || 1);
                            // Auto-copy to available quantity
                            update({ quantity: qty, availableQuantity: qty });
                        }}
                    />
                </div>
                {!isSerialized && (
                    <div className="space-y-2">
                        <Label>Available quantity</Label>
                        <Input
                            type="number"
                            min={0}
                            max={state.quantity}
                            value={state.availableQuantity}
                            onChange={(e) =>
                                update({
                                    availableQuantity: Math.min(
                                        state.quantity,
                                        Math.max(0, Number(e.target.value) || 0)
                                    ),
                                })
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            Defaults to total. Adjust if some units are already allocated.
                        </p>
                    </div>
                )}
            </div>

            {!isSerialized && (
                <div className="space-y-2">
                    <Label>Packaging *</Label>
                    {!customPackaging && (
                        <Select
                            value={isPreset ? state.packaging : "__custom__"}
                            onValueChange={(v) => {
                                if (v === "__custom__") {
                                    setCustomPackaging(true);
                                    update({ packaging: "" });
                                } else {
                                    update({ packaging: v });
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select packaging type" />
                            </SelectTrigger>
                            <SelectContent>
                                {PACKAGING_PRESETS.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {p}
                                    </SelectItem>
                                ))}
                                <SelectItem value="__custom__">Custom...</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {customPackaging && (
                        <div className="flex gap-2">
                            <Input
                                value={state.packaging}
                                onChange={(e) => update({ packaging: e.target.value })}
                                placeholder="e.g. Shrink wrap, Loose, Drum"
                                autoFocus
                            />
                            <button
                                onClick={() => setCustomPackaging(false)}
                                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                            >
                                Presets
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
