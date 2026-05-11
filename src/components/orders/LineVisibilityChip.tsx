"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, Eye, HardHat, Users } from "lucide-react";

interface Props {
    clientPriceVisible: boolean;
    logisticsVisible: boolean;
    onChange: (next: { clientPriceVisible?: boolean; logisticsVisible?: boolean }) => void;
    disabled?: boolean;
}

/**
 * Per-line audience visibility chip.
 *
 * Replaces the earlier client-price-only Switch on the line items list.
 * The chip shows the current audience tags ("Client", "Logistics") and
 * opens a popover with two independent Switches that flip each flag.
 * Each toggle saves immediately via the parent `onChange` (no save button).
 *
 * The labels are explicit about semantics — "Show price to Client" vs
 * "Show line to Logistics" — because the two flags are asymmetric:
 * client_price_visible nulls the line's amount but the line still renders,
 * logistics_visible strips the whole line from the logistics view.
 */
export function LineVisibilityChip({
    clientPriceVisible,
    logisticsVisible,
    onChange,
    disabled,
}: Props) {
    const [open, setOpen] = useState(false);

    const tags: { label: string; tone: "primary" | "muted" }[] = [];
    if (clientPriceVisible) tags.push({ label: "Client", tone: "primary" });
    if (logisticsVisible) tags.push({ label: "Logistics", tone: "primary" });
    if (tags.length === 0) tags.push({ label: "— hidden —", tone: "muted" });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="h-7 rounded-full px-3 gap-1.5 text-[11px] font-normal"
                >
                    <Users className="h-3 w-3" />
                    <span className="text-muted-foreground">Visible to</span>
                    <span className="flex items-center gap-1">
                        {tags.map((tag) => (
                            <span
                                key={tag.label}
                                className={
                                    tag.tone === "primary"
                                        ? "rounded bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                        : "rounded bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                }
                            >
                                {tag.label}
                            </span>
                        ))}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-4">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Controls who sees this line and at what level of detail. Logistics is hidden
                        entirely when off; client shows label only when amount is off.
                    </p>

                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                            <Label className="text-xs flex items-center gap-1.5">
                                <Eye className="h-3.5 w-3.5" />
                                Show price to Client
                            </Label>
                            <p className="text-[10.5px] text-muted-foreground leading-snug">
                                When off, the client sees the line label but no amount.
                            </p>
                        </div>
                        <Switch
                            checked={clientPriceVisible}
                            onCheckedChange={(v) => onChange({ clientPriceVisible: v })}
                            disabled={disabled}
                        />
                    </div>

                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                            <Label className="text-xs flex items-center gap-1.5">
                                <HardHat className="h-3.5 w-3.5" />
                                Show line to Logistics
                            </Label>
                            <p className="text-[10.5px] text-muted-foreground leading-snug">
                                When off, the warehouse will not see this line at all.
                            </p>
                        </div>
                        <Switch
                            checked={logisticsVisible}
                            onCheckedChange={(v) => onChange({ logisticsVisible: v })}
                            disabled={disabled}
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
