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
import { useAddTruckDetails } from "@/hooks/use-orders";
import { useListVehicleTypes } from "@/hooks/use-vehicle-types";
import { removeUnderScore } from "@/lib/utils/helper";
import { TruckDetailsData } from "@/types";

interface TruckDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "delivery" | "pickup";
  orderId: string;
  initialData?: Partial<TruckDetailsData>;
  onSave?: (data: TruckDetailsData) => void;
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
  orderId,
  initialData,
  onSave,
}: TruckDetailsModalProps) {

  const [formData, setFormData] = useState<TruckDetailsData>(DEFAULT_DATA);
  const addTruckDetails = useAddTruckDetails();
  const { data: vehicleTypes } = useListVehicleTypes();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          ...DEFAULT_DATA,
          ...initialData,
        });
      } else {
        setFormData(DEFAULT_DATA);
      }
    }
  }, [open, initialData]);

  const handleChange = (field: keyof TruckDetailsData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      if (!orderId) {
        toast.error("Missing Order ID");
        return;
      }

      await addTruckDetails.mutateAsync({
        orderId,
        truckType: type === "delivery" ? "DELIVERY" : "PICKUP",
        payload: formData,
      });

      toast.success(`${type === "delivery" ? "Delivery" : "Pickup"} truck details saved`);
      onOpenChange(false);
      onSave?.(formData);
    } catch (error: any) {
      toast.error(error.message || "Failed to save truck details");
    }
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
              {vehicleTypes?.data?.map((vehicleType) => (
                <option key={vehicleType.id} value={vehicleType.vehicle_size}>
                  {vehicleType.name} ({removeUnderScore(vehicleType.vehicle_size)})
                </option>
              ))}
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
            disabled={addTruckDetails.isPending}
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !formData.truckPlate ||
              !formData.driverName ||
              !formData.driverContact ||
              addTruckDetails.isPending
            }
            className="font-mono text-xs"
          >
            {addTruckDetails.isPending ? "SAVING..." : "SAVE DETAILS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
