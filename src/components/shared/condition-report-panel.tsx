"use client";

import { PhotoCaptureStrip, PhotoEntry } from "./photo-capture-strip";

export type ConditionLevel = "GREEN" | "ORANGE" | "RED";

export interface ConditionReport {
    condition: ConditionLevel;
    conditionPhotos: PhotoEntry[];
    conditionNotes: string;
    refurbDays: number | null;
}

interface Props {
    value: ConditionReport;
    onChange: (v: ConditionReport) => void;
    uploadOnCapture?: boolean;
    companyId?: string;
    disabled?: boolean;
}

const CONDITIONS: {
    value: ConditionLevel;
    label: string;
    bg: string;
    border: string;
    text: string;
}[] = [
    {
        value: "GREEN",
        label: "Good",
        bg: "bg-green-500/10",
        border: "border-green-500",
        text: "text-green-500",
    },
    {
        value: "ORANGE",
        label: "Damaged",
        bg: "bg-orange-500/10",
        border: "border-orange-500",
        text: "text-orange-500",
    },
    {
        value: "RED",
        label: "Critical",
        bg: "bg-red-500/10",
        border: "border-red-500",
        text: "text-red-500",
    },
];

export function ConditionReportPanel({
    value,
    onChange,
    uploadOnCapture,
    companyId,
    disabled,
}: Props) {
    const needsDetail = value.condition === "ORANGE" || value.condition === "RED";

    const set = (partial: Partial<ConditionReport>) => onChange({ ...value, ...partial });

    return (
        <div className="space-y-4">
            {/* Condition selector */}
            <div className="grid grid-cols-3 gap-2">
                {CONDITIONS.map((c) => {
                    const active = value.condition === c.value;
                    return (
                        <button
                            key={c.value}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                                set({
                                    condition: c.value,
                                    conditionPhotos:
                                        c.value === "GREEN" ? [] : value.conditionPhotos,
                                    conditionNotes: c.value === "GREEN" ? "" : value.conditionNotes,
                                    refurbDays: c.value === "GREEN" ? null : value.refurbDays,
                                })
                            }
                            className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all disabled:opacity-50
                                ${active ? `${c.bg} ${c.border} ${c.text}` : "border-border text-muted-foreground hover:border-muted-foreground"}`}
                        >
                            {c.label}
                        </button>
                    );
                })}
            </div>

            {/* Extra fields for ORANGE / RED */}
            {needsDetail && (
                <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/30">
                    <PhotoCaptureStrip
                        photos={value.conditionPhotos}
                        onChange={(p) => set({ conditionPhotos: p })}
                        minPhotos={1}
                        label="Condition Photos *"
                        uploadOnCapture={uploadOnCapture}
                        companyId={companyId}
                        disabled={disabled}
                    />

                    <div className="space-y-1">
                        <label className="text-xs font-mono font-bold uppercase text-foreground">
                            Condition Notes *
                        </label>
                        <textarea
                            value={value.conditionNotes}
                            onChange={(e) => set({ conditionNotes: e.target.value })}
                            placeholder="Describe the damage or issue…"
                            rows={3}
                            disabled={disabled}
                            className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-mono font-bold uppercase text-foreground">
                            Estimated Refurb Days *
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={value.refurbDays ?? ""}
                            onChange={(e) =>
                                set({ refurbDays: e.target.value ? Number(e.target.value) : null })
                            }
                            placeholder="e.g. 5"
                            disabled={disabled}
                            className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export function validateConditionReport(r: ConditionReport): string | null {
    if (r.condition === "GREEN") return null;
    if (r.conditionPhotos.length < 1) return "At least 1 condition photo is required";
    if (!r.conditionNotes.trim()) return "Condition notes are required";
    if (!r.refurbDays || r.refurbDays < 1) return "Refurb days estimate is required";
    return null;
}
