'use client'

/**
 * Pricing Configuration Settings
 * Manage warehouse operations rate per company or platform default
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { AdminHeader } from '@/components/admin-header'
import {
  useGetPlatformConfig,
  useSetPlatformDefault,
} from '@/hooks/use-pricing-config'

export default function PricingConfigPage() {
  const { data: platformConfig, isLoading } = useGetPlatformConfig()
  const setPlatformDefault = useSetPlatformDefault()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newRate, setNewRate] = useState<string>('')

  const handleEditPlatform = () => {
    setNewRate(platformConfig?.warehouseOpsRate?.toString() || '25.20')
    setEditDialogOpen(true)
  }

  const handleSavePlatform = async () => {
    const rateNum = parseFloat(newRate)
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error('Please enter a valid rate')
      return
    }

    try {
      await setPlatformDefault.mutateAsync({ warehouseOpsRate: rateNum })
      toast.success('Platform default rate updated successfully')
      setEditDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rate')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        icon={Settings}
        title="PRICING CONFIGURATION"
        description="Warehouse Operations Rate"
      />

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Platform Default Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Warehouse Operations Rate (AED per m³)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="text-2xl font-bold font-mono">
                      {platformConfig?.warehouseOpsRate?.toFixed(2) || '25.20'} AED/m³
                    </div>
                    <Button onClick={handleEditPlatform} variant="outline">
                      Edit Rate
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    This rate covers: Picking (6.00) + Handling Out (9.60) + Handling In (9.60)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Overrides Section - TODO */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Company-Specific Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Company-specific rate overrides can be configured here.
            </p>
            {/* TODO: List company overrides with add/edit/delete */}
          </CardContent>
        </Card>
      </div>

      {/* Edit Platform Default Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Platform Default Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rate">
                Warehouse Operations Rate (AED per m³) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="25.20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Covers picking, handling out, and handling in operations
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={setPlatformDefault.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSavePlatform} disabled={setPlatformDefault.isPending}>
              {setPlatformDefault.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
