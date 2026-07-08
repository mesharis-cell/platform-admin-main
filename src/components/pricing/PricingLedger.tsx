"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Ban, Info, Percent, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { ClientBreakdownView } from "@/components/pricing/ClientBreakdownView";
import { LogisticsBreakdownView } from "@/components/pricing/LogisticsBreakdownView";
import { BulkMarginDialog } from "@/components/pricing/BulkMarginDialog";
import { NoCostDialog } from "@/components/pricing/NoCostDialog";
import { PricingLedgerRow } from "@/components/pricing/PricingLedgerRow";

import {
    useListLineItems,
    usePatchLineItemVisibility,
    useUpdateLineItem,
    useVoidLineItem,
} from "@/hooks/use-order-line-items";
import { usePricingPreview } from "@/hooks/use-pricing-ledger";
import { usePlatform } from "@/lib/hooks/use-platform";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import type { OrderLineItem, OrderPricing, PurposeType } from "@/types/hybrid-pricing";

export interface PricingLedgerProps {
    purposeType: PurposeType;
    entityId: string;
    // Drives editability + post-quote banner copy.
    entityStatus: string;
    pricingMode: "STANDARD" | "NO_COST";
    // SERVICE_REQUEST only: its billing mode. An INTERNAL_ONLY SR is never
    // client-billed, so the API rejects "mark no-cost" on it — hide the action.
    billingMode?: string;
    // The entity page supplies the approve mutation + label (approve stays one
    // click, never a gate — decision 8). Omit to hide the approve slot.
    onApprove?: () => void;
    approveLabel?: string;
    approveDisabled?: boolean;
    approveBusy?: boolean;
    // Override the display currency. Omit to use the platform display currency
    // (resolved via usePlatform inside the component; falls back to AED).
    currency?: string;
}

type Lens = "edit" | "client" | "logistics";

// Statuses at/after which line-item pricing is locked (financial lock / terminal).
// Mirrors canManageLineItems(order-helpers) but generic across the 4 entities:
// the set of statuses that still permit pricing edits. Anything else is locked.
//
// ORDER / SELF_PICKUP / INBOUND_REQUEST callers pass the entity's OPERATIONAL
// status (DRAFT…QUOTED). SERVICE_REQUEST money editability keys off the
// COMMERCIAL status instead (dual-status model), so the SR-commercial editable
// states — INTERNAL, PENDING_QUOTE (QUOTED is shared) — are unioned in. This
// mirrors the API's getLineItemEditability SR branch exactly: the SR locked set
// is QUOTE_APPROVED / INVOICED / PAID, so everything before QUOTE_APPROVED stays
// editable. (CANCELLED is deliberately NOT included — a cancelled SR is never
// edited from the UI even though the API doesn't hard-lock it.) None of these SR
// strings collide with the other three entities' statuses, so the shared set
// stays safe. The per-line `canEditPricingFields` from the API remains the
// authoritative lock inside PricingLedgerRow.
const PRICING_EDITABLE_STATUSES = new Set([
    "DRAFT",
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    // SR commercial editable states (pre-QUOTE_APPROVED)
    "INTERNAL",
    "PENDING_QUOTE",
]);

// Statuses where a sent quote gets pulled back on edit (post-quote warning).
const POST_QUOTE_STATUSES = new Set(["QUOTED"]);

const money = (n: number, currency: string) => `${Number(n || 0).toFixed(2)} ${currency}`;
// Up to 2 decimals, trailing zeros trimmed (30% / 66.67%).
const fmtPct = (pct: number) => `${Number((pct || 0).toFixed(2))}`;

/**
 * PricingLedger — the single editable money table for all four billable entities
 * (PLAN §2.3 / §5.2). Edit lens (ADMIN) + server-projected preview lenses. Owns
 * the add-line modals, bulk-margin, and no-cost actions; renders the caller's
 * approve action in the footer slot.
 *
 * Canonical-copy-per-repo: the admin build. A buy-only warehouse variant is a
 * separate copy (Phase 4).
 */
export function PricingLedger({
    purposeType,
    entityId,
    entityStatus,
    pricingMode,
    billingMode,
    onApprove,
    approveLabel = "Approve & send quote",
    approveDisabled,
    approveBusy,
    currency,
}: PricingLedgerProps) {
    const { user } = useToken();
    const canAdjust = hasPermission(user, "pricing:adjust");
    // Currency: explicit prop wins, else the platform display currency (same
    // source order emails + the breakdown views read), else AED as a last resort.
    const { data: platform } = usePlatform();
    const resolvedCurrency = currency ?? platform?.config?.currency ?? "AED";
    // No-cost is a client-billing waiver — it makes no sense (and the API 400s)
    // on an INTERNAL_ONLY service request, which is never billed to a client.
    const noCostApplicable = !(
        purposeType === "SERVICE_REQUEST" && billingMode === "INTERNAL_ONLY"
    );

    const [lens, setLens] = useState<Lens>("edit");
    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [noCostOpen, setNoCostOpen] = useState(false);
    // QUOTED pull-back confirm gates add actions only (decision 7).
    const [pendingAdd, setPendingAdd] = useState<"catalog" | "custom" | null>(null);

    const isNoCost = pricingMode === "NO_COST";
    const isPostQuote = POST_QUOTE_STATUSES.has(entityStatus);
    const statusEditable = PRICING_EDITABLE_STATUSES.has(entityStatus);
    const ledgerEditable = canAdjust && statusEditable && !isNoCost;

    // Edit-lens rows: existing list hook (camelCase, auto-invalidated by every
    // mutation). Preview lenses + footer totals: the role-preview endpoint.
    const { data: rawItems, isLoading: itemsLoading } = useListLineItems(entityId, purposeType);
    const clientPreview = usePricingPreview(purposeType, entityId, "CLIENT");
    const logisticsPreview = usePricingPreview(
        purposeType,
        entityId,
        "LOGISTICS",
        lens === "logistics"
    );

    const updateLineItem = useUpdateLineItem(entityId, purposeType);
    const voidLineItem = useVoidLineItem(entityId, purposeType);
    const patchVisibility = usePatchLineItemVisibility(entityId, purposeType);

    const activeItems: OrderLineItem[] = useMemo(
        () => (rawItems || []).filter((i: OrderLineItem) => !i.isVoided),
        [rawItems]
    );

    // Section grouping (A5) — pure render-time partition of the already-fetched
    // lines, preserving each line's original order within its bucket. Catalog →
    // Custom → Auto-calculated (SYSTEM). Empty buckets are dropped.
    const groups = useMemo(() => {
        const catalog: OrderLineItem[] = [];
        const custom: OrderLineItem[] = [];
        const system: OrderLineItem[] = [];
        for (const it of activeItems) {
            if (it.lineItemType === "SYSTEM") system.push(it);
            else if (it.lineItemType === "CUSTOM") custom.push(it);
            else catalog.push(it);
        }
        return [
            { key: "CATALOG", label: "Catalog services", items: catalog, wash: false },
            { key: "CUSTOM", label: "Custom charges", items: custom, wash: true },
            { key: "SYSTEM", label: "Auto-calculated", items: system, wash: false },
        ].filter((g) => g.items.length > 0);
    }, [activeItems]);

    // Footer totals + seed margin come from the ADMIN projection (always fetched
    // alongside the CLIENT preview). null = entity not priced yet (degraded).
    const adminPricing: OrderPricing | null = clientPreview.data?.admin.pricing ?? null;
    const totals = adminPricing?.totals || {};
    const seedMarginPercent = Number(
        adminPricing?.margin_policy?.percent ?? adminPricing?.margin?.percent ?? 0
    );

    const buyTotal = Number(totals.buy_total ?? 0);
    const sellTotal = Number(totals.sell_total ?? 0);
    const marginAmount = Number(totals.margin_amount ?? sellTotal - buyTotal);
    const blendedPercent = buyTotal > 0 ? (marginAmount / buyTotal) * 100 : 0;
    const vatPercent = Number(adminPricing?.vat?.percent ?? totals.vat_percent ?? 0);
    const vatAmount = Number(adminPricing?.vat?.amount ?? totals.vat_amount ?? 0);
    const clientTotal = Number(totals.sell_total_with_vat ?? totals.total ?? sellTotal + vatAmount);

    // Lens-aware footer-staircase sources (owner decision 2026-07-08). The
    // below-table grand-total staircase must reflect the ACTIVE lens's server
    // projection — otherwise the client / logistics preview lenses leak the
    // admin buy + margin figures into a role-scoped view. edit → admin totals
    // (above); client → the CLIENT projection (sell + VAT only); logistics →
    // the LOGISTICS projection (buy total only). Both preview pricings are read
    // with the same fallbacks Client/LogisticsBreakdownView use.
    const clientPreviewTotals = clientPreview.data?.preview.pricing?.totals || {};
    const clientPreviewSubtotal = Number(
        clientPreviewTotals.subtotal ?? clientPreviewTotals.sell_total ?? 0
    );
    const clientPreviewVatPercent = Number(
        clientPreview.data?.preview.pricing?.vat?.percent ?? clientPreviewTotals.vat_percent ?? 0
    );
    const clientPreviewVatAmount = Number(
        clientPreview.data?.preview.pricing?.vat?.amount ?? clientPreviewTotals.vat_amount ?? 0
    );
    const clientPreviewTotal = Number(
        clientPreviewTotals.total ??
            clientPreviewTotals.sell_total_with_vat ??
            clientPreviewSubtotal + clientPreviewVatAmount
    );
    const logisticsPreviewTotals = logisticsPreview.data?.preview.pricing?.totals || {};
    const logisticsPreviewTotal = Number(
        logisticsPreviewTotals.buy_total ?? logisticsPreviewTotals.total ?? 0
    );

    // Advisory warnings — informational, never blocking.
    const warnings = useMemo(() => {
        const out: string[] = [];
        for (const it of activeItems) {
            if (it.lineItemType === "SYSTEM") continue;
            if ((it.billingMode || "BILLABLE") !== "BILLABLE") continue;
            const buy = Number(it.unitRate ?? 0);
            const sellOverride = it.sellUnitRate ?? it.sell_unit_rate ?? null;
            if (sellOverride == null) {
                out.push(`"${it.description}" has no sell price set.`);
            } else if (buy > 0 && Math.abs(Number(sellOverride) - buy) < 0.005) {
                out.push(`"${it.description}" is billable at 0% margin (sell = buy).`);
            }
        }
        return out;
    }, [activeItems]);

    const openAdd = (type: "catalog" | "custom") => {
        if (isPostQuote) {
            setPendingAdd(type);
            return;
        }
        if (type === "catalog") setAddCatalogOpen(true);
        else setAddCustomOpen(true);
    };
    const confirmPendingAdd = () => {
        if (pendingAdd === "catalog") setAddCatalogOpen(true);
        else if (pendingAdd === "custom") setAddCustomOpen(true);
        setPendingAdd(null);
    };

    const handleUpdate =
        (itemId: string) =>
        async (data: Parameters<typeof updateLineItem.mutateAsync>[0]["data"]) => {
            return updateLineItem.mutateAsync({ itemId, data });
        };
    const handleVoid = async (itemId: string) => {
        try {
            await voidLineItem.mutateAsync({
                itemId,
                data: { void_reason: "Removed via pricing ledger" },
            });
            toast.success("Line removed");
        } catch (error: any) {
            toast.error(error.message || "Failed to remove line");
        }
    };
    const handleToggleVisibility = async (
        itemId: string,
        next: { clientPriceVisible?: boolean; clientVisible?: boolean; logisticsVisible?: boolean }
    ) => {
        try {
            await patchVisibility.mutateAsync({ itemId, data: next });
        } catch (error: any) {
            toast.error(error.message || "Failed to update visibility");
        }
    };

    const postQuoteCopy =
        purposeType === "ORDER"
            ? "This quote has been sent. Editing a line pulls the order back to admin re-approval, marks the quote as being revised, and notifies the client — their estimate download pauses until you re-approve."
            : "This quote has been sent. Editing a line will revise it and re-notify the recipient.";

    return (
        <div className="rounded-lg border border-border bg-card">
            {/* Header + lenses */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wide">
                        Pricing Ledger
                    </h3>
                    {isNoCost ? (
                        <Badge
                            variant="outline"
                            className="gap-1 border-slate-500/40 text-[10px] text-slate-600"
                        >
                            <Ban className="h-3 w-3" /> No-cost
                        </Badge>
                    ) : null}
                </div>
                <Tabs value={lens} onValueChange={(v) => setLens(v as Lens)}>
                    <TabsList className="h-8 bg-muted/50">
                        <TabsTrigger value="edit" className="text-xs">
                            Edit
                        </TabsTrigger>
                        <TabsTrigger value="client" className="text-xs">
                            Preview as client
                        </TabsTrigger>
                        <TabsTrigger value="logistics" className="text-xs">
                            Preview as logistics
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Banners */}
            {isPostQuote && !isNoCost ? (
                <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{postQuoteCopy}</span>
                </div>
            ) : null}
            {isNoCost ? (
                <div className="flex items-start gap-2 border-b border-border bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        This entity is marked no-cost. All pricing is zeroed and locked; the client
                        sees a zero total.
                    </span>
                </div>
            ) : null}

            <div className="p-4">
                <Tabs value={lens} className="w-full">
                    {/* EDIT LENS */}
                    <TabsContent value="edit" className="mt-0">
                        {itemsLoading ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Loading lines…
                            </p>
                        ) : activeItems.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                No line items yet.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-md border border-border">
                                {/* Stripe legend — teaches the left-edge colours */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/50 bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <span
                                            className="h-3 w-1 rounded-sm"
                                            style={{ background: "var(--primary)" }}
                                        />
                                        override
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-3 w-1 rounded-sm bg-[#9333ea]" />
                                        system
                                    </span>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border/50 bg-muted/50">
                                            <TableHead className="w-8" />
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Line
                                            </TableHead>
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Billing
                                            </TableHead>
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Buy / Unit
                                            </TableHead>
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Sell / Unit
                                            </TableHead>
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Margin %
                                            </TableHead>
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Margin Amount
                                            </TableHead>
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Logistics
                                            </TableHead>
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Client
                                            </TableHead>
                                            <TableHead className="text-center font-mono text-[10px] font-bold uppercase">
                                                Total
                                            </TableHead>
                                            <TableHead className="w-20" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groups.map((group) => (
                                            <Fragment key={group.key}>
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableCell
                                                        colSpan={11}
                                                        className="py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                                                    >
                                                        {group.label}
                                                    </TableCell>
                                                </TableRow>
                                                {group.items.map((item) => (
                                                    <PricingLedgerRow
                                                        key={item.id}
                                                        item={item}
                                                        seedMarginPercent={seedMarginPercent}
                                                        editable={ledgerEditable}
                                                        allowVisibility={ledgerEditable}
                                                        currency={resolvedCurrency}
                                                        customWash={group.wash}
                                                        onUpdate={handleUpdate(item.id)}
                                                        onVoid={() => handleVoid(item.id)}
                                                        onToggleVisibility={(next) =>
                                                            handleToggleVisibility(item.id, next)
                                                        }
                                                    />
                                                ))}
                                            </Fragment>
                                        ))}

                                        {/* In-table subtotal — money stays in the Total column (A3) */}
                                        {adminPricing ? (
                                            <TableRow className="border-t border-border bg-muted/20 font-semibold hover:bg-muted/20">
                                                <TableCell />
                                                <TableCell colSpan={6} className="py-2">
                                                    Subtotal — line sell
                                                </TableCell>
                                                <TableCell colSpan={2} />
                                                <TableCell className="py-2 text-right font-mono text-xs tabular-nums">
                                                    {money(sellTotal, resolvedCurrency)}
                                                </TableCell>
                                                <TableCell />
                                            </TableRow>
                                        ) : null}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Advisory warnings */}
                        {warnings.length > 0 ? (
                            <div className="mt-3 space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
                                {warnings.map((w, i) => (
                                    <p
                                        key={i}
                                        className="flex items-center gap-1.5 text-[11px] text-amber-700"
                                    >
                                        <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                                    </p>
                                ))}
                            </div>
                        ) : null}
                    </TabsContent>

                    {/* CLIENT PREVIEW */}
                    <TabsContent value="client" className="mt-0">
                        <div className="mb-3 flex items-center gap-2 rounded-md bg-secondary/10 px-3 py-2 text-[11px] text-secondary">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>
                                Exactly what the client receives — sell + VAT only, from the server
                                projection.
                            </span>
                        </div>
                        {clientPreview.isLoading ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Loading preview…
                            </p>
                        ) : (
                            <ClientBreakdownView
                                projection={clientPreview.data?.preview.pricing ?? null}
                            />
                        )}
                    </TabsContent>

                    {/* LOGISTICS PREVIEW */}
                    <TabsContent value="logistics" className="mt-0">
                        <div className="mb-3 flex items-center gap-2 rounded-md bg-indigo-100 px-3 py-2 text-[11px] text-indigo-700">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>
                                Exactly what logistics receives — buy-side only, from the server
                                projection.
                            </span>
                        </div>
                        {logisticsPreview.isLoading ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Loading preview…
                            </p>
                        ) : (
                            <LogisticsBreakdownView
                                projection={logisticsPreview.data?.preview.pricing ?? null}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Footer — totals staircase (A4) + actions */}
            <div className="space-y-4 border-t border-border px-5 py-4">
                {adminPricing ? (
                    // Below-table staircase: muted derived rows → hairline → grand
                    // total, all right-aligned under the money column. LENS-AWARE
                    // (owner 2026-07-08) — the staircase reflects the ACTIVE lens's
                    // server projection so the client / logistics preview lenses
                    // never leak the admin buy + margin figures.
                    lens === "logistics" ? (
                        // LOGISTICS lens — buy total only, no sell / margin / VAT.
                        <div className="ml-auto max-w-xs space-y-1 text-sm">
                            <div className="flex items-baseline justify-between">
                                <span className="font-semibold">Total</span>
                                <span className="font-mono text-base font-bold tabular-nums">
                                    {money(logisticsPreviewTotal, resolvedCurrency)}
                                </span>
                            </div>
                        </div>
                    ) : lens === "client" ? (
                        // CLIENT lens — sell + VAT only, no buy / margin.
                        <div className="ml-auto max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="font-mono tabular-nums">
                                    {money(clientPreviewSubtotal, resolvedCurrency)}
                                </span>
                            </div>
                            {clientPreviewVatPercent > 0 ? (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>VAT ({fmtPct(clientPreviewVatPercent)}%)</span>
                                    <span className="font-mono tabular-nums">
                                        {money(clientPreviewVatAmount, resolvedCurrency)}
                                    </span>
                                </div>
                            ) : null}
                            <div className="my-1.5 border-t border-border" />
                            <div className="flex items-baseline justify-between">
                                <span className="font-semibold">Client total · incl VAT</span>
                                <span className="font-mono text-base font-bold tabular-nums">
                                    {money(clientPreviewTotal, resolvedCurrency)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        // EDIT lens — full admin staircase (buy → margin → VAT →
                        // client total).
                        <div className="ml-auto max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Buy Total</span>
                                <span className="font-mono tabular-nums">
                                    {money(buyTotal, resolvedCurrency)}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Effective margin ({fmtPct(blendedPercent)}%)</span>
                                <span className="font-mono tabular-nums">
                                    +{money(marginAmount, resolvedCurrency)}
                                </span>
                            </div>
                            {vatPercent > 0 ? (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>VAT ({fmtPct(vatPercent)}%)</span>
                                    <span className="font-mono tabular-nums">
                                        {money(vatAmount, resolvedCurrency)}
                                    </span>
                                </div>
                            ) : null}
                            <div className="my-1.5 border-t border-border" />
                            <div className="flex items-baseline justify-between">
                                <span className="font-semibold">Client total · incl VAT</span>
                                <span className="font-mono text-base font-bold tabular-nums">
                                    {money(clientTotal, resolvedCurrency)}
                                </span>
                            </div>
                        </div>
                    )
                ) : (
                    // Degraded — no prices row yet.
                    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">
                            Not priced yet — add or edit a line to generate pricing.
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => clientPreview.refetch()}
                            disabled={clientPreview.isFetching}
                        >
                            <RefreshCw
                                className={cn(
                                    "mr-1 h-4 w-4",
                                    clientPreview.isFetching && "animate-spin"
                                )}
                            />
                            Refresh
                        </Button>
                    </div>
                )}

                {/* Actions + approve — handlers unchanged, only repositioned */}
                {(lens === "edit" && ledgerEditable) || onApprove ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {lens === "edit" && ledgerEditable ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="softPrimary"
                                        onClick={() => openAdd("catalog")}
                                    >
                                        <Plus className="mr-1 h-4 w-4" /> Catalog
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="softPrimary"
                                        onClick={() => openAdd("custom")}
                                    >
                                        <Plus className="mr-1 h-4 w-4" /> Custom
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="softPrimary"
                                        onClick={() => setBulkOpen(true)}
                                    >
                                        <Percent className="mr-1 h-4 w-4" /> Bulk margin…
                                    </Button>
                                    {canAdjust && noCostApplicable ? (
                                        <Button
                                            size="sm"
                                            variant="softPrimary"
                                            onClick={() => setNoCostOpen(true)}
                                        >
                                            <Ban className="mr-1 h-4 w-4" /> No cost
                                        </Button>
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                        {onApprove ? (
                            <Button onClick={onApprove} disabled={approveDisabled || approveBusy}>
                                {approveBusy ? "Working…" : approveLabel}
                            </Button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {/* QUOTED pull-back confirm (add actions only) */}
            <AlertDialog
                open={pendingAdd !== null}
                onOpenChange={(open) => !open && setPendingAdd(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pull back the sent quote?</AlertDialogTitle>
                        <AlertDialogDescription>{postQuoteCopy}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmPendingAdd}>
                            Continue &amp; add line
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modals + dialogs */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={entityId}
                purposeType={purposeType}
            />
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                targetId={entityId}
                purposeType={purposeType}
                seedMarginPercent={seedMarginPercent}
                currency={resolvedCurrency}
            />
            <BulkMarginDialog
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                purposeType={purposeType}
                entityId={entityId}
            />
            <NoCostDialog
                open={noCostOpen}
                onOpenChange={setNoCostOpen}
                purposeType={purposeType}
                entityId={entityId}
            />
        </div>
    );
}
