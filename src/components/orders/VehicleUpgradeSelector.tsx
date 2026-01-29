"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUpdateOrderVehicle } from "@/hooks/use-orders";
import type { VehicleType } from "@/types/hybrid-pricing";

interface VehicleUpgradeSelectorProps {
    orderId: string;
    currentVehicle: VehicleType;
    onVehicleChange?: (vehicle: VehicleType, reason: string) => void;
    onSuccess?: () => void;
}

export function VehicleUpgradeSelector({
    orderId,
    currentVehicle,
    onVehicleChange,
    onSuccess,
}: VehicleUpgradeSelectorProps) {
    const updateVehicle = useUpdateOrderVehicle();
    const [changeVehicle, setChangeVehicle] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(currentVehicle);
    const [reason, setReason] = useState("");

    const handleSaveVehicleChange = async () => {
        if (!reason.trim() || reason.trim().length < 10) {
            toast.error("Please provide a reason (min 10 characters)");
            return;
        }

        try {
            await updateVehicle.mutateAsync({
                orderId,
                vehicleType: selectedVehicle,
                reason: reason.trim(),
            });
            toast.success("Vehicle type updated and transport rate recalculated");
            if (onVehicleChange) {
                onVehicleChange(selectedVehicle, reason.trim());
            }
            // Reset form and call onSuccess to refetch order data
            setChangeVehicle(false);
            setReason("");
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to update vehicle");
        }
    };

    return (
        <div className="space-y-3 p-4 border border-border rounded-md">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Vehicle Type</Label>
                <Badge variant={changeVehicle ? "default" : "outline"}>
                    {changeVehicle ? "Upgrading" : currentVehicle}
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
                        <Select
                            value={selectedVehicle}
                            onValueChange={(v: VehicleType) => setSelectedVehicle(v)}
                        >
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
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Large items require 7-ton truck, volume exceeds standard capacity..."
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Required when upgrading vehicle type
                        </p>
                    </div>

                    {selectedVehicle !== currentVehicle && reason.trim().length >= 10 && (
                        <Button
                            onClick={handleSaveVehicleChange}
                            disabled={updateVehicle.isPending}
                            className="w-full"
                        >
                            {updateVehicle.isPending
                                ? "Updating..."
                                : "Update Vehicle & Recalculate Rate"}
                        </Button>
                    )}

                    {selectedVehicle !== currentVehicle && (
                        <div className="bg-blue-50 border border-blue-300 rounded-md p-3">
                            <p className="text-xs text-blue-500">
                                ℹ️ System will automatically look up the new transport rate for
                                upgraded vehicle type.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
