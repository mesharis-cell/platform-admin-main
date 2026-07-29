"use client";

import { Fragment, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertTriangle,
    ArrowRight,
    Ban,
    ChevronDown,
    Eye,
    EyeOff,
    Info,
    Percent,
    Plus,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { AddPercentageLineModal } from "@/components/pricing/AddPercentageLineModal";
import { ClientBreakdownView } from "@/components/pricing/ClientBreakdownView";
import { LogisticsBreakdownView } from "@/components/pricing/LogisticsBreakdownView";
import { BulkMarginDialog } from "@/components/pricing/BulkMarginDialog";
import { NoCostDialog } from "@/components/pricing/NoCostDialog";
import { PricingLedgerRow } from "@/components/pricing/PricingLedgerRow";

import {
    useListLineItems,
    usePatchLineItemVisibility,
    useVoidLineItem,
} from "@/hooks/use-order-line-items";
import { useBulkLineItemAction, usePricingPreview } from "@/hooks/use-pricing-ledger";
import { usePlatform } from "@/lib/hooks/use-platform";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import type {
    LineItemBillingMode,
    OrderLineItem,
    OrderPricing,
    PurposeType,
} from "@/types/hybrid-pricing";

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
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
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
    // Add-% line popup (from a multi-selection). pctQuiet carries the QUOTED
    // amend choice resolved BEFORE opening (mirrors addQuiet).
    const [pctOpen, setPctOpen] = useState(false);
    const [pctQuiet, setPctQuiet] = useState(false);
    // Multi-select (bulk actions) — the set of selected line-item ids.
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    // Bulk visibility eye-toggles — rendered as two rows INSIDE the "Visibility"
    // dropdown, each carrying the same eye affordance the table row uses. Each
    // click flips the indicator AND applies that state across the whole
    // selection. Default "visible" (eye open) to match a fresh ledger's default;
    // the click sets, it doesn't read an aggregate.
    const [bulkClientVisible, setBulkClientVisible] = useState(true);
    const [bulkLogisticsVisible, setBulkLogisticsVisible] = useState(true);
    // Pen → line-edit modal. Editing is done in the unified Add/Edit modal, never
    // inline. editQuiet carries the QUOTED amend choice resolved BEFORE opening.
    const [editItem, setEditItem] = useState<OrderLineItem | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editQuiet, setEditQuiet] = useState(false);

    const isNoCost = pricingMode === "NO_COST";
    const isPostQuote = POST_QUOTE_STATUSES.has(entityStatus);
    const statusEditable = PRICING_EDITABLE_STATUSES.has(entityStatus);
    const ledgerEditable = canAdjust && statusEditable && !isNoCost;
    const isOrder = purposeType === "ORDER";

    // ── F1 / F7 — shared quote-amend gate ───────────────────────────────────
    // On a QUOTED entity EVERY pricing mutation (inline cell / mode change /
    // void / bulk-margin / add catalog+custom) routes through requestAmend(),
    // which surfaces one confirmation dialog and resolves the operator's choice:
    //   "revert" → proceed normally (server pulls the quote back to re-approval)
    //   "quiet"  → proceed with quiet_amend (ORDER-only; amend the sent quote in
    //              place — rebuild + regen estimate, no pull-back / re-notify)
    //   null     → abandon (inline edits roll back to the server value)
    // ORDER shows all three actions; other entities keep the old two-action
    // pull-back confirm (no quiet path). When not post-quote, requestAmend
    // resolves "revert" instantly with no dialog, so callers are status-agnostic.
    const [amendOpen, setAmendOpen] = useState(false);
    const amendResolverRef = useRef<((choice: "revert" | "quiet" | null) => void) | null>(null);
    // G3 (ORDER): the Proposal-B dialog is select-then-confirm — the operator
    // picks an outcome card first (no default), then Confirm resolves it. This
    // holds the pending selection; null = nothing picked yet (Confirm disabled).
    const [amendChoice, setAmendChoice] = useState<"revert" | "quiet" | null>(null);
    // Quiet flag handed to the child dialogs/modals when the pre-flight resolves
    // "Update quietly" (add + bulk-margin own their own mutation internally).
    const [addQuiet, setAddQuiet] = useState(false);
    const [bulkQuiet, setBulkQuiet] = useState(false);

    const requestAmend = (): Promise<"revert" | "quiet" | null> => {
        if (!isPostQuote) return Promise.resolve("revert");
        // Concurrency guard: a confirm dialog may already be pending, its
        // resolver held by the ONE shared ref. The classic collision is the
        // row's 650ms debounced flush firing BEHIND an already-open void / add
        // / bulk dialog (the Radix modal overlay traps focus + pointer but does
        // NOT cancel an already-scheduled setTimeout). Overwriting the ref here
        // would strand the first action's promise forever and let the wrong
        // mutation commit. Instead resolve the newcomer as cancelled (null)
        // immediately, WITHOUT touching dialog state: its caller takes the
        // cancel path — the inline row's catch rolls the field back to the
        // server value — while the already-open dialog proceeds normally.
        if (amendResolverRef.current) return Promise.resolve(null);
        return new Promise((resolve) => {
            amendResolverRef.current = resolve;
            // No default selection (G3) — the operator must pick a card.
            setAmendChoice(null);
            setAmendOpen(true);
        });
    };
    const settleAmend = (choice: "revert" | "quiet" | null) => {
        setAmendOpen(false);
        const resolve = amendResolverRef.current;
        amendResolverRef.current = null;
        resolve?.(choice);
    };

    // G3 keyboard support (ORDER option-card dialog): arrows move the selection
    // between the two cards (no default), Enter confirms the current pick, Esc is
    // handled by Radix onOpenChange → settleAmend(null). Attached to the card
    // group, which is focused when the dialog opens.
    const amendGroupRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!amendOpen || !isOrder) return;
        const t = setTimeout(() => amendGroupRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [amendOpen, isOrder]);
    const AMEND_ORDER = ["revert", "quiet"] as const;
    const handleAmendKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            e.preventDefault();
            setAmendChoice((cur) => {
                const i = cur ? AMEND_ORDER.indexOf(cur) : -1;
                return AMEND_ORDER[Math.min(AMEND_ORDER.length - 1, i + 1)];
            });
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            e.preventDefault();
            setAmendChoice((cur) => {
                const i = cur ? AMEND_ORDER.indexOf(cur) : AMEND_ORDER.length;
                return AMEND_ORDER[Math.max(0, i - 1)];
            });
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (amendChoice) settleAmend(amendChoice);
        }
    };

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

    const voidLineItem = useVoidLineItem(entityId, purposeType);
    const patchVisibility = usePatchLineItemVisibility(entityId, purposeType);
    const bulkAction = useBulkLineItemAction(purposeType, entityId);

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
            { key: "CATALOG", label: "Catalog services", items: catalog },
            { key: "CUSTOM", label: "Custom charges", items: custom },
            { key: "SYSTEM", label: "Auto-calculated", items: system },
        ].filter((g) => g.items.length > 0);
    }, [activeItems]);

    // Footer totals + seed margin come from the ADMIN projection (always fetched
    // alongside the CLIENT preview). null = entity not priced yet (degraded).
    const adminPricing: OrderPricing | null = clientPreview.data?.admin.pricing ?? null;
    const totals = adminPricing?.totals || {};
    const seedMarginPercent = Number(
        adminPricing?.margin_policy?.percent ?? adminPricing?.margin?.percent ?? 0
    );

    // ── Multi-select (bulk actions) ─────────────────────────────────────────
    // Selectable rows mirror PricingLedgerRow's own edit gate exactly: the
    // ledger must be editable AND the row must not be SYSTEM or per-line locked.
    // SYSTEM/locked rows never get a checkbox (matches the task + the row's
    // rowEditable). When the ledger isn't editable, nothing is selectable.
    const isSelectable = (item: OrderLineItem): boolean =>
        ledgerEditable && item.lineItemType !== "SYSTEM" && item.canEditPricingFields !== false;
    const selectableIds = useMemo(
        () => activeItems.filter(isSelectable).map((i) => i.id),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeItems, ledgerEditable]
    );
    const selectableIdSet = useMemo(() => new Set(selectableIds), [selectableIds]);
    // Reconcile the selection against the live selectable set — a mutation may
    // void/lock a selected line, or a status change may lock the whole ledger.
    // Prune any id that's no longer selectable so the bar + sums never act on a
    // stale id (the server would reject it anyway; this keeps the UI honest).
    useEffect(() => {
        setSelectedIds((prev) => {
            let changed = false;
            const next = new Set<string>();
            for (const id of prev) {
                if (selectableIdSet.has(id)) next.add(id);
                else changed = true;
            }
            return changed ? next : prev;
        });
    }, [selectableIdSet]);

    const selectedCount = selectedIds.size;
    const allSelected = selectableIds.length > 0 && selectedCount === selectableIds.length;
    const someSelected = selectedCount > 0 && !allSelected;
    const clearSelection = () => setSelectedIds(new Set());
    const toggleSelectOne = (id: string, checked: boolean) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    const toggleSelectAll = (checked: boolean) =>
        setSelectedIds(checked ? new Set(selectableIds) : new Set());

    // Selection sums — CLIENT-SIDE preview only (the server recomputes the base
    // authoritatively from the selected ids). Mirrors the per-line math in
    // PricingLedgerRow so the popup preview ties out to the ledger:
    //   • buy total  = Σ Number(line.total)             (== engine buy_total)
    //   • sell total = Σ (billable ? effectiveSell×qty : 0), effectiveSell =
    //                  sell override ?? buy × (1 + seed%).
    const selectionSums = useMemo(() => {
        let buy = 0;
        let sell = 0;
        for (const item of activeItems) {
            if (!selectedIds.has(item.id)) continue;
            buy += roundMoney(Number(item.total ?? 0));
            const billingMode = (item.billingMode || "BILLABLE") as LineItemBillingMode;
            if (billingMode !== "BILLABLE") continue;
            const buyUnit = Number(item.unitRate ?? 0);
            const qty = Math.max(1, Math.floor(Number(item.quantity ?? 1) || 1));
            const rawSell = item.sellUnitRate ?? item.sell_unit_rate ?? null;
            const effectiveSell =
                rawSell != null && Number.isFinite(Number(rawSell))
                    ? Number(rawSell)
                    : roundMoney(buyUnit * (1 + seedMarginPercent / 100));
            sell += roundMoney(effectiveSell * qty);
        }
        return { buy: roundMoney(buy), sell: roundMoney(sell) };
    }, [activeItems, selectedIds, seedMarginPercent]);

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

    // Add + bulk-margin gate at OPEN time (pre-flight, mirrors the prior add
    // confirm): resolve the choice, stash the quiet flag for the child, open it.
    const openAdd = async (type: "catalog" | "custom") => {
        const choice = await requestAmend();
        if (choice === null) return;
        setAddQuiet(choice === "quiet");
        if (type === "catalog") setAddCatalogOpen(true);
        else setAddCustomOpen(true);
    };
    const openBulk = async () => {
        const choice = await requestAmend();
        if (choice === null) return;
        setBulkQuiet(choice === "quiet");
        setBulkOpen(true);
    };

    // Pen → line-edit modal. Gate at OPEN time (mirrors add/bulk): resolve the
    // QUOTED amend choice FIRST; cancel → modal never opens. The chosen mode is
    // carried into the modal and only ACTED ON at Save (closing without saving =
    // no revert, no amend). When not post-quote, requestAmend resolves "revert"
    // instantly with no dialog.
    const openEdit = async (item: OrderLineItem) => {
        const choice = await requestAmend();
        if (choice === null) return;
        setEditQuiet(choice === "quiet");
        setEditItem(item);
        setEditOpen(true);
    };
    const handleVoid = async (itemId: string) => {
        let quiet = false;
        if (isOrder) {
            const choice = await requestAmend();
            if (choice === null) return;
            quiet = choice === "quiet";
        }
        try {
            await voidLineItem.mutateAsync({
                itemId,
                data: {
                    void_reason: "Removed via pricing ledger",
                    ...(quiet ? { quiet_amend: true } : {}),
                },
            });
            toast.success("Line removed");
        } catch (error: any) {
            toast.error(error.message || "Failed to remove line");
        }
    };
    const handleToggleVisibility = async (
        itemId: string,
        next: { clientPriceVisible?: boolean; clientVisible?: boolean; logisticsVisible?: boolean }
    ): Promise<boolean> => {
        try {
            await patchVisibility.mutateAsync({ itemId, data: next });
            return true;
        } catch (error: any) {
            toast.error(error.message || "Failed to update visibility");
            return false;
        }
    };

    // ── Bulk actions (multi-select) ─────────────────────────────────────────
    // EVERY bulk op fires the shared amend gate ONCE for the whole selection
    // (requestAmend resolves instantly to "revert" off a QUOTED entity), then
    // calls the single bulk endpoint with the resolved quiet flag. The server
    // runs one transaction + one rebuild; the amend gate is never fired per line.
    // `runBulk` funnels all three actions through that one gate + call + success
    // flow (clear selection, success toast). No-op on an empty selection.
    const runBulk = async (
        params: Omit<Parameters<typeof bulkAction.mutateAsync>[0], "quiet_amend" | "line_item_ids">,
        successMessage: string
    ) => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        const choice = await requestAmend();
        if (choice === null) return;
        try {
            const result = await bulkAction.mutateAsync({
                ...params,
                line_item_ids: ids,
                ...(choice === "quiet" ? { quiet_amend: true } : {}),
            });
            const changed = Number(result?.updated_count ?? ids.length);
            toast.success(`${successMessage} (${changed} line${changed === 1 ? "" : "s"})`);
            clearSelection();
        } catch (error: any) {
            toast.error(error.message || "Bulk action failed");
        }
    };
    const handleBulkVoid = () =>
        runBulk(
            { action: "VOID", void_reason: "Removed via pricing ledger bulk action" },
            "Lines removed"
        );
    // The bulk endpoint's SET_VISIBILITY schema is .strict() snake_case
    // (client_visible / client_price_visible / logistics_visible). Send snake_case
    // keys verbatim — a camelCase key ("logisticsVisible") is rejected as an
    // unrecognized key by the strict Zod schema.
    const handleBulkVisibility = (
        flags: { client_visible?: boolean; logistics_visible?: boolean },
        label: string
    ) => runBulk({ action: "SET_VISIBILITY", ...flags }, label);
    const handleBulkBilling = (mode: LineItemBillingMode) =>
        runBulk({ action: "SET_BILLING_MODE", billing_mode: mode }, `Billing set to ${mode}`);

    // Add-% line — gate at OPEN time (mirrors openAdd): resolve the QUOTED amend
    // choice, stash the quiet flag for the modal, open it. The modal's own create
    // routes through the normal single-create amend path with that flag.
    const openAddPercent = async () => {
        if (selectedIds.size === 0) return;
        const choice = await requestAmend();
        if (choice === null) return;
        setPctQuiet(choice === "quiet");
        setPctOpen(true);
    };

    const postQuoteCopy =
        purposeType === "ORDER"
            ? "This quote has been sent. Editing a line pulls the order back to admin re-approval, marks the quote as being revised, and notifies the client — their estimate download pauses until you re-approve."
            : "This quote has been sent. Editing a line will revise it and re-notify the recipient.";
    // Non-ORDER amend-dialog body (2-action pull-back confirm). ORDER uses the
    // Proposal-B option-card layout below instead of a prose description.
    const amendDescription = postQuoteCopy;

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
                            <>
                                {/* Bulk-action bar — appears when ≥1 row is selected.
                                    Each action fires the shared amend gate ONCE for the
                                    whole selection (runBulk), then calls the single bulk
                                    endpoint. Add-% opens the popup instead. */}
                                {ledgerEditable && selectedCount > 0 ? (
                                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                                        <span className="text-xs font-semibold">
                                            {selectedCount} selected
                                        </span>
                                        <div className="ml-auto flex flex-wrap items-center gap-2">
                                            {/* Visibility — ONE dropdown holding the two eye
                                                toggles. Each row flips its own indicator and
                                                applies that state across the selection; the
                                                menu stays OPEN on select (onSelect
                                                preventDefault) so both toggles can be worked
                                                without re-opening. */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={bulkAction.isPending}
                                                    >
                                                        Visibility
                                                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuItem
                                                        data-testid="bulk-visibility-client"
                                                        disabled={bulkAction.isPending}
                                                        // Keep the menu open so the admin can
                                                        // flip both toggles in one pass.
                                                        onSelect={(e) => {
                                                            e.preventDefault();
                                                            const next = !bulkClientVisible;
                                                            setBulkClientVisible(next);
                                                            void handleBulkVisibility(
                                                                { client_visible: next },
                                                                next
                                                                    ? "Shown to client"
                                                                    : "Hidden from client"
                                                            );
                                                        }}
                                                        className="justify-between gap-3"
                                                        aria-label={
                                                            bulkClientVisible
                                                                ? "Hide selected lines from client"
                                                                : "Show selected lines to client"
                                                        }
                                                    >
                                                        <span>Visible to client</span>
                                                        {bulkClientVisible ? (
                                                            <Eye
                                                                data-testid="bulk-visibility-client-on"
                                                                className="h-4 w-4 text-primary"
                                                            />
                                                        ) : (
                                                            <EyeOff
                                                                data-testid="bulk-visibility-client-off"
                                                                className="h-4 w-4 text-muted-foreground/50"
                                                            />
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        data-testid="bulk-visibility-logistics"
                                                        disabled={bulkAction.isPending}
                                                        onSelect={(e) => {
                                                            e.preventDefault();
                                                            const next = !bulkLogisticsVisible;
                                                            setBulkLogisticsVisible(next);
                                                            void handleBulkVisibility(
                                                                { logistics_visible: next },
                                                                next
                                                                    ? "Shown to logistics"
                                                                    : "Hidden from logistics"
                                                            );
                                                        }}
                                                        className="justify-between gap-3"
                                                        aria-label={
                                                            bulkLogisticsVisible
                                                                ? "Hide selected lines from logistics"
                                                                : "Show selected lines to logistics"
                                                        }
                                                    >
                                                        <span>Visible to logistics</span>
                                                        {bulkLogisticsVisible ? (
                                                            <Eye
                                                                data-testid="bulk-visibility-logistics-on"
                                                                className="h-4 w-4 text-primary"
                                                            />
                                                        ) : (
                                                            <EyeOff
                                                                data-testid="bulk-visibility-logistics-off"
                                                                className="h-4 w-4 text-muted-foreground/50"
                                                            />
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Billing mode */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={bulkAction.isPending}
                                                    >
                                                        Billing
                                                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            void handleBulkBilling("BILLABLE")
                                                        }
                                                    >
                                                        Billable
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            void handleBulkBilling("NON_BILLABLE")
                                                        }
                                                    >
                                                        Non-billable
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            void handleBulkBilling("COMPLIMENTARY")
                                                        }
                                                    >
                                                        Complimentary
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Add % line */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void openAddPercent()}
                                                disabled={bulkAction.isPending}
                                            >
                                                <Percent className="mr-1 h-4 w-4" /> Add % line
                                            </Button>

                                            {/* Delete (bulk void) */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => void handleBulkVoid()}
                                                disabled={bulkAction.isPending}
                                            >
                                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={clearSelection}
                                                disabled={bulkAction.isPending}
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
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
                                                {/* Select-all — only when the ledger is
                                                editable (checkboxes exist). */}
                                                <TableHead className="w-8 px-2">
                                                    {ledgerEditable && selectableIds.length > 0 ? (
                                                        <Checkbox
                                                            checked={
                                                                allSelected
                                                                    ? true
                                                                    : someSelected
                                                                      ? "indeterminate"
                                                                      : false
                                                            }
                                                            onCheckedChange={(v) =>
                                                                toggleSelectAll(v === true)
                                                            }
                                                            aria-label={
                                                                allSelected
                                                                    ? "Deselect all lines"
                                                                    : "Select all lines"
                                                            }
                                                        />
                                                    ) : null}
                                                </TableHead>
                                                <TableHead className="w-8" />
                                                <TableHead className="text-left font-mono text-xs font-bold uppercase">
                                                    Line
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
                                                    Billing
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
                                                    Qty
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
                                                    Buy / Unit
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
                                                    Sell / Unit
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
                                                    Margin %
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
                                                    Margin Amount
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
                                                    Visible to logistics
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
                                                    Visible to client
                                                </TableHead>
                                                <TableHead className="text-center font-mono text-xs font-bold uppercase">
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
                                                            colSpan={13}
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
                                                            allowVisibility={canAdjust && !isNoCost}
                                                            currency={resolvedCurrency}
                                                            selectable={isSelectable(item)}
                                                            selected={selectedIds.has(item.id)}
                                                            onSelectChange={(checked) =>
                                                                toggleSelectOne(item.id, checked)
                                                            }
                                                            onEdit={() => void openEdit(item)}
                                                            onVoid={() => handleVoid(item.id)}
                                                            onToggleVisibility={(next) =>
                                                                handleToggleVisibility(
                                                                    item.id,
                                                                    next
                                                                )
                                                            }
                                                        />
                                                    ))}
                                                </Fragment>
                                            ))}

                                            {/* In-table subtotal — money stays in the Total column (A3) */}
                                            {adminPricing ? (
                                                <TableRow className="border-t border-border bg-muted/20 font-semibold hover:bg-muted/20">
                                                    <TableCell />
                                                    <TableCell />
                                                    <TableCell colSpan={7} className="py-2">
                                                        Subtotal — line sell
                                                    </TableCell>
                                                    <TableCell colSpan={2} />
                                                    <TableCell className="py-2 text-center font-mono text-xs tabular-nums">
                                                        {money(sellTotal, resolvedCurrency)}
                                                    </TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            ) : null}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
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
                                        onClick={() => void openAdd("catalog")}
                                    >
                                        <Plus className="mr-1 h-4 w-4" /> Catalog
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="softPrimary"
                                        onClick={() => void openAdd("custom")}
                                    >
                                        <Plus className="mr-1 h-4 w-4" /> Custom
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="softPrimary"
                                        onClick={() => void openBulk()}
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

            {/* F1 / F7 / G3 — shared quote-amend confirm. Fires on EVERY pricing
                mutation of a QUOTED entity (inline cell / mode change / void /
                bulk-margin / add). ORDER shows the Proposal-B option cards
                (select-then-confirm: pull back · update quietly); other entities
                keep the simple two-action pull-back confirm (no quiet path). */}
            <AlertDialog open={amendOpen} onOpenChange={(open) => !open && settleAmend(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>This quote has already been sent</AlertDialogTitle>
                        {isOrder ? (
                            <AlertDialogDescription>
                                Choose how to apply your change:
                            </AlertDialogDescription>
                        ) : (
                            <AlertDialogDescription>{amendDescription}</AlertDialogDescription>
                        )}
                    </AlertDialogHeader>

                    {isOrder ? (
                        <div
                            ref={amendGroupRef}
                            role="radiogroup"
                            aria-label="How to apply your change"
                            tabIndex={-1}
                            onKeyDown={handleAmendKeyDown}
                            className="flex flex-col gap-2.5 outline-none"
                        >
                            {/* Card 1 — pull back for re-approval */}
                            <div
                                role="radio"
                                aria-checked={amendChoice === "revert"}
                                onClick={() => setAmendChoice("revert")}
                                className={cn(
                                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                                    amendChoice === "revert"
                                        ? "border-primary ring-1 ring-primary"
                                        : "border-border hover:border-muted-foreground/40"
                                )}
                            >
                                <span
                                    className={cn(
                                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                        amendChoice === "revert"
                                            ? "border-primary"
                                            : "border-muted-foreground/50"
                                    )}
                                >
                                    {amendChoice === "revert" ? (
                                        <span className="h-2 w-2 rounded-full bg-primary" />
                                    ) : null}
                                </span>
                                <div className="min-w-0 space-y-1.5">
                                    <p className="text-sm font-semibold">Send for re-approval</p>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                                            Quoted
                                        </span>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <span className="inline-flex rounded border border-indigo-500/30 bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700">
                                            Pending approval
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Client notified · their estimate download pauses until you
                                        re-approve.
                                    </p>
                                </div>
                            </div>

                            {/* Card 2 — update quietly */}
                            <div
                                role="radio"
                                aria-checked={amendChoice === "quiet"}
                                onClick={() => setAmendChoice("quiet")}
                                className={cn(
                                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                                    amendChoice === "quiet"
                                        ? "border-primary ring-1 ring-primary"
                                        : "border-border hover:border-muted-foreground/40"
                                )}
                            >
                                <span
                                    className={cn(
                                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                        amendChoice === "quiet"
                                            ? "border-primary"
                                            : "border-muted-foreground/50"
                                    )}
                                >
                                    {amendChoice === "quiet" ? (
                                        <span className="h-2 w-2 rounded-full bg-primary" />
                                    ) : null}
                                </span>
                                <div className="min-w-0 space-y-1.5">
                                    <p className="text-sm font-semibold">Update quietly</p>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Quoted · unchanged
                                        </span>
                                        <span className="inline-flex rounded border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                                            PDF refreshed
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Amends the sent quote in place. No status change, no email.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <AlertDialogFooter className="sm:justify-between">
                        <button
                            type="button"
                            onClick={() => settleAmend(null)}
                            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                            Cancel
                        </button>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {isOrder ? (
                                <Button
                                    disabled={amendChoice === null}
                                    onClick={() => amendChoice && settleAmend(amendChoice)}
                                >
                                    Confirm
                                </Button>
                            ) : (
                                <Button onClick={() => settleAmend("revert")}>Continue</Button>
                            )}
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modals + dialogs */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={entityId}
                purposeType={purposeType}
                quietAmend={addQuiet}
            />
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                targetId={entityId}
                purposeType={purposeType}
                seedMarginPercent={seedMarginPercent}
                currency={resolvedCurrency}
                quietAmend={addQuiet}
            />
            {/* Pen → line edit (both CATALOG + CUSTOM). The QUOTED amend gate has
                already run in openEdit; editQuiet carries the choice into the PUT. */}
            <AddCustomLineItemModal
                open={editOpen}
                onOpenChange={setEditOpen}
                targetId={entityId}
                purposeType={purposeType}
                seedMarginPercent={seedMarginPercent}
                currency={resolvedCurrency}
                quietAmend={editQuiet}
                editItem={editItem}
            />
            <BulkMarginDialog
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                purposeType={purposeType}
                entityId={entityId}
                quietAmend={bulkQuiet}
            />
            <AddPercentageLineModal
                open={pctOpen}
                onOpenChange={setPctOpen}
                purposeType={purposeType}
                entityId={entityId}
                sourceLineItemIds={Array.from(selectedIds)}
                summedBuy={selectionSums.buy}
                summedSell={selectionSums.sell}
                currency={resolvedCurrency}
                quietAmend={pctQuiet}
                onSuccess={clearSelection}
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
