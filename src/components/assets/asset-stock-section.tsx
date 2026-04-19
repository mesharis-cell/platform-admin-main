"use client";

import { useState } from "react";
import { Boxes, TrendingUp } from "lucide-react";
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
} from "@/hooks/use-stock-movements";

type Props = {
    assetId: string;
    assetName: string;
    stockMode?: string | null;
};

export function AssetStockSection({ assetId, assetName, stockMode }: Props) {
    const isPooled = stockMode === "POOLED";
    const [dialogOpen, setDialogOpen] = useState(false);
    const [delta, setDelta] = useState<number>(0);
    const [note, setNote] = useState<string>("");

    const { data: historyResp, isLoading: historyLoading } = useAssetStockHistory(
        isPooled ? assetId : null,
        { limit: 20 }
    );
    const history: any[] = historyResp?.data?.movements || [];
    const adjustment = useManualStockAdjustment();

    if (!isPooled) return null;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 font-mono text-sm">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Stock Movement History
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDialogOpen(true)}
                        >
                            <Boxes className="h-4 w-4 mr-1.5" />
                            Manual Adjustment
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {historyLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-8 bg-muted animate-pulse rounded"
                                />
                            ))}
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            No stock movements recorded yet
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {history.map((m: any) => (
                                <div
                                    key={m.id}
                                    className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className={
                                                m.movement_type === "OUTBOUND"
                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                    : m.movement_type === "INBOUND"
                                                      ? "bg-green-50 text-green-700 border-green-200"
                                                      : m.movement_type === "WRITE_OFF"
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                            }
                                        >
                                            {m.movement_type}
                                        </Badge>
                                        <span
                                            className={`font-mono font-bold ${m.delta > 0 ? "text-green-600" : "text-red-600"}`}
                                        >
                                            {m.delta > 0 ? "+" : ""}
                                            {m.delta}
                                        </span>
                                        {m.write_off_reason && (
                                            <span className="text-xs text-muted-foreground">
                                                ({m.write_off_reason})
                                            </span>
                                        )}
                                        {m.note && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[240px]">
                                                — {m.note}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {m.linked_entity_id && (
                                            <span className="font-mono">
                                                {m.linked_entity_type}
                                            </span>
                                        )}
                                        <span>{m.created_by_name}</span>
                                        <span>
                                            {new Date(m.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manual Stock Adjustment — {assetName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Quantity Change (+/-)</Label>
                            <Input
                                type="number"
                                value={delta}
                                onChange={(e) => setDelta(Number(e.target.value))}
                                placeholder="e.g. -20 or +50"
                            />
                            <p className="text-xs text-muted-foreground">
                                Positive to add stock, negative to remove.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Reason (required)</Label>
                            <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Why is this adjustment being made?"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={
                                delta === 0 || !note.trim() || adjustment.isPending
                            }
                            onClick={() => {
                                adjustment.mutate(
                                    {
                                        asset_id: assetId,
                                        delta,
                                        reason_note: note,
                                    },
                                    {
                                        onSuccess: () => {
                                            toast.success(
                                                `Stock adjusted by ${delta > 0 ? "+" : ""}${delta}`
                                            );
                                            setDialogOpen(false);
                                            setDelta(0);
                                            setNote("");
                                        },
                                        onError: (e: unknown) =>
                                            toast.error((e as Error).message),
                                    }
                                );
                            }}
                        >
                            {adjustment.isPending ? "Adjusting..." : "Confirm Adjustment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
