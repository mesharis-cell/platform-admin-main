"use client";

/**
 * Inbound Request Details Page
 * Displays full details of a single inbound request with items
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useInboundRequest, inboundRequestKeys } from "@/hooks/use-inbound-requests";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, DollarSign, Plus } from "lucide-react";
import { RequestHeader } from "@/components/inbound-request/request-header";
import { RequestInfoCard } from "@/components/inbound-request/request-info-card";
import { RequestItemsList } from "@/components/inbound-request/request-items-list";
import { RequestPricingCard } from "@/components/inbound-request/request-pricing-card";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import type { InboundRequestStatus } from "@/types/inbound-request";

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
  const [addCatalogOpen, setAddCatalogOpen] = useState(false);
  const [addCustomOpen, setAddCustomOpen] = useState(false);

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
            <RequestItemsList items={request.items} />

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
                <OrderLineItemsList targetId={request.id} canManage purposeType="INBOUND_REQUEST" />
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
}