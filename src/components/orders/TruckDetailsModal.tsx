"use client";

/**
 * Truck Details Modal
 * Reusable component for adding/editing delivery and pickup truck details
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export interface TruckDetailsData {
  truckPlate: string;
  driverName: string;
  driverContact: string;
  truckSize: string;
  tailgateRequired: boolean;
  manpower: number;
  notes: string;
}

interface TruckDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "delivery" | "pickup";
  initialData?: Partial<TruckDetailsData>;
  onSave: (data: TruckDetailsData) => void;
}

const DEFAULT_DATA: TruckDetailsData = {
  truckPlate: "",
  driverName: "",
  driverContact: "",
  truckSize: "",
  tailgateRequired: false,
  manpower: 0,
  notes: "",
};

export function TruckDetailsModal({
  open,
  onOpenChange,
  type,
  onSave,
}: TruckDetailsModalProps) {
  const [formData, setFormData] = useState<TruckDetailsData>(DEFAULT_DATA);

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (open) {
      setFormData({
        ...DEFAULT_DATA,
      });
    }
  }, [open]);

  const handleChange = (field: keyof TruckDetailsData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);

    // api should be called. 
  };

  const titlePrefix = type === "delivery" ? "DELIVERY" : "PICKUP";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">
            {titlePrefix} TRUCK DETAILS
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Enter the {type} truck and driver information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="font-mono text-xs">TRUCK PLATE *</Label>
            <Input
              placeholder="Enter truck plate number"
              value={formData.truckPlate}
              onChange={(e) => handleChange("truckPlate", e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs">DRIVER NAME *</Label>
            <Input
              placeholder="Enter driver name"
              value={formData.driverName}
              onChange={(e) => handleChange("driverName", e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs">DRIVER CONTACT *</Label>
            <Input
              placeholder="Enter driver phone number"
              value={formData.driverContact}
              onChange={(e) => handleChange("driverContact", e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs">TRUCK SIZE</Label>
            <select
              className="w-full border rounded px-3 py-2 bg-background font-mono text-sm"
              value={formData.truckSize}
              onChange={(e) => handleChange("truckSize", e.target.value)}
            >
              <option value="">Select truck size...</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="Extra Large">Extra Large</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${type}-tailgate`}
              checked={formData.tailgateRequired}
              onCheckedChange={(checked) =>
                handleChange("tailgateRequired", !!checked)
              }
            />
            <Label
              htmlFor={`${type}-tailgate`}
              className="font-mono text-xs cursor-pointer"
            >
              TAILGATE REQUIRED
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs">MANPOWER</Label>
            <Input
              type="number"
              min="0"
              placeholder="Number of workers"
              value={formData.manpower || ""}
              onChange={(e) =>
                handleChange("manpower", parseInt(e.target.value) || 0)
              }
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs">NOTES</Label>
            <Textarea
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="font-mono text-sm"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-mono text-xs"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !formData.truckPlate ||
              !formData.driverName ||
              !formData.driverContact
            }
            className="font-mono text-xs"
          >
            SAVE DETAILS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
