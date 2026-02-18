"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { EditInboundRequestDialog } from "@/components/assets/edit-inbound-request-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderApprovalRequestSubmitBtn } from "@/components/orders/OrderApprovalRequestSubmitBtn";
import { useCancelInboundRequest } from "@/hooks/use-inbound-requests";
import type { InboundRequestDetails, InboundRequestStatus } from "@/types/inbound-request";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Loader2, Package, Pencil, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<InboundRequestStatus, string> = {
    PRICING_REVIEW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    PENDING_APPROVAL: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    QUOTED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    CONFIRMED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    DECLINED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STATUS_LABELS: Record<InboundRequestStatus, string> = {
    PRICING_REVIEW: "Pricing Review",
    PENDING_APPROVAL: "Pending Approval",
    QUOTED: "Quoted",
    CONFIRMED: "Confirmed",
    DECLINED: "Declined",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

const STATUS_DESCRIPTIONS: Record<InboundRequestStatus, string> = {
    PRICING_REVIEW: "We are reviewing the pricing for your request.",
    PENDING_APPROVAL: "Waiting for final approval.",
    QUOTED: "Quote has been sent and is awaiting confirmation.",
    CONFIRMED: "Order has been confirmed.",
    DECLINED: "Order has been declined.",
    COMPLETED: "All items have been successfully processed.",
    CANCELLED: "This request has been cancelled.",
};

interface RequestHeaderProps {
    requestId: string;
    status: InboundRequestStatus;
    createdAt: string;
    request: InboundRequestDetails;
    onRefresh: () => void;
}

export function RequestHeader({
    requestId,
    status,
    createdAt,
    request,
    onRefresh,
}: RequestHeaderProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const cancelMutation = useCancelInboundRequest();
    const router = useRouter();

    const [cancelNote, setCancelNote] = useState("");

    async function handleCancel() {
        if (!cancelNote.trim()) {
            toast.error("Please provide a reason for cancellation");
            return;
        }

        try {
            await cancelMutation.mutateAsync({ id: requestId, note: cancelNote });
            toast.success("Request cancelled successfully");
            onRefresh();
            router.push("/inbound-request");
            setCancelDialogOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to cancel request");
        }
    }

    return (
        <>
            {/* Breadcrumb with Action Buttons */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8"
            >
                <Link
                    href="/inbound-request"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-mono"
                >
                    <ArrowLeft className="w-4 h-4" />
                    New Stock Requests
                </Link>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setEditDialogOpen(true)}
                        className="font-mono gap-2"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setCancelDialogOpen(true)}
                        className="font-mono gap-2"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancel
                    </Button>
                </div>
            </motion.div>

            {/* Status Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden relative">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <Badge
                                    variant="outline"
                                    className={`font-mono text-xs border ${STATUS_COLORS[status] || "bg-muted border-muted"}`}
                                >
                                    {status.replace(/_/g, " ")}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                    New stock request ID: {request.inbound_request_id}
                                </span>
                            </div>
                            <h1 className="text-4xl font-bold mb-2">
                                {STATUS_LABELS[status] || "Request Status"}
                            </h1>
                            <p className="text-muted-foreground leading-relaxed">
                                {STATUS_DESCRIPTIONS[status] || "Processing your request."}
                            </p>
                        </div>

                        <div
                            className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 ${
                                status === "COMPLETED"
                                    ? "bg-emerald-500"
                                    : status === "CANCELLED"
                                      ? "bg-destructive"
                                      : status === "DECLINED"
                                        ? "bg-rose-500"
                                        : status === "CONFIRMED"
                                          ? "bg-indigo-500"
                                          : status === "QUOTED"
                                            ? "bg-purple-500"
                                            : status === "PENDING_APPROVAL"
                                              ? "bg-blue-500"
                                              : status === "PRICING_REVIEW"
                                                ? "bg-yellow-500"
                                                : "bg-gray-500"
                            }`}
                        >
                            <Package className="w-10 h-10 text-white" />
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Edit Dialog */}
            <EditInboundRequestDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={() => {
                    setEditDialogOpen(false);
                    onRefresh();
                }}
                request={request}
            />

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-mono">Cancel Request?</AlertDialogTitle>
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            You can not revert a request once it's cancelled.
                        </span>
                        <div className="py-4">
                            <div className="space-y-2">
                                <Label htmlFor="cancel-note">
                                    Note <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="cancel-note"
                                    placeholder="Reason for cancellation..."
                                    value={cancelNote}
                                    onChange={(e) => setCancelNote(e.target.value)}
                                    className="resize-none"
                                />
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-mono" onClick={() => setCancelNote("")}>
                            Keep Request
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleCancel();
                            }}
                            disabled={cancelMutation.isPending || !cancelNote.trim()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono"
                        >
                            {cancelMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                "Yes, Cancel Request"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
