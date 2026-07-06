"use client";

/**
 * Inbound Request Details Page
 * Displays full details of a single inbound request with items
 */

import { AssetsFromInbound } from "@/components/inbound-request/assets-from-inbound";
import { CompleteInboundDialog } from "@/components/inbound-request/complete-inbound-dialog";
import { PendingApprovalSection } from "@/components/inbound-request/pending-approval-section";
import { RequestHeader } from "@/components/inbound-request/request-header";
import { RequestInfoCard } from "@/components/inbound-request/request-info-card";
import { RequestItemsList } from "@/components/inbound-request/request-items-list";
import { RequestPricingCard } from "@/components/inbound-request/request-pricing-card";
import { OrderApprovalRequestSubmitBtn } from "@/components/orders/OrderApprovalRequestSubmitBtn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { inboundRequestKeys, useInboundRequest } from "@/hooks/use-inbound-requests";
import type { InboundRequestStatus } from "@/types/inbound-request";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { WorkflowRequestsCard } from "@/components/shared/workflow-requests-card";

export default function InboundRequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data, isLoading, isFetching } = useInboundRequest(id);

    const request = data?.data;
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

    function handleRefresh() {
        queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: inboundRequestKeys.lists() });
    }

    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
                <div className="max-w-7xl mx-auto px-8 py-10">
                    {/* Breadcrumb Skeleton */}
                    <Skeleton className="h-4 w-48 mb-8" />

                    {/* Hero Skeleton */}
                    <Skeleton className="h-40 w-full mb-8 rounded-xl" />

                    {/* Pricing Skeleton */}
                    <Skeleton className="h-24 w-full mb-6 rounded-xl" />

                    {/* Content Grid Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <Skeleton className="h-64 w-full rounded-xl" />
                            <Skeleton className="h-64 w-full rounded-xl" />
                        </div>
                        <div>
                            <Skeleton className="h-96 w-full rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error/Not Found State
    if (!request) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center p-8">
                <Card className="max-w-md w-full p-10 text-center border-border/50 bg-card/50">
                    <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Request Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        The new stock request you&apos;re looking for doesn&apos;t exist or has been
                        removed.
                    </p>
                    <Button
                        onClick={() => router.push("/inbound-request")}
                        variant="outline"
                        className="gap-2 font-mono"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Requests
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background relative">
            {/* Subtle grid pattern */}
            <div
                className="fixed inset-0 opacity-[0.015] pointer-events-none"
                style={{
                    backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
                {/* Header with Status and Actions */}
                <RequestHeader
                    requestId={request.id}
                    status={request.request_status as InboundRequestStatus}
                    createdAt={request.created_at}
                    request={request}
                    onRefresh={handleRefresh}
                />

                {/* Pricing Card */}
                <RequestPricingCard
                    finalTotal={request.request_pricing.final_total}
                    vatPercent={Number(
                        request.request_pricing?.vat?.percent ??
                            request.request_pricing?.totals?.vat_percent ??
                            0
                    )}
                    vatAmount={Number(
                        request.request_pricing?.vat?.amount ??
                            request.request_pricing?.totals?.vat_amount ??
                            0
                    )}
                />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Items */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Completion Banner */}
                        {request.request_status === "CONFIRMED" && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
                                            Mark new stock request completed
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Create assets for each item and generate invoice
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setCompleteDialogOpen(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    Mark as Completed
                                </Button>
                            </div>
                        )}

                        <RequestItemsList items={request.items} />
                        {request.request_status === "COMPLETED" && (
                            <AssetsFromInbound items={request.items} />
                        )}

                        <WorkflowRequestsCard
                            entityType="INBOUND_REQUEST"
                            entityId={request.id}
                            title="Workflows"
                        />

                        <EntityAttachmentsCard
                            entityType="INBOUND_REQUEST"
                            entityId={request.id}
                            title="Supporting Documents"
                        />

                        {/* PricingLedger for every status — editable through QUOTED,
                            read-only lenses beyond (self-gated inside the ledger).
                            Approve slot + Return-to-Logistics surface only at
                            PENDING_APPROVAL. */}
                        <PendingApprovalSection
                            request={request}
                            requestId={request.id}
                            onRefresh={handleRefresh}
                            isRefetching={isFetching}
                        />

                        {/* PRICING_REVIEW submit is a status transition (logistics →
                            admin), not a pricing action — kept beside the ledger. */}
                        {request.request_status === "PRICING_REVIEW" && (
                            <div className="mt-4">
                                <OrderApprovalRequestSubmitBtn
                                    orderId={request.id}
                                    type="INBOUND_REQUEST"
                                    isVisible={true}
                                    onSubmitSuccess={() => {
                                        handleRefresh();
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right Column - Request Info */}
                    <div>
                        <RequestInfoCard
                            company={request.company}
                            requester={request.requester}
                            incomingAt={request.incoming_at}
                            note={request.note}
                            createdAt={request.created_at}
                            updatedAt={request.updated_at}
                        />
                    </div>
                </div>

                {/* Modals */}
                <CompleteInboundDialog
                    open={completeDialogOpen}
                    onOpenChange={setCompleteDialogOpen}
                    requestId={request.id}
                    companyId={request.company.id}
                    platformId={request.platform_id}
                    items={request.items}
                    onSuccess={handleRefresh}
                />
            </div>
        </div>
    );
}
