'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { VehicleType } from '@/types/hybrid-pricing'

interface VehicleUpgradeSelectorProps {
  currentVehicle: VehicleType
  onVehicleChange: (vehicle: VehicleType, reason: string) => void
}

export function VehicleUpgradeSelector({ currentVehicle, onVehicleChange }: VehicleUpgradeSelectorProps) {
  const [changeVehicle, setChangeVehicle] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(currentVehicle)
  const [reason, setReason] = useState('')

  const handleVehicleSelect = (vehicle: VehicleType) => {
    setSelectedVehicle(vehicle)
    if (vehicle !== currentVehicle && reason.trim()) {
      onVehicleChange(vehicle, reason.trim())
    }
  }

  const handleReasonChange = (value: string) => {
    setReason(value)
    if (selectedVehicle !== currentVehicle && value.trim()) {
      onVehicleChange(selectedVehicle, value.trim())
    }
  }

  return (
    <div className="space-y-3 p-4 border border-border rounded-md">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Vehicle Type</Label>
        <Badge variant={changeVehicle ? 'default' : 'outline'}>
          {changeVehicle ? 'Upgrading' : currentVehicle}
        </Badge>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="changeVehicle"
          checked={changeVehicle}
          onCheckedChange={(checked) => setChangeVehicle(checked as boolean)}
        />
        <Label htmlFor="changeVehicle" className="cursor-pointer font-normal">
          Change vehicle type
        </Label>
      </div>

      {changeVehicle && (
        <div className="space-y-3 pl-6 border-l-2 border-primary">
          <div>
            <Label>New Vehicle Type</Label>
            <Select value={selectedVehicle} onValueChange={(v: VehicleType) => handleVehicleSelect(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">Standard Vehicle</SelectItem>
                <SelectItem value="7_TON">7-Ton Truck</SelectItem>
                <SelectItem value="10_TON">10-Ton Truck</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              Reason for Change <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder="e.g., Large items require 7-ton truck, volume exceeds standard capacity..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required when upgrading vehicle type
            </p>
          </div>

          {selectedVehicle !== currentVehicle && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                ℹ️ System will automatically look up the new transport rate for upgraded vehicle type.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
