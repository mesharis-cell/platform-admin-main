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
import { Card, CardContent } from "../ui/card";
import { useListVehicleTypes } from "@/hooks/use-vehicle-types";

interface VehicleUpgradeSelectorProps {
    orderId: string;
    currentVehicle: string;
    onSuccess?: () => void;
}

export function VehicleUpgradeSelector({
    orderId,
    currentVehicle,
    onSuccess,
}: VehicleUpgradeSelectorProps) {
    const updateVehicle = useUpdateOrderVehicle();
    const { data: vehicleTypes } = useListVehicleTypes();
    const [changeVehicle, setChangeVehicle] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<string>(currentVehicle);
    const [reason, setReason] = useState("");

    const vehicleType = vehicleTypes?.data?.find((v) => v.id === currentVehicle);

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
                    {changeVehicle ? "Upgrading" : vehicleType?.name}
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
                            onValueChange={(v: string) => setSelectedVehicle(v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {vehicleTypes?.data?.map((vehicleType) => (
                                    <SelectItem key={vehicleType.id} value={vehicleType.id}>
                                        {vehicleType.name} ({vehicleType.vehicle_size} m³)
                                    </SelectItem>
                                ))}
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

                    <Button
                        onClick={handleSaveVehicleChange}
                        disabled={
                            updateVehicle.isPending ||
                            selectedVehicle === currentVehicle ||
                            reason.trim().length < 10
                        }
                        className="w-full"
                    >
                        {updateVehicle.isPending
                            ? "Updating..."
                            : "Update Vehicle & Recalculate Rate"}
                    </Button>

                    {selectedVehicle !== currentVehicle && (
                        <Card className="border-2 border-primary/20 bg-primary/5">
                            <CardContent className="pt-6">
                                <p className="text-xs">
                                    ℹ️ System will automatically look up the new transport rate for
                                    upgraded vehicle type.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
