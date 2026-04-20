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
import { cn } from "@/lib/utils";

type Props = {
    assetId: string;
    assetName: string;
    stockMode?: string | null;
};

type MovementFilter = "ALL" | "INBOUND" | "OUTBOUND" | "WRITE_OFF" | "ADJUSTMENT";
type Direction = "IN" | "OUT";
type WriteOffReason = "CONSUMED" | "LOST" | "DAMAGED" | "OTHER";

const MOVEMENT_STYLES: Record<string, string> = {
    OUTBOUND: "bg-red-50 text-red-700 border-red-200",
    INBOUND: "bg-green-50 text-green-700 border-green-200",
    WRITE_OFF: "bg-amber-50 text-amber-700 border-amber-200",
    ADJUSTMENT: "bg-blue-50 text-blue-700 border-blue-200",
    INITIAL: "bg-slate-50 text-slate-700 border-slate-200",
};

const FILTER_CHIPS: { key: MovementFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "INBOUND", label: "In" },
    { key: "OUTBOUND", label: "Out" },
    { key: "WRITE_OFF", label: "Write-offs" },
    { key: "ADJUSTMENT", label: "Adjustments" },
];

const REASON_OPTIONS: { value: WriteOffReason | "CORRECTION"; label: string; hint: string }[] = [
    { value: "CORRECTION", label: "Correction", hint: "Clerical fix — counts didn't match reality" },
    { value: "CONSUMED", label: "Consumed", hint: "Used up, not returning to stock" },
    { value: "LOST", label: "Lost", hint: "Can't locate, treat as gone" },
    { value: "DAMAGED", label: "Damaged", hint: "Beyond repair, written off" },
    { value: "OTHER", label: "Other", hint: "Some other non-clerical reason" },
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

export function AssetStockSection({ assetId, assetName, stockMode }: Props) {
    const isPooled = stockMode === "POOLED";
    const [dialogOpen, setDialogOpen] = useState(false);
    const [filter, setFilter] = useState<MovementFilter>("ALL");
    const [page, setPage] = useState(1);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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
                                    Pooled inventory audit ledger — every in/out, write-off, and manual adjustment.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled
                                title="Export coming soon"
                                className="gap-1.5"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Export</span>
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
                                <div
                                    key={i}
                                    className="h-16 bg-muted animate-pulse rounded-md"
                                />
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
                                    m.note || m.linked_entity_id || m.write_off_reason;

                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() =>
                                            setExpandedRowId(isExpanded ? null : m.id)
                                        }
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
                                                    {m.movement_type}
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
                                                <span className="shrink-0">
                                                    {date}
                                                </span>
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
                                onClick={() =>
                                    setPage((p) => Math.min(totalPages, p + 1))
                                }
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
// Manual Adjustment dialog — direction toggle + quick-add chips + reason
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
    const [reason, setReason] = useState<WriteOffReason | "CORRECTION">("CORRECTION");
    const [note, setNote] = useState<string>("");

    // Reset when dialog closes
    const handleOpenChange = (v: boolean) => {
        if (!v) {
            setDirection("IN");
            setQtyRaw("");
            setReason("CORRECTION");
            setNote("");
        }
        onOpenChange(v);
    };

    const qty = qtyRaw === "" ? 0 : Math.max(0, parseInt(qtyRaw, 10) || 0);
    const signedDelta = direction === "IN" ? qty : -qty;

    const incrementBy = (n: number) => {
        const current = qtyRaw === "" ? 0 : parseInt(qtyRaw, 10) || 0;
        setQtyRaw(String(Math.max(0, current + n)));
    };

    const canSubmit = qty > 0 && note.trim().length > 0 && !isPending;

    const handleConfirm = () => {
        if (!canSubmit) return;
        // When direction is OUT and reason is a write-off reason (not CORRECTION),
        // record as WRITE_OFF. Otherwise ADJUSTMENT.
        const isWriteOff = direction === "OUT" && reason !== "CORRECTION";
        const payload: ManualStockAdjustmentPayload = {
            asset_id: assetId,
            delta: signedDelta,
            reason_note: note.trim(),
            movement_type: isWriteOff ? "WRITE_OFF" : "ADJUSTMENT",
            ...(isWriteOff ? { write_off_reason: reason as WriteOffReason } : {}),
        };
        onSubmit(payload);
    };

    const summaryLine = (() => {
        if (qty === 0) return null;
        const sign = direction === "IN" ? "+" : "-";
        const type =
            direction === "OUT" && reason !== "CORRECTION"
                ? `WRITE_OFF · ${reason}`
                : "ADJUSTMENT";
        return `${sign}${qty} units — ${type}`;
    })();

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Manual Stock Adjustment</DialogTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                        {assetName}
                    </p>
                </DialogHeader>

                <div className="space-y-5 py-2">
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
                                    // Default to CORRECTION so the user is pushed to pick.
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
                                // Allow empty string (so user can backspace to blank)
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

                    {/* Reason — only for OUT direction */}
                    {direction === "OUT" && (
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wide">
                                Reason
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {REASON_OPTIONS.map((opt) => {
                                    const isActive = reason === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setReason(opt.value)}
                                            className={cn(
                                                "text-left rounded-md border px-3 py-2 transition-all",
                                                isActive
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                                    : "border-border bg-background hover:border-primary/40"
                                            )}
                                        >
                                            <p className="text-sm font-semibold">
                                                {opt.label}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {opt.hint}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Note */}
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
                                    : "Context for the write-off or correction"
                            }
                            rows={3}
                        />
                    </div>

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

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={!canSubmit}
                        onClick={handleConfirm}
                        className={cn(
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
