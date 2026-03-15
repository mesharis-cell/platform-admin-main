"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { WizardState, Condition } from "./types";

const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];

interface Props {
    state: WizardState;
    update: (fields: Partial<WizardState>) => void;
}

export function WizardConditionForm({ state, update }: Props) {
    const isDamaged = state.condition === "ORANGE" || state.condition === "RED";

    return (
        <div className="py-2 space-y-5">
            {/* Condition */}
            <div className="space-y-2">
                <Label>Condition *</Label>
                <div className="grid grid-cols-3 gap-2">
                    {(["GREEN", "ORANGE", "RED"] as Condition[]).map((c) => {
                        const active = state.condition === c;
                        const colors: Record<Condition, string> = {
                            GREEN: active
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10",
                            ORANGE: active
                                ? "bg-amber-500 text-white border-amber-500"
                                : "border-amber-500/30 text-amber-700 hover:bg-amber-500/10",
                            RED: active
                                ? "bg-red-500 text-white border-red-500"
                                : "border-red-500/30 text-red-700 hover:bg-red-500/10",
                        };
                        return (
                            <button
                                key={c}
                                onClick={() =>
                                    update({
                                        condition: c,
                                        ...(c === "GREEN"
                                            ? { conditionNotes: "", refurbDaysEstimate: null }
                                            : {}),
                                    })
                                }
                                className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${colors[c]}`}
                            >
                                {c}
                            </button>
                        );
                    })}
                </div>
            </div>

            {isDamaged && (
                <div className="space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="space-y-2">
                        <Label>Estimated refurbishment days *</Label>
                        <Input
                            type="number"
                            min={1}
                            value={state.refurbDaysEstimate ?? ""}
                            onChange={(e) =>
                                update({ refurbDaysEstimate: Number(e.target.value) || null })
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Condition notes * (min 10 characters)</Label>
                        <Textarea
                            value={state.conditionNotes}
                            onChange={(e) => update({ conditionNotes: e.target.value })}
                            rows={3}
                            placeholder="Describe the damage or issue..."
                        />
                        <p className="text-xs text-muted-foreground">
                            {state.conditionNotes.length}/10 characters
                        </p>
                    </div>
                </div>
            )}

            {/* Handling tags */}
            <div className="space-y-2">
                <Label>Handling Tags</Label>
                <div className="flex flex-wrap gap-2">
                    {HANDLING_TAGS.map((tag) => {
                        const active = state.handlingTags.includes(tag);
                        return (
                            <Badge
                                key={tag}
                                variant={active ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() =>
                                    update({
                                        handlingTags: active
                                            ? state.handlingTags.filter((t) => t !== tag)
                                            : [...state.handlingTags, tag],
                                    })
                                }
                            >
                                {tag}
                            </Badge>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
