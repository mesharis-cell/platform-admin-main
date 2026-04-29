"use client";

import { useMemo, useState } from "react";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Boxes,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    Minus,
    Plus,
    TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    useAssetStockHistory,
    useManualStockAdjustment,
    type ManualStockAdjustmentPayload,
} from "@/hooks/use-stock-movements";
import { LinkedEntityCombobox } from "@/components/assets/linked-entity-combobox";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { cn } from "@/lib/utils";

type Props = {
    assetId: string;
    assetName: string;
    stockMode?: string | null;
    familyId?: string | null;
};

type MovementFilter =
    | "ALL"
    | "INBOUND"
    | "OUTBOUND"
    | "WRITE_OFF"
    | "OUTBOUND_AD_HOC"
    | "ADJUSTMENT";
type Direction = "IN" | "OUT";
type PrimaryOutReason = "CORRECTION" | "USED_FOR";
type OutboundAdHocReason = "REPLACEMENT" | "INSTALL_CONSUMPTION" | "REPURPOSED" | "OTHER";
type WriteOffReason = "CONSUMED" | "LOST" | "DAMAGED" | "OTHER";

const MOVEMENT_STYLES: Record<string, string> = {
    OUTBOUND: "bg-red-50 text-red-700 border-red-200",
    INBOUND: "bg-green-50 text-green-700 border-green-200",
    WRITE_OFF: "bg-amber-50 text-amber-700 border-amber-200",
    OUTBOUND_AD_HOC: "bg-teal-50 text-teal-700 border-teal-200",
    ADJUSTMENT: "bg-blue-50 text-blue-700 border-blue-200",
    INITIAL: "bg-slate-50 text-slate-700 border-slate-200",
};

const MOVEMENT_LABELS: Record<string, string> = {
    OUTBOUND: "Outbound",
    INBOUND: "Inbound",
    WRITE_OFF: "Write-off",
    OUTBOUND_AD_HOC: "Used for",
    ADJUSTMENT: "Correction",
    INITIAL: "Initial",
};

const FILTER_CHIPS: { key: MovementFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "INBOUND", label: "In" },
    { key: "OUTBOUND", label: "Out" },
    { key: "OUTBOUND_AD_HOC", label: "Used for" },
    { key: "WRITE_OFF", label: "Settlements" },
    { key: "ADJUSTMENT", label: "Corrections" },
];

const AD_HOC_SUB_REASONS: { value: OutboundAdHocReason; label: string; hint: string }[] = [
    {
        value: "REPLACEMENT",
        label: "Replacement",
        hint: "Swapping a unit for one that's already booked",
    },
    {
        value: "INSTALL_CONSUMPTION",
        label: "Install",
        hint: "Used during a venue install for an order or pickup",
    },
    {
        value: "REPURPOSED",
        label: "Repurposed",
        hint: "Used internally — demo, sample, marketing setup",
    },
    {
        value: "OTHER",
        label: "Other",
        hint: "No order context — fill in the details below",
    },
];

const PAGE_LIMIT = 20;

function formatDateTime(iso: string) {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
    return { date, time };
}

export function AssetStockSection({ assetId, assetName, stockMode, familyId }: Props) {
    const isPooled = stockMode === "POOLED";
    const [dialogOpen, setDialogOpen] = useState(false);
    const [filter, setFilter] = useState<MovementFilter>("ALL");
    const [page, setPage] = useState(1);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (!familyId) {
            toast.error("Family not available — cannot export");
            return;
        }
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (filter !== "ALL") params.append("movement_type", filter);
            const url = `/operations/v1/export/stock-movements/family/${familyId}${
                params.toString() ? `?${params.toString()}` : ""
            }`;
            const response = await apiClient.get(url, { responseType: "blob" });
            const blob =
                response.data instanceof Blob
                    ? response.data
                    : new Blob([response.data], { type: "text/csv;charset=utf-8;" });
            const downloadUrl = URL.createObjectURL(blob);
            // eslint-disable-next-line creatr/no-browser-globals-in-ssr
            const link = window.document.createElement("a");
            link.href = downloadUrl;
            const safeName = assetName.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "stock";
            link.download = `stock-movements-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(downloadUrl);
            toast.success("Stock movements exported");
        } catch (error) {
            try {
                throwApiError(error);
            } catch (apiError: any) {
                toast.error(apiError?.message || "Failed to export stock movements");
            }
        } finally {
            setExporting(false);
        }
    };

    const { data: historyResp, isLoading: historyLoading } = useAssetStockHistory(
        isPooled ? assetId : null,
        { limit: PAGE_LIMIT, page }
    );
    const adjustment = useManualStockAdjustment();

    const allMovements: any[] = historyResp?.data?.movements || [];
    const total: number = historyResp?.data?.total ?? allMovements.length;
    const totalPages: number = historyResp?.data?.total_pages ?? 1;

    const movements = useMemo(() => {
        if (filter === "ALL") return allMovements;
        return allMovements.filter((m) => m.movement_type === filter);
    }, [allMovements, filter]);

    if (!isPooled) return null;

    return (
        <>
            <Card className="border-primary/20 shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/20 py-4 px-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <CardTitle className="font-mono text-sm sm:text-base font-bold uppercase tracking-tight">
                                    Stock Movement History
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pooled inventory audit ledger — every in/out, write-off, and
                                    manual adjustment.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={!familyId || exporting}
                                title={
                                    familyId
                                        ? "Export the full family ledger as CSV"
                                        : "Family metadata missing — cannot export"
                                }
                                className="gap-1.5"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    {exporting ? "Exporting..." : "Export"}
                                </span>
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setDialogOpen(true)}
                                className="gap-1.5"
                            >
                                <Boxes className="h-4 w-4" />
                                <span className="hidden sm:inline">Manual Adjustment</span>
                                <span className="sm:hidden">Adjust</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* Filter chips */}
                <div className="border-b border-border/60 px-4 sm:px-6 py-3 overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {FILTER_CHIPS.map((chip) => {
                            const isActive = filter === chip.key;
                            return (
                                <button
                                    key={chip.key}
                                    type="button"
                                    onClick={() => setFilter(chip.key)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wide transition-colors border",
                                        isActive
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                                    )}
                                >
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <CardContent className="p-3 sm:p-6">
                    {historyLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                            ))}
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="py-12 text-center">
                            <Boxes className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {filter === "ALL"
                                    ? "No stock movements recorded yet"
                                    : `No ${FILTER_CHIPS.find((c) => c.key === filter)?.label.toLowerCase()} movements`}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60">
                            {movements.map((m: any) => {
                                const { date, time } = formatDateTime(m.created_at);
                                const isExpanded = expandedRowId === m.id;
                                const hasExtraDetail =
                                    m.note ||
                                    m.linked_entity_id ||
                                    m.write_off_reason ||
                                    m.outbound_ad_hoc_reason;

                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setExpandedRowId(isExpanded ? null : m.id)}
                                        className="w-full text-left py-3 px-1 hover:bg-muted/30 transition-colors rounded-sm"
                                    >
                                        {/* Primary row — stacked on mobile, inline on md+ */}
                                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                                            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-mono shrink-0",
                                                        MOVEMENT_STYLES[m.movement_type] ||
                                                            MOVEMENT_STYLES.ADJUSTMENT
                                                    )}
                                                >
                                                    {MOVEMENT_LABELS[m.movement_type] ??
                                                        m.movement_type}
                                                </Badge>
                                                <span
                                                    className={cn(
                                                        "font-mono font-bold text-base shrink-0",
                                                        m.delta > 0
                                                            ? "text-green-600"
                                                            : "text-red-600"
                                                    )}
                                                >
                                                    {m.delta > 0 ? "+" : ""}
                                                    {m.delta}
                                                </span>
                                                {m.write_off_reason && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] font-mono text-muted-foreground"
                                                    >
                                                        {m.write_off_reason}
                                                    </Badge>
                                                )}
                                                {m.outbound_ad_hoc_reason && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] font-mono text-muted-foreground"
                                                    >
                                                        {m.outbound_ad_hoc_reason.replace("_", " ")}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Note (preview, truncated on desktop, hidden when expanded) */}
                                            {m.note && !isExpanded && (
                                                <p className="text-xs sm:text-sm text-muted-foreground flex-1 line-clamp-2 md:line-clamp-1 md:truncate">
                                                    {m.note}
                                                </p>
                                            )}

                                            {/* Meta — always right-aligned on desktop, stacked on mobile */}
                                            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground md:ml-auto shrink-0">
                                                {m.linked_entity_type && (
                                                    <span className="hidden sm:inline">
                                                        {m.linked_entity_type}
                                                    </span>
                                                )}
                                                <span className="truncate max-w-[100px] sm:max-w-none">
                                                    {m.created_by_name || "—"}
                                                </span>
                                                <span className="shrink-0">{date}</span>
                                                <span className="shrink-0 hidden sm:inline">
                                                    {time}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expanded detail */}
                                        {isExpanded && hasExtraDetail && (
                                            <div className="mt-3 pl-1 space-y-2 text-xs sm:text-sm">
                                                {m.note && (
                                                    <div>
                                                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                                            Note
                                                        </p>
                                                        <p className="whitespace-pre-wrap text-foreground/90">
                                                            {m.note}
                                                        </p>
                                                    </div>
                                                )}
                                                {m.linked_entity_id && (
                                                    <div>
                                                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                                            Linked {m.linked_entity_type}
                                                        </p>
                                                        <p className="font-mono text-xs">
                                                            {m.linked_entity_id}
                                                        </p>
                                                    </div>
                                                )}
                                                <p className="text-[11px] font-mono text-muted-foreground">
                                                    {date} · {time}
                                                </p>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </CardContent>

                {/* Pagination — shown only when more than one page exists */}
                {!historyLoading && totalPages > 1 && (
                    <div className="border-t border-border/60 px-4 sm:px-6 py-3 flex items-center justify-between">
                        <p className="text-xs font-mono text-muted-foreground">
                            Page {page} of {totalPages} · {total} total
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="gap-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Prev</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="gap-1"
                            >
                                <span className="hidden sm:inline">Next</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <ManualAdjustmentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                assetId={assetId}
                assetName={assetName}
                isPending={adjustment.isPending}
                onSubmit={(payload) =>
                    adjustment.mutate(payload, {
                        onSuccess: () => {
                            const sign = payload.delta > 0 ? "+" : "";
                            toast.success(`Stock adjusted by ${sign}${payload.delta}`);
                            setDialogOpen(false);
                        },
                        onError: (e: unknown) =>
                            toast.error((e as Error).message || "Adjustment failed"),
                    })
                }
            />
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Manual Adjustment dialog
//
// Stock IN  → ADJUSTMENT (positive delta).
// Stock OUT → operator picks a primary reason:
//   "Correction" → ADJUSTMENT (negative delta), no link required.
//   "Used for an order or pickup" → OUTBOUND_AD_HOC. Sub-reason picked from
//     {Replacement, Install consumption, Repurposed, Other}. For non-OTHER
//     sub-reasons, a linked order/SP is REQUIRED. For OTHER, the linked
//     entity is OPTIONAL — if not picked, three structured fields appear
//     (Requested by, Venue, Details) and are required, then serialised into
//     the saved note.
//
// WRITE_OFF is intentionally not selectable. Settlement WRITE_OFFs come from
// the inbound-scan flow which has the booking context to auto-link them.
// ─────────────────────────────────────────────────────────────────────────

function ManualAdjustmentDialog({
    open,
    onOpenChange,
    assetId,
    assetName,
    isPending,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    assetId: string;
    assetName: string;
    isPending: boolean;
    onSubmit: (payload: ManualStockAdjustmentPayload) => void;
}) {
    const [direction, setDirection] = useState<Direction>("IN");
    const [qtyRaw, setQtyRaw] = useState<string>("");
    const [primaryReason, setPrimaryReason] = useState<PrimaryOutReason>("CORRECTION");
    const [adHocReason, setAdHocReason] = useState<OutboundAdHocReason | null>(null);
    const [linkedEntity, setLinkedEntity] = useState<{
        type: "ORDER" | "SELF_PICKUP";
        id: string;
        readableId: string;
        companyName?: string | null;
    } | null>(null);
    const [requesterName, setRequesterName] = useState("");
    const [venue, setVenue] = useState("");
    const [details, setDetails] = useState("");
    const [note, setNote] = useState<string>("");

    const resetAll = () => {
        setDirection("IN");
        setQtyRaw("");
        setPrimaryReason("CORRECTION");
        setAdHocReason(null);
        setLinkedEntity(null);
        setRequesterName("");
        setVenue("");
        setDetails("");
        setNote("");
    };

    const handleOpenChange = (v: boolean) => {
        if (!v) resetAll();
        onOpenChange(v);
    };

    const qty = qtyRaw === "" ? 0 : Math.max(0, parseInt(qtyRaw, 10) || 0);
    const signedDelta = direction === "IN" ? qty : -qty;

    const incrementBy = (n: number) => {
        const current = qtyRaw === "" ? 0 : parseInt(qtyRaw, 10) || 0;
        setQtyRaw(String(Math.max(0, current + n)));
    };

    // Whether the structured 3-field fallback is currently showing (and required)
    const showStructuredFields =
        direction === "OUT" &&
        primaryReason === "USED_FOR" &&
        adHocReason === "OTHER" &&
        !linkedEntity;

    // Whether the freeform note field is currently in scope
    const showFreeformNote =
        direction === "IN" ||
        (direction === "OUT" && primaryReason === "CORRECTION") ||
        (direction === "OUT" &&
            primaryReason === "USED_FOR" &&
            (linkedEntity || (adHocReason && adHocReason !== "OTHER")));

    // Whether linked-entity picker is required by validation rules
    const linkedEntityRequired =
        direction === "OUT" &&
        primaryReason === "USED_FOR" &&
        adHocReason !== null &&
        adHocReason !== "OTHER";

    const canSubmit = (() => {
        if (qty === 0 || isPending) return false;

        if (direction === "IN") {
            return note.trim().length > 0;
        }

        // OUT direction
        if (primaryReason === "CORRECTION") {
            return note.trim().length > 0;
        }

        // USED_FOR
        if (!adHocReason) return false;
        if (linkedEntityRequired && !linkedEntity) return false;

        if (adHocReason === "OTHER" && !linkedEntity) {
            // Need all three structured fields
            return (
                requesterName.trim().length > 0 &&
                venue.trim().length > 0 &&
                details.trim().length > 0
            );
        }

        return note.trim().length > 0;
    })();

    const handleConfirm = () => {
        if (!canSubmit) return;

        // CORRECTION + IN both map to ADJUSTMENT
        if (direction === "IN" || primaryReason === "CORRECTION") {
            onSubmit({
                asset_id: assetId,
                delta: signedDelta,
                reason_note: note.trim(),
                movement_type: "ADJUSTMENT",
            });
            return;
        }

        // USED_FOR → OUTBOUND_AD_HOC
        const reasonNote =
            adHocReason === "OTHER" && !linkedEntity
                ? `Requested by: ${requesterName.trim()}\nVenue: ${venue.trim()}\nDetails: ${details.trim()}`
                : note.trim();

        onSubmit({
            asset_id: assetId,
            delta: signedDelta,
            reason_note: reasonNote,
            movement_type: "OUTBOUND_AD_HOC",
            outbound_ad_hoc_reason: adHocReason ?? "OTHER",
            ...(linkedEntity
                ? {
                      linked_entity_type: linkedEntity.type,
                      linked_entity_id: linkedEntity.id,
                  }
                : {}),
        });
    };

    const summaryLine = (() => {
        if (qty === 0) return null;
        const sign = direction === "IN" ? "+" : "-";
        let type: string;
        if (direction === "IN") type = "Correction";
        else if (primaryReason === "CORRECTION") type = "Correction";
        else if (linkedEntity)
            type = `Used for · ${adHocReason ?? ""} · ${linkedEntity.readableId}`;
        else if (adHocReason) type = `Used for · ${adHocReason}`;
        else type = "Used for · ?";
        return `${sign}${qty} units — ${type}`;
    })();

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg w-[calc(100vw-1rem)] sm:w-full max-h-[calc(100vh-2rem)] flex flex-col p-4 sm:p-6 gap-0">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="text-base sm:text-lg">
                        Manual Stock Adjustment
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                        {assetName}
                    </p>
                </DialogHeader>

                <div className="space-y-5 py-4 overflow-y-auto flex-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
                    {/* Direction toggle */}
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wide">
                            Direction
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setDirection("IN")}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-md border-2 px-4 py-3 transition-all text-sm font-semibold",
                                    direction === "IN"
                                        ? "border-green-500 bg-green-50 text-green-700"
                                        : "border-border bg-background text-muted-foreground hover:border-green-300 hover:text-foreground"
                                )}
                            >
                                <ArrowUpCircle className="h-5 w-5" />
                                Stock In
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDirection("OUT");
                                    setPrimaryReason("CORRECTION");
                                    setAdHocReason(null);
                                }}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-md border-2 px-4 py-3 transition-all text-sm font-semibold",
                                    direction === "OUT"
                                        ? "border-red-500 bg-red-50 text-red-700"
                                        : "border-border bg-background text-muted-foreground hover:border-red-300 hover:text-foreground"
                                )}
                            >
                                <ArrowDownCircle className="h-5 w-5" />
                                Stock Out
                            </button>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="adjust-qty"
                            className="text-xs font-mono uppercase tracking-wide"
                        >
                            Quantity
                        </Label>
                        <Input
                            id="adjust-qty"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={qtyRaw}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                    setQtyRaw("");
                                    return;
                                }
                                const n = parseInt(raw, 10);
                                if (Number.isFinite(n) && n >= 0) {
                                    setQtyRaw(String(n));
                                }
                            }}
                            placeholder="0"
                            className="text-2xl font-mono font-bold h-14 text-center"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                            {[1, 5, 10].map((n) => (
                                <button
                                    key={`plus-${n}`}
                                    type="button"
                                    onClick={() => incrementBy(n)}
                                    className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono font-semibold hover:border-primary/40 hover:bg-muted transition-colors"
                                >
                                    <Plus className="h-3 w-3" />
                                    {n}
                                </button>
                            ))}
                            {[1, 5, 10].map((n) => (
                                <button
                                    key={`minus-${n}`}
                                    type="button"
                                    onClick={() => incrementBy(-n)}
                                    className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono font-semibold hover:border-primary/40 hover:bg-muted transition-colors"
                                >
                                    <Minus className="h-3 w-3" />
                                    {n}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setQtyRaw("")}
                                className="ml-auto text-[11px] font-mono text-muted-foreground hover:text-foreground underline decoration-dotted"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Primary reason — only for OUT direction */}
                    {direction === "OUT" && (
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wide">
                                Why?
                            </Label>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPrimaryReason("CORRECTION");
                                        setAdHocReason(null);
                                        setLinkedEntity(null);
                                    }}
                                    className={cn(
                                        "text-left rounded-md border px-3 py-2.5 transition-all",
                                        primaryReason === "CORRECTION"
                                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                            : "border-border bg-background hover:border-primary/40"
                                    )}
                                >
                                    <p className="text-sm font-semibold">
                                        Correction (count was wrong)
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Inventory recount, no order context
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPrimaryReason("USED_FOR");
                                        if (!adHocReason) setAdHocReason("REPLACEMENT");
                                    }}
                                    className={cn(
                                        "text-left rounded-md border px-3 py-2.5 transition-all",
                                        primaryReason === "USED_FOR"
                                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                            : "border-border bg-background hover:border-primary/40"
                                    )}
                                >
                                    <p className="text-sm font-semibold">
                                        Used for an order or pickup
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Unit consumed for a specific job — replacement, install,
                                        etc.
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sub-reason for "Used for" */}
                    {direction === "OUT" && primaryReason === "USED_FOR" && (
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wide">
                                Sub-reason
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {AD_HOC_SUB_REASONS.map((opt) => {
                                    const isActive = adHocReason === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setAdHocReason(opt.value)}
                                            className={cn(
                                                "text-left rounded-md border px-3 py-2 transition-all",
                                                isActive
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                                    : "border-border bg-background hover:border-primary/40"
                                            )}
                                        >
                                            <p className="text-sm font-semibold">{opt.label}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {opt.hint}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Linked entity picker — shown for "Used for" path. Always
                        available. Required for non-OTHER sub-reasons; optional
                        but allowed for OTHER. */}
                    {direction === "OUT" &&
                        primaryReason === "USED_FOR" &&
                        adHocReason !== null && (
                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase tracking-wide">
                                    Linked order or pickup
                                    {linkedEntityRequired && (
                                        <span className="text-destructive ml-1">*</span>
                                    )}
                                </Label>
                                <LinkedEntityCombobox
                                    value={
                                        linkedEntity
                                            ? { type: linkedEntity.type, id: linkedEntity.id }
                                            : null
                                    }
                                    selectedLabel={
                                        linkedEntity
                                            ? `${linkedEntity.readableId}${linkedEntity.companyName ? ` · ${linkedEntity.companyName}` : ""}`
                                            : null
                                    }
                                    onChange={(entity) =>
                                        setLinkedEntity(
                                            entity
                                                ? {
                                                      type: entity.type,
                                                      id: entity.id,
                                                      readableId: entity.readableId,
                                                      companyName: entity.companyName,
                                                  }
                                                : null
                                        )
                                    }
                                    placeholder={
                                        adHocReason === "OTHER"
                                            ? "Optional — link an order/pickup"
                                            : "Required — search and select"
                                    }
                                />
                            </div>
                        )}

                    {/* Structured fallback for OTHER + no linked entity */}
                    {showStructuredFields && (
                        <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-50/40 p-3">
                            <p className="text-[11px] font-mono uppercase tracking-wide text-amber-700">
                                No order/pickup — record the context
                            </p>
                            <div className="space-y-1">
                                <Label htmlFor="ad-hoc-requester" className="text-xs font-mono">
                                    Requested by <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="ad-hoc-requester"
                                    value={requesterName}
                                    onChange={(e) => setRequesterName(e.target.value)}
                                    placeholder="Name (e.g. Alice from Marketing)"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="ad-hoc-venue" className="text-xs font-mono">
                                    Venue <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="ad-hoc-venue"
                                    value={venue}
                                    onChange={(e) => setVenue(e.target.value)}
                                    placeholder="Where is the unit going?"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="ad-hoc-details" className="text-xs font-mono">
                                    Details <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="ad-hoc-details"
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Why is this unit being removed?"
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    {/* Freeform note (default path) */}
                    {showFreeformNote && (
                        <div className="space-y-2">
                            <Label
                                htmlFor="adjust-note"
                                className="text-xs font-mono uppercase tracking-wide"
                            >
                                Note <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="adjust-note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={
                                    direction === "IN"
                                        ? "Why is stock being added? (e.g. recount found 5 extra units)"
                                        : primaryReason === "CORRECTION"
                                          ? "Context for the correction (e.g. recount found 1 less)"
                                          : "Anything else worth noting"
                                }
                                rows={3}
                            />
                        </div>
                    )}

                    {/* Summary */}
                    {summaryLine && (
                        <div
                            className={cn(
                                "rounded-md border px-3 py-2 text-sm font-mono",
                                direction === "IN"
                                    ? "border-green-500/40 bg-green-50/50 text-green-800"
                                    : "border-red-500/40 bg-red-50/50 text-red-800"
                            )}
                        >
                            {summaryLine}
                        </div>
                    )}
                </div>

                <DialogFooter className="shrink-0 pt-4 border-t border-border/40 flex-col-reverse sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={!canSubmit}
                        onClick={handleConfirm}
                        className={cn(
                            "w-full sm:w-auto",
                            direction === "IN"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-red-600 hover:bg-red-700"
                        )}
                    >
                        {isPending
                            ? "Adjusting…"
                            : `Confirm ${direction === "IN" ? "Stock In" : "Stock Out"}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
