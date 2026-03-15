"use client";

import { Package, Plus } from "lucide-react";
import type { WizardBranch } from "./types";

interface Props {
    onSelect: (branch: WizardBranch) => void;
}

export function WizardChoiceScreen({ onSelect }: Props) {
    return (
        <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">What would you like to do?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={() => onSelect("existing")}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                    data-testid="wizard-existing-item"
                >
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <p className="font-semibold text-base">Add to existing item</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Add more units of something already in your catalog
                        </p>
                    </div>
                </button>
                <button
                    onClick={() => onSelect("new")}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                    data-testid="wizard-new-item"
                >
                    <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Plus className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-base">Register a new item</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Create a brand new item and its first stock
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
