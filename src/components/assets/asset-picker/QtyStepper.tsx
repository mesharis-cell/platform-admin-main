"use client";

/**
 * SYNCED CANONICAL COPY — source-of-truth = client. See types.ts header.
 *
 * QtyStepper — a bounded quantity stepper extracted from AssetPickerCard so other
 * surfaces (e.g. order-edit item rows) can reuse the EXACT same control. Bounded by
 * `max` (availableQuantity): the + button disables at the max, values clamp to
 * [1, max], and a parent that renders the "Exceeds available (N)" hint reads `qty`
 * against `max`. No client-only imports — admin/warehouse copy this verbatim.
 */

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Clamp a candidate quantity into [1, max] (max<=0 means unbounded above). */
export const clampQty = (n: number, max: number): number => {
    if (!Number.isFinite(n)) return 1;
    const i = Math.floor(n);
    if (i < 1) return 1;
    if (max > 0 && i > max) return max;
    return i;
};

/** Inline quantity stepper bounded by `max` (availableQuantity). */
export function QtyStepper({
    qty,
    max,
    name,
    disabled,
    onChange,
}: {
    qty: number;
    max: number;
    name: string;
    disabled?: boolean;
    onChange: (next: number) => void;
}) {
    return (
        <div className="flex items-center overflow-hidden rounded-md border border-border shrink-0">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(qty - 1)}
                disabled={disabled || qty <= 1}
                aria-label={`Decrease quantity of ${name}`}
                className="h-8 w-8 rounded-none border-r border-border p-0 hover:bg-muted"
            >
                <Minus className="h-3 w-3" />
            </Button>
            <input
                type="number"
                inputMode="numeric"
                min={1}
                max={max > 0 ? max : undefined}
                step={1}
                value={qty}
                data-testid="asset-picker-qty"
                onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (Number.isNaN(parsed)) return;
                    onChange(parsed);
                }}
                onBlur={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    onChange(Number.isNaN(parsed) ? 1 : parsed);
                }}
                disabled={disabled}
                aria-label={`Quantity of ${name}`}
                className="h-8 w-12 border-0 bg-transparent text-center font-mono text-sm outline-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(qty + 1)}
                disabled={disabled || (max > 0 && qty >= max)}
                aria-label={`Increase quantity of ${name}`}
                className="h-8 w-8 rounded-none border-l border-border p-0 hover:bg-muted"
            >
                <Plus className="h-3 w-3" />
            </Button>
        </div>
    );
}
