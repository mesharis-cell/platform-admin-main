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
import type { TransportRate, CreateTransportRateRequest } from "@/types/hybrid-pricing";

const EMIRATES = [
    "Dubai",
    "Abu Dhabi",
    "Al Ain",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Umm Al Quwain",
    "Fujairah",
];

export default function TransportRatesPage() {
    const { data, isLoading } = useListTransportRates({});
    const createRate = useCreateTransportRate();
    const updateRate = useUpdateTransportRate();
    const deleteRate = useDeleteTransportRate();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedRate, setSelectedRate] = useState<TransportRate | null>(null);

    const [formData, setFormData] = useState({
        emirate: "",
        tripType: "ROUND_TRIP" as "ONE_WAY" | "ROUND_TRIP",
        vehicleType: "STANDARD" as "STANDARD" | "7_TON" | "10_TON",
        rate: "",
    });

    const handleCreate = async () => {
        const rateNum = parseFloat(formData.rate);
        if (!formData.emirate || isNaN(rateNum) || rateNum < 0) {
            toast.error("Please fill all required fields with valid values");
            return;
        }

        try {
            await createRate.mutateAsync({
                emirate: formData.emirate,
                tripType: formData.tripType,
                vehicleType: formData.vehicleType,
                rate: rateNum,
            });
            toast.success("Transport rate created successfully");
            setCreateDialogOpen(false);
            setFormData({ emirate: "", tripType: "ROUND_TRIP", vehicleType: "STANDARD", rate: "" });
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
                `Deactivate transport rate for ${rate.emirate} (${rate.tripType}, ${rate.vehicleType})?`
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
            emirate: rate.emirate,
            tripType: rate.tripType,
            vehicleType: rate.vehicleType,
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
                                                    {rate.emirate}
                                                </span>
                                                <Badge variant="outline">{rate.tripType}</Badge>
                                                <Badge variant="outline">{rate.vehicleType}</Badge>
                                                {!rate.isActive && (
                                                    <Badge variant="destructive">Inactive</Badge>
                                                )}
                                            </div>
                                            {rate.companyId && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Company-specific override
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
                                Emirate <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formData.emirate}
                                onValueChange={(v) => setFormData({ ...formData, emirate: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select emirate" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EMIRATES.map((e) => (
                                        <SelectItem key={e} value={e}>
                                            {e}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>
                                Trip Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formData.tripType}
                                onValueChange={(v: any) =>
                                    setFormData({ ...formData, tripType: v })
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
                                value={formData.vehicleType}
                                onValueChange={(v: any) =>
                                    setFormData({ ...formData, vehicleType: v })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STANDARD">Standard</SelectItem>
                                    <SelectItem value="7_TON">7-Ton Truck</SelectItem>
                                    <SelectItem value="10_TON">10-Ton Truck</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>
                                Rate (AED) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
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
                                <strong>Emirate:</strong> {selectedRate?.emirate}
                            </p>
                            <p>
                                <strong>Trip Type:</strong> {selectedRate?.tripType}
                            </p>
                            <p>
                                <strong>Vehicle:</strong> {selectedRate?.vehicleType}
                            </p>
                        </div>
                        <div>
                            <Label>
                                Rate (AED) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
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
