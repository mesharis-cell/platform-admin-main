"use client";

/**
 * RL-032 self-pickup arm — the retention write-off on a PERMANENT placement.
 *
 * This arm is mandatory, not symmetry for its own sake. A self-pickup has no
 * `RETURN_IN_TRANSIT` status and therefore no partial-visit edge, and the order
 * arm is structurally unreachable from a pickup: there is no
 * `related_self_pickup_id` on `service_requests` and RL-008 forbids adding one.
 * Without it, a permanent pickup where nine of ten units come back and the tenth
 * is never coming has exactly one move — complete the return now and write off a
 * unit nobody has decided about.
 *
 * Scope is PERMANENT placements in `AWAITING_RETURN` whose return has not been
 * completed. Ordinary self-pickup returns are explicitly out of scope: they
 * reach `AWAITING_RETURN` through the existing expected-return path, they work
 * as they are, and settling a shortfall there belongs in the return completion.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    useRecordSelfPickupRetentionWriteOff,
    useSelfPickupReturnProgress,
    type ReturnProgressAsset,
} from "@/hooks/use-write-off-decision";
import {
    WriteOffDecisionDialog,
    outstandingOf,
    type OutstandingLine,
} from "@/components/settlement/WriteOffDecisionDialog";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";

interface RetentionWriteOffCardProps {
    selfPickupId: string;
    selfPickupHumanId: string;
    status: string;
    isPermanentPlacement: boolean;
    /** `self_pickup_items` rows straight off the detail response. */
    items: any[];
    onChanged: () => void;
}

export function RetentionWriteOffCard({
    selfPickupId,
    selfPickupHumanId,
    status,
    isPermanentPlacement,
    items,
    onChanged,
}: RetentionWriteOffCardProps) {
    const { user } = useToken();
    // RL-032/RL-028 — the route sits under the EXISTING self_pickups:edit_details
    // key; there is no `self_pickups:update` key on the platform and none is
    // added. Gate on exactly what the route requires.
    const canAct = hasPermission(user, ADMIN_ACTION_PERMISSIONS.selfPickupsEditDetails);
    const [open, setOpen] = useState(false);
    const recordWriteOff = useRecordSelfPickupRetentionWriteOff();

    const statusEligible = isPermanentPlacement && status === "AWAITING_RETURN";
    const eligible = canAct && statusEligible;
    const { data: progress } = useSelfPickupReturnProgress(selfPickupId, statusEligible);

    /**
     * Unlike the order arm, everything needed here is on the pickup itself:
     * `self_pickup_items` carries the line id and `settled_quantity`, and the
     * return-progress read supplies `stock_mode` plus the quantity actually
     * scanned back. `expected_quantity` on a self-pickup is
     * `COALESCE(scanned_quantity, quantity)` — the quantity that actually LEFT
     * the warehouse — so a line skipped at handover expects nothing back and can
     * never be written off against.
     */
    const outstandingLines: OutstandingLine[] = useMemo(() => {
        const progressByAsset = new Map<string, ReturnProgressAsset>(
            (progress?.assets ?? []).map((asset) => [asset.asset_id, asset])
        );
        return (items ?? [])
            .map((item) => {
                const scan = progressByAsset.get(item.asset_id);
                const stockMode = scan?.stock_mode ?? item.asset?.stock_mode;
                if (!stockMode) return null;
                const expected = Number(
                    scan?.required_quantity ?? item.scanned_quantity ?? item.quantity ?? 0
                );
                return {
                    line_id: item.id,
                    asset_id: item.asset_id,
                    asset_name: item.asset_name,
                    stock_mode: stockMode as "SERIALIZED" | "POOLED",
                    expected,
                    returned: Number(scan?.scanned_quantity ?? 0),
                    settled: Number(item.settled_quantity ?? 0),
                } as OutstandingLine;
            })
            .filter((line): line is OutstandingLine => line !== null)
            .filter((line) => outstandingOf(line) > 0);
    }, [items, progress]);

    if (!isPermanentPlacement) return null;

    const blockedReason = !statusEligible
        ? `A retention write-off applies to a permanent placement awaiting return whose return has not been completed. Current status: ${status.replace(/_/g, " ")}.`
        : null;

    return (
        <>
            <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <PackageX className="h-4 w-4 text-amber-600" />
                        Outstanding units
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                        If part of this placement is coming back on a later visit, do nothing —
                        leave the return open and complete it when the rest arrives. If units will{" "}
                        <strong>not</strong> come back at all, record the decision here so the next
                        return completion can close the pickup and credit everything that did.
                    </p>
                    {statusEligible && outstandingLines.length === 0 ? (
                        <p className="font-mono text-xs text-muted-foreground">
                            Nothing outstanding — every line is returned or already settled.
                        </p>
                    ) : null}
                    <Button variant="outline" disabled={!eligible} onClick={() => setOpen(true)}>
                        <PackageX className="mr-1 h-4 w-4" />
                        Record write-off decision
                    </Button>
                    {blockedReason && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                            {blockedReason}
                        </p>
                    )}
                </CardContent>
            </Card>

            <WriteOffDecisionDialog
                open={open}
                onOpenChange={setOpen}
                parentLabel={selfPickupHumanId}
                lines={outstandingLines}
                isPending={recordWriteOff.isPending}
                blockedReason={blockedReason}
                onConfirm={async (payload) => {
                    try {
                        await recordWriteOff.mutateAsync({ selfPickupId, payload });
                        setOpen(false);
                        toast.success("Write-off decision recorded");
                        onChanged();
                    } catch (error: any) {
                        toast.error(error?.message || "Failed to record the write-off decision");
                    }
                }}
            />
        </>
    );
}
