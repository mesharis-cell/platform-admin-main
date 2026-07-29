"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DescriptionSuggestInput } from "@/components/pricing/DescriptionSuggestInput";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreatePercentageLine } from "@/hooks/use-pricing-ledger";
import type { PurposeType, ServiceCategory } from "@/types/hybrid-pricing";

interface AddPercentageLineModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purposeType: PurposeType;
    entityId: string;
    // The current selection (source lines). The percent base is recomputed
    // SERVER-side from these ids; the sums below are a display-only preview.
    sourceLineItemIds: string[];
    // Client-side preview of the selection's summed buy + sell totals (from the
    // ledger's current data). Authoritative amount comes back on the created line.
    summedBuy: number;
    summedSell: number;
    currency: string;
    // F7 quiet-amend (ADMIN + ORDER only): resolved by the caller's amend gate
    // BEFORE opening. When true the created line amends the sent quote in place.
    quietAmend?: boolean;
    // Fires on a successful create — the parent clears the selection.
    onSuccess?: () => void;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const parseNum = (raw: string): number => {
    const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : NaN;
};

/**
 * Add % line — a sibling of AddCustomLineItemModal (same width + section rhythm).
 * The line is a PURE-MARGIN client charge: buy is always 0, the whole line is
 * client SELL (100% margin). Pick a base subtotal (the selection's Buy sum or
 * Sell sum) + a percent, and that becomes the client SELL. An optional Sell
 * override replaces the computed number (for a clean round figure). The exact
 * base is recomputed SERVER-side from the selected lines; the created line is a
 * plain snapshot, NOT linked to the sources.
 *
 * ADMIN-only surface (admin repo, ADMIN role — middleware-enforced), so raw
 * buy/sell is not a client-visibility leak.
 */
export function AddPercentageLineModal({
    open,
    onOpenChange,
    purposeType,
    entityId,
    sourceLineItemIds,
    summedBuy,
    summedSell,
    currency,
    quietAmend,
    onSuccess,
}: AddPercentageLineModalProps) {
    const createPercentageLine = useCreatePercentageLine(purposeType, entityId);

    const [base, setBase] = useState<"SELL" | "BUY">("SELL");
    const [percent, setPercent] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ServiceCategory>("OTHER");
    const [notes, setNotes] = useState("");
    const [clientVisible, setClientVisible] = useState(true);
    const [logisticsVisible, setLogisticsVisible] = useState(true);
    // Optional admin SELL override — a clean round number in place of percent × base.
    const [sellOverride, setSellOverride] = useState("");

    // Fresh form on every open.
    useEffect(() => {
        if (!open) return;
        setBase("SELL");
        setPercent("");
        setDescription("");
        setCategory("OTHER");
        setNotes("");
        setClientVisible(true);
        setLogisticsVisible(true);
        setSellOverride("");
    }, [open]);

    const isSellBase = base === "SELL";
    const baseSum = isSellBase ? summedSell : summedBuy;

    const pctNum = parseNum(percent);
    const pctValid = Number.isFinite(pctNum) && pctNum > 0 && pctNum <= 100000;

    // The resulting client SELL (buy is always 0). Override wins over percent × base.
    const resultSell = useMemo(() => {
        const overrideNum = parseNum(sellOverride);
        const hasOverride = sellOverride.trim() !== "" && Number.isFinite(overrideNum);
        if (hasOverride) return roundMoney(overrideNum);
        if (!pctValid) return null;
        return roundMoney((pctNum / 100) * baseSum);
    }, [sellOverride, pctValid, pctNum, baseSum]);

    const handleSubmit = async () => {
        if (sourceLineItemIds.length === 0) {
            toast.error("No lines selected");
            return;
        }
        if (!description.trim()) {
            toast.error("Please enter a description");
            return;
        }
        if (!pctValid) {
            toast.error("Enter a percent greater than 0");
            return;
        }
        let sellPayload: number | undefined;
        if (sellOverride.trim() !== "") {
            const overrideNum = parseNum(sellOverride);
            if (!Number.isFinite(overrideNum) || overrideNum < 0) {
                toast.error("Enter a valid sell override");
                return;
            }
            sellPayload = roundMoney(overrideNum);
        }
        try {
            await createPercentageLine.mutateAsync({
                source_line_item_ids: sourceLineItemIds,
                base,
                percent: pctNum,
                description: description.trim(),
                category,
                client_visible: clientVisible,
                logistics_visible: logisticsVisible,
                ...(notes.trim() ? { notes: notes.trim() } : {}),
                ...(sellPayload !== undefined ? { sell_unit_rate: sellPayload } : {}),
                ...(quietAmend ? { quiet_amend: true } : {}),
            });
            toast.success("Percentage line added");
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to add percentage line");
        }
    };

    const isPending = createPercentageLine.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0"
                onKeyDown={(e) => {
                    if (
                        e.key === "Enter" &&
                        (e.target as HTMLElement).tagName === "INPUT" &&
                        !isPending
                    ) {
                        e.preventDefault();
                        void handleSubmit();
                    }
                }}
            >
                <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
                    <DialogTitle>Add % line</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    <div>
                        <Label>
                            Description <span className="text-destructive">*</span>
                        </Label>
                        <DescriptionSuggestInput
                            value={description}
                            onChange={setDescription}
                            placeholder="e.g., Service fee, Management surcharge"
                            maxLength={200}
                        />
                    </div>

                    <div>
                        <Label>Category</Label>
                        <Select
                            value={category}
                            onValueChange={(value) => setCategory(value as ServiceCategory)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ASSEMBLY">ASSEMBLY</SelectItem>
                                <SelectItem value="EQUIPMENT">EQUIPMENT</SelectItem>
                                <SelectItem value="HANDLING">HANDLING</SelectItem>
                                <SelectItem value="RESKIN">RESKIN</SelectItem>
                                <SelectItem value="TRANSPORT">TRANSPORT</SelectItem>
                                <SelectItem value="OTHER">OTHER</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Charge basis — pick a subtotal, take a percent of it. */}
                    <div className="space-y-3 rounded-md border border-primary/30 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Charge basis · {sourceLineItemIds.length} line
                            {sourceLineItemIds.length === 1 ? "" : "s"} selected
                        </p>

                        {/* Base selector — both subtotals shown so the choice is informed. */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setBase("BUY")}
                                className={cn(
                                    "rounded-md border p-3 text-left transition-colors",
                                    base === "BUY"
                                        ? "border-primary ring-1 ring-primary"
                                        : "border-border hover:border-muted-foreground/40"
                                )}
                            >
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Buy subtotal
                                </p>
                                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                                    {summedBuy.toFixed(2)} {currency}
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setBase("SELL")}
                                className={cn(
                                    "rounded-md border p-3 text-left transition-colors",
                                    base === "SELL"
                                        ? "border-primary ring-1 ring-primary"
                                        : "border-border hover:border-muted-foreground/40"
                                )}
                            >
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Sell subtotal
                                </p>
                                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                                    {summedSell.toFixed(2)} {currency}
                                </p>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>
                                    Percent (%) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={percent}
                                    placeholder="e.g. 10"
                                    onChange={(e) => setPercent(e.target.value)}
                                    className="text-right font-mono tabular-nums"
                                />
                            </div>
                            <div>
                                <Label>Sell override ({currency})</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={sellOverride}
                                    placeholder="optional — clean number"
                                    onChange={(e) => setSellOverride(e.target.value)}
                                    className="text-right font-mono tabular-nums"
                                />
                            </div>
                        </div>

                        {/* Resulting client SELL — the headline number. Buy is always 0. */}
                        <div className="flex items-end justify-between rounded-md bg-muted/40 px-4 py-3">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Client charge (Sell)
                                </p>
                                <p className="mt-0.5 font-mono text-xl font-bold tabular-nums">
                                    {resultSell != null ? resultSell.toFixed(2) : "—"}{" "}
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {currency}
                                    </span>
                                </p>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Buy 0.00 · 100% margin
                            </p>
                        </div>
                    </div>

                    {/* Visibility — same labeled eye affordance as the ledger table. */}
                    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <Label className="text-sm">Visible to client</Label>
                        <button
                            type="button"
                            onClick={() => setClientVisible((v) => !v)}
                            className={cn(
                                "ml-auto inline-flex",
                                clientVisible ? "text-primary" : "text-muted-foreground/50"
                            )}
                            aria-label={
                                clientVisible ? "Hide line from client" : "Show line to client"
                            }
                            title={
                                clientVisible
                                    ? "Visible to client — click to hide"
                                    : "Hidden from client — click to show"
                            }
                        >
                            {clientVisible ? (
                                <Eye className="h-4 w-4" />
                            ) : (
                                <EyeOff className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <Label className="text-sm">Visible to logistics</Label>
                        <button
                            type="button"
                            onClick={() => setLogisticsVisible((v) => !v)}
                            className={cn(
                                "ml-auto inline-flex",
                                logisticsVisible ? "text-primary" : "text-muted-foreground/50"
                            )}
                            aria-label={
                                logisticsVisible
                                    ? "Hide line from logistics"
                                    : "Show line to logistics"
                            }
                            title={
                                logisticsVisible
                                    ? "Visible to logistics — click to hide"
                                    : "Hidden from logistics — click to show"
                            }
                        >
                            {logisticsVisible ? (
                                <Eye className="h-4 w-4" />
                            ) : (
                                <EyeOff className="h-4 w-4" />
                            )}
                        </button>
                    </div>

                    <div>
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Internal notes..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? "Adding…" : "Add % line"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
