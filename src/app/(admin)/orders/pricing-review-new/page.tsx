'use client'

/**
 * NEW Pricing Review Interface (Logistics)
 * Component-based pricing: Base Ops + Transport + Services
 * All orders submitted to Admin (no direct to client)
 */

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, DollarSign, Package } from 'lucide-react'
import { useAdminOrders } from '@/hooks/use-orders'
import { useSubmitForApproval } from '@/hooks/use-orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin-header'

export default function PricingReviewNewPage() {
  const { data, isLoading } = useAdminOrders({ order_status: 'PRICING_REVIEW' })
  const submitForApproval = useSubmitForApproval()

  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const handleSubmitForApproval = async (order: any) => {
    try {
      await submitForApproval.mutateAsync(order.id)
      toast.success('Order submitted to Admin for approval')
      setSelectedOrder(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit order')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        icon={DollarSign}
        title="PRICING REVIEW QUEUE (NEW SYSTEM)"
        description="Logistics Review · Component Pricing · Submit to Admin"
        stats={data ? { label: 'PENDING REVIEW', value: data?.data?.length } : undefined}
        actions={
          <Link href="/orders">
            <Button variant="outline" className="gap-2 font-mono">
              <ChevronLeft className="h-4 w-4" />
              BACK TO ORDERS
            </Button>
          </Link>
        }
      />

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data || data?.data?.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders for Review</h3>
              <p className="text-sm text-muted-foreground">
                There are currently no orders waiting for pricing review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data?.data?.map((order: any) => (
              <Card key={order.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-mono">{order?.order_id}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{order?.company?.name}</p>
                    </div>
                    <Badge>{order?.order_status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* NEW PRICING STRUCTURE */}
                  {order.pricing && (
                    <div className="border border-border rounded-md p-4 bg-muted/50">
                      <h4 className="font-semibold text-sm mb-3">Pricing Breakdown</h4>
                      
                      {/* Base Operations */}
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          Base Operations ({order.pricing.base_operations.volume}m³)
                        </span>
                        <span className="font-mono">{order.pricing.base_operations.total.toFixed(2)} AED</span>
                      </div>
                      
                      {/* Transport */}
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          Transport ({order.pricing.transport.emirate}, {order.pricing.transport.trip_type})
                        </span>
                        <span className="font-mono">{order.pricing.transport.final_rate.toFixed(2)} AED</span>
                      </div>

                      <div className="border-t border-border my-2"></div>

                      {/* Subtotal + Margin */}
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Logistics Subtotal</span>
                        <span className="font-mono font-semibold">{order.pricing.logistics_subtotal.toFixed(2)} AED</span>
                      </div>
                      
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Margin ({order.pricing.margin.percent}%)</span>
                        <span className="font-mono">{order.pricing.margin.amount.toFixed(2)} AED</span>
                      </div>

                      <div className="border-t border-border my-2"></div>

                      {/* Final */}
                      <div className="flex justify-between">
                        <span className="font-semibold">Estimated Total</span>
                        <span className="text-xl font-bold font-mono text-primary">
                          {order.pricing.final_total.toFixed(2)} AED
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rebrand Requests */}
                  {order.items?.some((item: any) => item.is_reskin_request) && (
                    <div className="border border-amber-500/30 rounded-md p-4 bg-amber-500/5">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-1">
                        🔄 REBRAND REQUESTED
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This order includes rebranding work. Admin will process rebrand requests and add costs during approval.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => handleSubmitForApproval(order)}
                      disabled={submitForApproval.isPending}
                      className="font-mono"
                    >
                      Submit for Admin Approval
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link href={`/orders/${order.order_id}`}>View Full Details</Link>
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Note: You can add service line items and upgrade vehicle type in the full order view before submitting.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
