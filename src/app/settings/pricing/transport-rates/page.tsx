"use client";

/**
 * Transport Rates Management
 * Manage location/trip/vehicle-based transport pricing
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Truck, Plus, Pencil, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import {
    useListTransportRates,
    useCreateTransportRate,
    useUpdateTransportRate,
    useDeleteTransportRate,
} from "@/hooks/use-transport-rates";
import { useCities } from "@/hooks/use-cities";
import { useListVehicleTypes } from "@/hooks/use-vehicle-types";
import type { TransportRate, TripType } from "@/types/hybrid-pricing";

export default function TransportRatesPage() {
    const { data, isLoading } = useListTransportRates({});
    const { data: citiesData } = useCities();
    const { data: vehicleTypesData } = useListVehicleTypes({ include_inactive: true });
    const createRate = useCreateTransportRate();
    const updateRate = useUpdateTransportRate();
    const deleteRate = useDeleteTransportRate();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedRate, setSelectedRate] = useState<TransportRate | null>(null);

    const [formData, setFormData] = useState({
        city_id: "",
        area: "",
        trip_type: "ROUND_TRIP" as TripType,
        vehicle_type_id: "",
        rate: "",
    });

    const handleCreate = async () => {
        const rateNum = parseFloat(formData.rate);
        if (!formData.city_id || !formData.vehicle_type_id || isNaN(rateNum) || rateNum < 0) {
            toast.error("Please fill all required fields with valid values");
            return;
        }

        try {
            await createRate.mutateAsync({
                city_id: formData.city_id,
                area: formData.area || null,
                trip_type: formData.trip_type,
                vehicle_type_id: formData.vehicle_type_id,
                rate: rateNum,
            });
            toast.success("Transport rate created successfully");
            setCreateDialogOpen(false);
            setFormData({
                city_id: "",
                area: "",
                trip_type: "ROUND_TRIP",
                vehicle_type_id: "",
                rate: "",
            });
        } catch (error: any) {
            toast.error(error.message || "Failed to create rate");
        }
    };

    const handleEdit = async () => {
        if (!selectedRate) return;
        const rateNum = parseFloat(formData.rate);
        if (isNaN(rateNum) || rateNum < 0) {
            toast.error("Please enter a valid rate");
            return;
        }

        try {
            await updateRate.mutateAsync({
                id: selectedRate.id,
                data: { rate: rateNum },
            });
            toast.success("Transport rate updated successfully");
            setEditDialogOpen(false);
            setSelectedRate(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to update rate");
        }
    };

    const handleDelete = async (rate: TransportRate) => {
        if (
            !confirm(
                `Deactivate transport rate for ${rate.city.name}${rate.area ? ` (${rate.area})` : ""} (${rate.trip_type}, ${rate.vehicle_type.name})?`
            )
        ) {
            return;
        }

        try {
            await deleteRate.mutateAsync(rate.id);
            toast.success("Transport rate deactivated");
        } catch (error: any) {
            toast.error(error.message || "Failed to deactivate rate");
        }
    };

    const openEdit = (rate: TransportRate) => {
        setSelectedRate(rate);
        setFormData({
            city_id: rate.city.id,
            area: rate.area || "",
            trip_type: rate.trip_type,
            vehicle_type_id: rate.vehicle_type.id,
            rate: rate.rate.toString(),
        });
        setEditDialogOpen(true);
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Truck}
                title="TRANSPORT RATES"
                description="Emirate · Trip Type · Vehicle Configuration"
                actions={
                    <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Rate
                    </Button>
                }
            />

            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Transport Rates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-muted-foreground">Loading...</p>
                        ) : !data?.data || data.data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                No transport rates configured
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {data.data.map((rate: TransportRate) => (
                                    <div
                                        key={rate.id}
                                        className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold">
                                                    {rate.city.name}
                                                </span>
                                                {rate.area && (
                                                    <Badge
                                                        variant="outline"
                                                        className="max-w-[140px] truncate"
                                                    >
                                                        {rate.area}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline">{rate.trip_type}</Badge>
                                                <Badge variant="outline">
                                                    {rate.vehicle_type.name}
                                                </Badge>
                                                {!rate.is_active && (
                                                    <Badge variant="destructive">Inactive</Badge>
                                                )}
                                            </div>
                                            {rate.company?.id && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Company-specific override: {rate.company.name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-bold font-mono">
                                                {rate.rate.toFixed(2)} AED
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(rate)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(rate)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Transport Rate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>
                                City <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formData.city_id}
                                onValueChange={(v) => setFormData({ ...formData, city_id: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select city" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(citiesData?.data || []).map((city) => (
                                        <SelectItem key={city.id} value={city.id}>
                                            {city.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Area (Optional)</Label>
                            <Input
                                value={formData.area}
                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                placeholder="e.g. Downtown, Marina"
                            />
                        </div>
                        <div>
                            <Label>
                                Trip Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formData.trip_type}
                                onValueChange={(v: TripType) =>
                                    setFormData({ ...formData, trip_type: v })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ONE_WAY">One-way</SelectItem>
                                    <SelectItem value="ROUND_TRIP">Round-trip</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>
                                Vehicle Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formData.vehicle_type_id}
                                onValueChange={(v) =>
                                    setFormData({ ...formData, vehicle_type_id: v })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(vehicleTypesData?.data || []).map((vehicleType) => (
                                        <SelectItem key={vehicleType.id} value={vehicleType.id}>
                                            {vehicleType.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>
                                Rate (AED) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="1"
                                min="0"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                placeholder="500.00"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={createRate.isPending}>
                            {createRate.isPending ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Transport Rate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <p>
                                <strong>City:</strong> {selectedRate?.city?.name}
                            </p>
                            <p>
                                <strong>Area:</strong> {selectedRate?.area || "N/A"}
                            </p>
                            <p>
                                <strong>Trip Type:</strong> {selectedRate?.trip_type}
                            </p>
                            <p>
                                <strong>Vehicle:</strong> {selectedRate?.vehicle_type?.name}
                            </p>
                        </div>
                        <div>
                            <Label>
                                Rate (AED) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="1"
                                min="0"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit} disabled={updateRate.isPending}>
                            {updateRate.isPending ? "Updating..." : "Update"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
