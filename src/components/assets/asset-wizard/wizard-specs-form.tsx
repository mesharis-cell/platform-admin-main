"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WizardState } from "./types";

interface Props {
    state: WizardState;
    update: (fields: Partial<WizardState>) => void;
}

function calcVolume(l: number, w: number, h: number) {
    if (l > 0 && w > 0 && h > 0) return (l * w * h) / 1_000_000;
    return 0;
}

export function WizardSpecsForm({ state, update }: Props) {
    function setDim(field: "dimLength" | "dimWidth" | "dimHeight", val: number) {
        const vol = calcVolume(
            field === "dimLength" ? val : state.dimLength,
            field === "dimWidth" ? val : state.dimWidth,
            field === "dimHeight" ? val : state.dimHeight
        );
        update({ [field]: val, volumePerUnit: Number(vol.toFixed(6)) });
    }

    return (
        <div className="py-2 space-y-5">
            {/* Dimensions — stacked on mobile */}
            <div>
                <Label className="mb-2 block">Dimensions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Length (cm)</span>
                        <Input
                            type="number"
                            step="0.01"
                            value={state.dimLength || ""}
                            onChange={(e) => setDim("dimLength", Number(e.target.value) || 0)}
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Width (cm)</span>
                        <Input
                            type="number"
                            step="0.01"
                            value={state.dimWidth || ""}
                            onChange={(e) => setDim("dimWidth", Number(e.target.value) || 0)}
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Height (cm)</span>
                        <Input
                            type="number"
                            step="0.01"
                            value={state.dimHeight || ""}
                            onChange={(e) => setDim("dimHeight", Number(e.target.value) || 0)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Weight per unit (kg) *</Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={state.weightPerUnit || ""}
                        onChange={(e) => update({ weightPerUnit: Number(e.target.value) || 0 })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Volume per unit (m3)</Label>
                    <Input
                        type="number"
                        step="0.001"
                        value={state.volumePerUnit || ""}
                        onChange={(e) => update({ volumePerUnit: Number(e.target.value) || 0 })}
                    />
                    {state.dimLength > 0 && state.dimWidth > 0 && state.dimHeight > 0 && (
                        <p className="text-xs text-muted-foreground">
                            Auto-calculated:{" "}
                            {calcVolume(state.dimLength, state.dimWidth, state.dimHeight).toFixed(
                                4
                            )}{" "}
                            m3
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
