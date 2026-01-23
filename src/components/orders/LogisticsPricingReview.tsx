'use client'

/**
 * Logistics Pricing Review Component
 * For PRICING_REVIEW status - Logistics adds line items and submits to Admin
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { DollarSign, Plus, Send } from 'lucide-react'
import { OrderLineItemsList } from './OrderLineItemsList'
import { AddCatalogLineItemModal } from './AddCatalogLineItemModal'
import { VehicleUpgradeSelector } from './VehicleUpgradeSelector'
import { useSubmitForApproval } from '@/hooks/use-orders'
import type { OrderPricing, VehicleType } from '@/types/hybrid-pricing'

interface LogisticsPricingReviewProps {
  orderId: string
  order: any
}

export function LogisticsPricingReview({ orderId, order }: LogisticsPricingReviewProps) {
  const submitForApproval = useSubmitForApproval()
  const [addCatalogOpen, setAddCatalogOpen] = useState(false)
  const [vehicleChanged, setVehicleChanged] = useState(false)

  const pricing = order?.pricing as OrderPricing | undefined

  const handleVehicleChange = (vehicle: VehicleType, reason: string) => {
    // TODO: Call API to update vehicle type
    // For now, just track that it changed
    setVehicleChanged(true)
    toast.info(`Vehicle upgrade to ${vehicle} noted. Will update pricing.`)
  }

  const handleSubmit = async () => {
    try {
      await submitForApproval.mutateAsync(orderId)
      toast.success('Order submitted to Admin for approval!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit order')
    }
  }

  const hasRebrandRequests = order?.items?.some((item: any) => item.isReskinRequest)

  return (
    <div className="space-y-6">
      {/* Rebrand Notice */}
      {hasRebrandRequests && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              🔄 This order includes rebrand requests
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Admin will process rebrand requests and add costs during their approval step.
              You can add service line items as needed before submitting.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pricing Breakdown (Read-only for Logistics) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pricing && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">
                  Base Operations ({pricing.base_operations?.volume?.toFixed(1) || 0} m³)
                </span>
                <span className="font-mono">{pricing.base_operations?.total?.toFixed(2) || 0} AED</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">
                  Transport ({pricing.transport?.emirate}, {pricing.transport?.trip_type === 'ROUND_TRIP' ? 'Round-trip' : 'One-way'})
                </span>
                <span className="font-mono">{pricing.transport?.final_rate?.toFixed(2) || 0} AED</span>
              </div>
              <div className="border-t border-border my-2"></div>
              <div className="flex justify-between font-semibold">
                <span>Estimated Subtotal</span>
                <span className="font-mono">{pricing.logistics_subtotal?.toFixed(2) || 0} AED</span>
              </div>
              <p className="text-xs text-muted-foreground">
                + Platform margin ({pricing.margin?.percent || 25}%) will be added by Admin
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Type (Optional Upgrade) */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleUpgradeSelector
            currentVehicle={order?.transportVehicleType || order?.transport_vehicle_type || 'STANDARD'}
            onVehicleChange={handleVehicleChange}
          />
        </CardContent>
      </Card>

      {/* Service Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Service Line Items</CardTitle>
            <Button size="sm" onClick={() => setAddCatalogOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <OrderLineItemsList orderId={orderId} canManage={true} />
          <p className="text-xs text-muted-foreground mt-3">
            Add services like assembly, equipment rental, etc. Custom charges will be handled by Admin.
          </p>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={submitForApproval.isPending}
          size="lg"
          className="gap-2"
        >
          <Send className="h-5 w-5" />
          {submitForApproval.isPending ? 'Submitting...' : 'Submit for Admin Approval'}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        After submission, Admin will review pricing, process any rebrand requests, and send the final quote to the client.
      </p>

      {/* Modals */}
      <AddCatalogLineItemModal
        open={addCatalogOpen}
        onOpenChange={setAddCatalogOpen}
        orderId={orderId}
      />
    </div>
  )
}
