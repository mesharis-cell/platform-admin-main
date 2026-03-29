"use client";

import { Fingerprint, Layers } from "lucide-react";
import type { StockModeChoice } from "./types";

interface Props {
    onSelect: (mode: StockModeChoice) => void;
}

export function WizardTypeSelect({ onSelect }: Props) {
    return (
        <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
                How should this item be tracked?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={() => onSelect("SERIALIZED")}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                    data-testid="wizard-serialized"
                >
                    <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Fingerprint className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-base">Serialized</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Each unit gets its own identity, QR code, and maintenance history.
                            Choose this for equipment, branded items, or anything that needs
                            individual tracking, condition monitoring, or standalone service
                            requests.
                        </p>
                    </div>
                </button>
                <button
                    onClick={() => onSelect("POOLED")}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                    data-testid="wizard-pooled"
                >
                    <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Layers className="h-7 w-7 text-amber-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-base">Pooled</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Units are interchangeable and tracked as a quantity pool. Ideal for
                            consumables, generic supplies, or items that don't need individual
                            maintenance tracking.
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
