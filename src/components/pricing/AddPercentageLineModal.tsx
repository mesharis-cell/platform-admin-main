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
import { Switch } from "@/components/ui/switch";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreatePercentageLine } from "@/hooks/use-pricing-ledger";
import type { LineItemBillingMode, PurposeType, ServiceCategory } from "@/types/hybrid-pricing";

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
    // Entity margin seed — drives the BUY-base default sell (buy × (1 + seed%)).
    seedMarginPercent: number;
    currency: string;
    // F7 quiet-amend (ADMIN + ORDER only): resolved by the caller's amend gate
    // BEFORE opening. When true the created line amends the sent quote in place.
    quietAmend?: boolean;
    // Fires on a successful create — the parent clears the selection.
    onSuccess?: () => void;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const fmtPct = (value: number) => String(Number(value.toFixed(2)));
const parseNum = (raw: string): number => {
    const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : NaN;
};

/**
 * Add % line — a leaner sibling of AddCustomLineItemModal. Shows the SUMMED buy
 * + sell of the current selection, lets the admin pick ONE base (Sell sum or Buy
 * sum) + a percent, and live-previews the resulting CUSTOM line:
 *   • base SELL → sell = percent% × summedSell, buy = 0 (a full-margin client
 *     surcharge; forced BILLABLE).
 *   • base BUY  → buy = percent% × summedBuy; sell defaults to the entity margin
 *     seed but is admin-adjustable (BILLABLE only).
 * The created line is a plain snapshot — NOT linked to the source lines.
 *
 * ADMIN-only surface (admin repo, ADMIN role — middleware-enforced), so raw
 * buy/sell/margin is not a client-visibility leak.
 */
export function AddPercentageLineModal({
    open,
    onOpenChange,
    purposeType,
    entityId,
    sourceLineItemIds,
    summedBuy,
    summedSell,
    seedMarginPercent,
    currency,
    quietAmend,
    onSuccess,
}: AddPercentageLineModalProps) {
    const createPercentageLine = useCreatePercentageLine(purposeType, entityId);

    const [base, setBase] = useState<"SELL" | "BUY">("SELL");
    const [percent, setPercent] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ServiceCategory>("OTHER");
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>("BILLABLE");
    const [notes, setNotes] = useState("");
    const [clientPriceVisible, setClientPriceVisible] = useState(false);
    const [logisticsVisible, setLogisticsVisible] = useState(true);
    // BUY base only — optional admin sell override. Empty draft = untouched (omit
    // → server stamps sell from the entity margin seed).
    const [sellOverride, setSellOverride] = useState("");

    // Fresh form on every open.
    useEffect(() => {
        if (!open) return;
        setBase("SELL");
        setPercent("");
        setDescription("");
        setCategory("OTHER");
        setBillingMode("BILLABLE");
        setNotes("");
        setClientPriceVisible(false);
        setLogisticsVisible(true);
        setSellOverride("");
    }, [open]);

    // SELL base is a pure client surcharge → forced BILLABLE (the API 400s a
    // non-billable SELL-base line). Reflect that in the selector.
    const isSellBase = base === "SELL";
    const effectiveBilling: LineItemBillingMode = isSellBase ? "BILLABLE" : billingMode;
    const isBillable = effectiveBilling === "BILLABLE";

    const pctNum = parseNum(percent);
    const pctValid = Number.isFinite(pctNum) && pctNum > 0 && pctNum <= 100000;
    const baseSum = isSellBase ? summedSell : summedBuy;

    // Live preview of the resulting line (buy / sell / margin).
    const preview = useMemo(() => {
        if (!pctValid) return null;
        if (isSellBase) {
            // sell = percent% × summedSell, buy = 0 → a full-margin surcharge.
            const sell = roundMoney((pctNum / 100) * summedSell);
            return { buy: 0, sell, marginDisplay: "Fee" };
        }
        // BUY base — buy = percent% × summedBuy; sell = override or seed-derived.
        const buy = roundMoney((pctNum / 100) * summedBuy);
        if (!isBillable) {
            return { buy, sell: 0, marginDisplay: "—" };
        }
        const overrideNum = parseNum(sellOverride);
        const hasOverride = sellOverride.trim() !== "" && Number.isFinite(overrideNum);
        const sell = hasOverride
            ? roundMoney(overrideNum)
            : roundMoney(buy * (1 + seedMarginPercent / 100));
        const marginDisplay =
            buy > 0 ? `${fmtPct(roundMoney(((sell - buy) / buy) * 100))}%` : "Fee";
        return { buy, sell, marginDisplay };
    }, [
        pctValid,
        isSellBase,
        pctNum,
        summedSell,
        summedBuy,
        isBillable,
        sellOverride,
        seedMarginPercent,
    ]);

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
        // BUY base + billable + admin-adjusted sell → send the override; otherwise
        // omit (server stamps from the entity margin seed).
        let sellPayload: number | undefined;
        if (!isSellBase && isBillable && sellOverride.trim() !== "") {
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
                billing_mode: effectiveBilling,
                client_price_visible: clientPriceVisible,
                logistics_visible: logisticsVisible,
                client_visible: true,
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
                className="flex max-h-[90vh] max-w-lg flex-col gap-0 p-0"
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
                    {/* Selection summary — the two summed bases. */}
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
                                Buy sum
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
                                Sell sum
                            </p>
                            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                                {summedSell.toFixed(2)} {currency}
                            </p>
                        </button>
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                        {sourceLineItemIds.length} line
                        {sourceLineItemIds.length === 1 ? "" : "s"} selected. The new line takes a
                        percent of the{" "}
                        <span className="font-medium text-foreground">
                            {isSellBase ? "Sell" : "Buy"} sum
                        </span>
                        . The exact amount is recomputed on the server from the selected lines.
                    </p>

                    <div>
                        <Label>
                            Description <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Service fee, Management surcharge"
                            maxLength={200}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                        <div>
                            <Label>Billing Mode</Label>
                            <Select
                                value={effectiveBilling}
                                onValueChange={(value) =>
                                    setBillingMode(value as LineItemBillingMode)
                                }
                                disabled={isSellBase}
                            >
                                <SelectTrigger className={cn(isSellBase && "bg-muted")}>
                                    <SelectValue placeholder="Select billing mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BILLABLE">BILLABLE</SelectItem>
                                    <SelectItem value="NON_BILLABLE">NON-BILLABLE</SelectItem>
                                    <SelectItem value="COMPLIMENTARY">COMPLIMENTARY</SelectItem>
                                </SelectContent>
                            </Select>
                            {isSellBase ? (
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                    A sell-base surcharge is always billable.
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {/* Percent + live preview. */}
                    <div className="space-y-3 rounded-md border border-primary/30 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Percent of {isSellBase ? "Sell" : "Buy"} sum
                            </p>
                            <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                Base {baseSum.toFixed(2)} {currency}
                            </span>
                        </div>
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

                        {/* Preview of the resulting line. */}
                        <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/40 p-3 text-center">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Buy / Unit
                                </p>
                                <p className="mt-0.5 font-mono text-sm tabular-nums">
                                    {preview ? preview.buy.toFixed(2) : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Sell / Unit
                                </p>
                                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                                    {preview ? preview.sell.toFixed(2) : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Margin
                                </p>
                                <p className="mt-0.5 font-mono text-sm tabular-nums">
                                    {preview ? preview.marginDisplay : "—"}
                                </p>
                            </div>
                        </div>

                        {/* BUY base — optional sell override (BILLABLE only). */}
                        {!isSellBase && isBillable ? (
                            <div>
                                <Label>Sell / Unit override ({currency})</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={sellOverride}
                                    placeholder={`auto — entity margin ${fmtPct(seedMarginPercent)}%`}
                                    onChange={(e) => setSellOverride(e.target.value)}
                                    className="text-right font-mono tabular-nums"
                                />
                                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                                    Leave blank to follow the entity margin (
                                    {fmtPct(seedMarginPercent)}%).
                                </p>
                            </div>
                        ) : null}

                        <p className="text-[11px] leading-snug text-muted-foreground">
                            {isSellBase
                                ? "Full-margin client surcharge — buy is 0; the whole amount is margin."
                                : "Buy-based cost line — sell follows the entity margin unless you override it above."}
                        </p>
                    </div>

                    {/* Visibility toggles. */}
                    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Label className="text-sm">Visible to logistics</Label>
                        <span className="ml-auto mr-2 text-[11px] text-muted-foreground">
                            off = hidden from the warehouse view
                        </span>
                        <Switch checked={logisticsVisible} onCheckedChange={setLogisticsVisible} />
                    </div>
                    {isBillable ? (
                        <div className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
                            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="space-y-0.5">
                                <Label className="text-sm">Show price to client</Label>
                                <p className="text-[11px] leading-snug text-muted-foreground">
                                    When on, this line&rsquo;s individual sell price appears on the
                                    client&rsquo;s estimate.
                                </p>
                            </div>
                            <Switch
                                className="ml-auto"
                                checked={clientPriceVisible}
                                onCheckedChange={setClientPriceVisible}
                            />
                        </div>
                    ) : null}

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
