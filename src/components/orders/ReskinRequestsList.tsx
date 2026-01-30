"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useListReskinRequests } from "@/hooks/use-reskin-requests";
import { CompleteFabricationModal } from "./CompleteFabricationModal";
import { CancelReskinModal } from "./CancelReskinModal";
import { ReskinItemCard } from "./ReskinItemCard";
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

    const handleMarkComplete = (reskin: any) => {
        setSelectedReskin(reskin);
        setCompleteModalOpen(true);
    };

    const handleCancel = (reskin: any) => {
        setSelectedReskin(reskin);
        setCancelModalOpen(true);
    };

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
                    <ReskinItemCard
                        key={reskin.id}
                        reskin={reskin}
                        status="pending"
                        onMarkComplete={handleMarkComplete}
                        onCancel={handleCancel}
                        orderStatus={orderStatus}
                    />
                ))}

                {completedReskins.map((reskin: any) => (
                    <ReskinItemCard
                        key={reskin.id}
                        reskin={reskin}
                        status="complete"
                        orderStatus={orderStatus}
                    />
                ))}

                {cancelledReskins.map((reskin: any) => (
                    <ReskinItemCard
                        key={reskin.id}
                        reskin={reskin}
                        status="cancelled"
                        orderStatus={orderStatus}
                    />
                ))}
            </div>

            {/* Modals */}
            {selectedReskin && (
                <>
                    <CompleteFabricationModal
                        open={completeModalOpen}
                        onOpenChange={setCompleteModalOpen}
                        reskinId={selectedReskin.id}
                        orderId={orderId}
                        originalAssetName={selectedReskin.originalAssetName}
                        targetBrandName={selectedReskin.targetBrandCustom || "Brand"}
                    />
                    <CancelReskinModal
                        open={cancelModalOpen}
                        onOpenChange={setCancelModalOpen}
                        reskinId={selectedReskin.id}
                        orderId={orderId}
                        originalAssetName={selectedReskin.originalAssetName}
                        targetBrandName={selectedReskin.targetBrandCustom || "Brand"}
                        costAmount={0} // TODO: Get from line items
                    />
                </>
            )}
        </div>
    );
}
