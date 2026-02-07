"use client";

/**
 * Inbound Request Details Page
 * Displays full details of a single inbound request with items
 */

import { RequestHeader } from "@/components/inbound-request/request-header";
import { RequestInfoCard } from "@/components/inbound-request/request-info-card";
import { RequestItemsList } from "@/components/inbound-request/request-items-list";
import { RequestPricingCard } from "@/components/inbound-request/request-pricing-card";
import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { OrderApprovalRequestSubmitBtn } from "@/components/orders/OrderApprovalRequestSubmitBtn";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { PendingApprovalSection } from "@/components/inbound-request/pending-approval-section";
import { CompleteInboundDialog } from "@/components/inbound-request/complete-inbound-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { inboundRequestKeys, useInboundRequest } from "@/hooks/use-inbound-requests";
import type { InboundRequestStatus } from "@/types/inbound-request";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, DollarSign, Plus, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

export default function InboundRequestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useInboundRequest(id);

  const request = data?.data;
  const pricing = request?.request_pricing;
  const [addCatalogOpen, setAddCatalogOpen] = useState(false);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
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
            The inbound request you&apos;re looking for doesn&apos;t exist or
            has been removed.
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
        <RequestPricingCard finalTotal={request.request_pricing.final_total} />

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
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">Mark inbound request completed</h3>
                    <p className="text-sm text-muted-foreground">Create assets for each item and generate invoice</p>
                  </div>
                </div>
                <Button onClick={() => setCompleteDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Mark as Completed
                </Button>
              </div>
            )}

            <RequestItemsList items={request.items} />

            {request.request_status === "PENDING_APPROVAL" ? (
              <PendingApprovalSection
                request={request}
                requestId={request.id}
                onRefresh={handleRefresh}
              />
            ) : (
              <>
                {/* Service Line Items */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Service Line Items
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAddCatalogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Catalog Service
                        </Button>
                        <Button size="sm" onClick={() => setAddCustomOpen(true)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Custom Charge
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <OrderLineItemsList
                      targetId={request.id}
                      canManage
                      purposeType="INBOUND_REQUEST"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pricing Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!pricing && (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-sm font-semibold text-destructive mb-2">
                          ⚠️ Pricing calculation failed
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          This order may be missing required configuration (e.g., transport
                          rate for the emirate, trip type, or vehicle type).
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Please contact your Platform Admin to add the missing transport
                          rate configuration.
                        </p>
                      </div>
                    )}
                    {pricing && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Base Operations</span>
                          <span className="font-mono">
                            {pricing.base_ops_total || 0} AED
                          </span>
                        </div>
                        {pricing.line_items?.catalog_total ? (
                          <div className="flex justify-between p-2 bg-muted/30 rounded">
                            <span className="text-muted-foreground">
                              Service Line Item
                            </span>
                            <span className="font-mono">
                              {pricing.line_items?.catalog_total?.toFixed(2) || 0} AED
                            </span>
                          </div>
                        ) : null}
                        <div className="border-t border-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span>Estimated Subtotal</span>
                          <span className="font-mono">
                            {pricing.logistics_sub_total || 0} AED
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

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
              </>
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
        <AddCatalogLineItemModal
          open={addCatalogOpen}
          onOpenChange={setAddCatalogOpen}
          targetId={request.id}
          purposeType="INBOUND_REQUEST"
        />
        <AddCustomLineItemModal
          open={addCustomOpen}
          onOpenChange={setAddCustomOpen}
          targetId={request.id}
          purposeType="INBOUND_REQUEST"
        />
        <CompleteInboundDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          requestId={request.id}
          companyId={request.company.id}
          platformId={request.platform_id}
          onSuccess={handleRefresh}
        />
      </div>
    </div>
  );
}