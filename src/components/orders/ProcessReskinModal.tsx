'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useProcessReskinRequest } from '@/hooks/use-reskin-requests'

interface ProcessReskinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderItemId: string
  originalAssetName: string
  targetBrandName: string
  clientNotes: string
}

export function ProcessReskinModal({
  open,
  onOpenChange,
  orderId,
  orderItemId,
  originalAssetName,
  targetBrandName,
  clientNotes,
}: ProcessReskinModalProps) {
  const processReskin = useProcessReskinRequest(orderId)
  const [cost, setCost] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const handleProcess = async () => {
    const costNum = parseFloat(cost)
    if (isNaN(costNum) || costNum <= 0) {
      toast.error('Please enter a valid cost')
      return
    }

    try {
      await processReskin.mutateAsync({
        orderItemId,
        data: {
          cost: costNum,
          adminNotes: adminNotes || undefined,
        },
      })
      toast.success('Reskin request processed and cost line item added')
      onOpenChange(false)
      setCost('')
      setAdminNotes('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to process reskin request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Rebrand Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Original Asset:</span>{' '}
              <span className="font-semibold">{originalAssetName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Target Brand:</span>{' '}
              <span className="font-semibold">{targetBrandName}</span>
            </div>
          </div>

          <div>
            <Label>Client Instructions</Label>
            <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm">
              {clientNotes}
            </div>
          </div>

          <div className="border-t border-border my-4"></div>

          <div>
            <Label htmlFor="cost">
              Rebrand Cost to Client (AED) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="1500.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter final amount including your margin
            </p>
          </div>

          <div>
            <Label htmlFor="adminNotes">Internal Notes (Optional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g., Using ABC Fabricators, est. 5 days"
              rows={3}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              ℹ️ This will create a reskin tracking record and add "{originalAssetName} Rebrand" line item for {cost || '___'} AED
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processReskin.isPending}>
            Cancel
          </Button>
          <Button onClick={handleProcess} disabled={processReskin.isPending}>
            {processReskin.isPending ? 'Processing...' : 'Process & Add to Quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
