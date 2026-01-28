"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useListReskinRequests } from "@/hooks/use-reskin-requests";
import { ProcessReskinModal } from "./ProcessReskinModal";
import { CompleteFabricationModal } from "./CompleteFabricationModal";
import { CancelReskinModal } from "./CancelReskinModal";
import type { ReskinRequest } from "@/types/hybrid-pricing";

interface ReskinRequestsListProps {
    orderId: string;
    orderStatus: string;
}

export function ReskinRequestsList({ orderId, orderStatus }: ReskinRequestsListProps) {
    const { data: reskinRequests, isLoading } = useListReskinRequests(orderId);

    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedReskin, setSelectedReskin] = useState<any>(null);

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">Loading reskin requests...</p>;
    }

    if (!reskinRequests || reskinRequests.length === 0) {
        return null;
    }

    const pendingReskins = reskinRequests.filter((r: ReskinRequest) => r.status === "pending");
    const completedReskins = reskinRequests.filter((r: ReskinRequest) => r.status === "complete");
    const cancelledReskins = reskinRequests.filter((r: ReskinRequest) => r.status === "cancelled");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">
                    Rebrand Requests ({reskinRequests.length})
                </h3>
                {pendingReskins.length > 0 && (
                    <Badge variant="secondary">{pendingReskins.length} Pending</Badge>
                )}
            </div>

            <div className="space-y-3">
                {pendingReskins.map((reskin: any) => (
                    <div
                        key={reskin.id}
                        className="border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10 rounded-md p-4"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-amber-600" />
                                <span className="font-semibold text-sm">
                                    {reskin.originalAssetName} →{" "}
                                    {reskin.targetBrandCustom || "Brand"}
                                </span>
                            </div>
                            <Badge className="bg-amber-500">Pending</Badge>
                        </div>

                        <div className="text-sm space-y-1 mb-3">
                            <p className="text-muted-foreground">Client Notes:</p>
                            <p className="text-sm">{reskin.clientNotes}</p>
                        </div>


                        {/* {orderStatus === "AWAITING_FABRICATION" && ( */}
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => {
                                    setSelectedReskin(reskin);
                                    setCompleteModalOpen(true);
                                }}
                            >
                                Mark Complete
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedReskin(reskin);
                                    setCancelModalOpen(true);
                                }}
                            >
                                Cancel Reskin
                            </Button>
                        </div>
                        {/* )} */}
                    </div>
                ))}

                {completedReskins.map((reskin: any) => (
                    <div
                        key={reskin.id}
                        className="border border-green-500/30 bg-green-50/50 dark:bg-green-950/10 rounded-md p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-sm">
                                {reskin.originalAssetName} → {reskin.newAssetName}
                            </span>
                            <Badge className="bg-green-500 ml-auto">Complete</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Completed: {new Date(reskin.completedAt).toLocaleDateString()}
                        </p>
                    </div>
                ))}

                {cancelledReskins.map((reskin: any) => (
                    <div
                        key={reskin.id}
                        className="border border-border bg-muted/30 rounded-md p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm text-muted-foreground line-through">
                                {reskin.originalAssetName}
                            </span>
                            <Badge variant="outline" className="ml-auto">
                                Cancelled
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Reason: {reskin.cancellationReason}
                        </p>
                    </div>
                ))}
            </div>

            {/* Modals */}
            {selectedReskin && (
                <>
                    <CompleteFabricationModal
                        open={completeModalOpen}
                        onOpenChange={setCompleteModalOpen}
                        reskinId={selectedReskin.id}
                        originalAssetName={selectedReskin.originalAssetName}
                        targetBrandName={selectedReskin.targetBrandCustom || "Brand"}
                    />
                    <CancelReskinModal
                        open={cancelModalOpen}
                        onOpenChange={setCancelModalOpen}
                        reskinId={selectedReskin.id}
                        originalAssetName={selectedReskin.originalAssetName}
                        targetBrandName={selectedReskin.targetBrandCustom || "Brand"}
                        costAmount={0} // TODO: Get from line items
                    />
                </>
            )}
        </div>
    );
}
