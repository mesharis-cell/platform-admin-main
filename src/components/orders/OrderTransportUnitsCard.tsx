"use client";

import { useMemo, useState } from "react";
import { Truck, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    useCreateOrderTransportUnit,
    useDeleteOrderTransportUnit,
    useOrderTransportUnits,
    useUpdateOrderTransportUnit,
} from "@/hooks/use-orders";
import { useListVehicleTypes } from "@/hooks/use-vehicle-types";
import type {
    CreateOrderTransportUnitPayload,
    OrderTransportUnit,
    OrderTransportUnitKind,
    UpdateOrderTransportUnitPayload,
} from "@/types/order";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface OrderTransportUnitsCardProps {
    orderId: string;
    canManage?: boolean;
}

interface UnitFormState {
    kind: OrderTransportUnitKind;
    label: string;
    vehicle_type_id: string;
    is_default: boolean;
    is_billable: boolean;
    billable_rate: string;
    truck_plate: string;
    driver_name: string;
    driver_contact: string;
    truck_size: string;
    tailgate_required: boolean;
    manpower: number;
    delivery_notes: string;
    pickup_notes: string;
    notes: string;
}

const KIND_LABEL: Record<OrderTransportUnitKind, string> = {
    DELIVERY_BILLABLE: "Delivery Trucks (Billable)",
    PICKUP_OPS: "Pickup Trucks (Operational)",
    OTHER_ACCESS: "Other Access Vehicles (Non-billable)",
};

const KIND_HELPER: Record<OrderTransportUnitKind, string> = {
    DELIVERY_BILLABLE: "Used in transport pricing aggregation",
    PICKUP_OPS: "Operational pickup details for logistics",
    OTHER_ACCESS: "Site access vehicles like personal cars",
};

const emptyFormState = (): UnitFormState => ({
    kind: "DELIVERY_BILLABLE",
    label: "",
    vehicle_type_id: "",
    is_default: false,
    is_billable: true,
    billable_rate: "",
    truck_plate: "",
    driver_name: "",
    driver_contact: "",
    truck_size: "",
    tailgate_required: false,
    manpower: 0,
    delivery_notes: "",
    pickup_notes: "",
    notes: "",
});

const mapUnitToForm = (unit: OrderTransportUnit): UnitFormState => ({
    kind: unit.kind,
    label: unit.label || "",
    vehicle_type_id: unit.vehicle_type_id || "",
    is_default: !!unit.is_default,
    is_billable: !!unit.is_billable,
    billable_rate: unit.billable_rate ? String(unit.billable_rate) : "",
    truck_plate: unit.details?.truck_plate || "",
    driver_name: unit.details?.driver_name || "",
    driver_contact: unit.details?.driver_contact || "",
    truck_size: unit.details?.truck_size || "",
    tailgate_required: !!unit.details?.tailgate_required,
    manpower: Number(unit.details?.manpower || 0),
    delivery_notes: unit.details?.delivery_notes || "",
    pickup_notes: unit.details?.pickup_notes || "",
    notes: unit.details?.notes || "",
});

export function OrderTransportUnitsCard({
    orderId,
    canManage = true,
}: OrderTransportUnitsCardProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<OrderTransportUnit | null>(null);
    const [form, setForm] = useState<UnitFormState>(emptyFormState());

    const { data: transportUnits = [], isLoading } = useOrderTransportUnits(orderId);
    const { data: vehicleTypes } = useListVehicleTypes();
    const createUnit = useCreateOrderTransportUnit();
    const updateUnit = useUpdateOrderTransportUnit();
    const deleteUnit = useDeleteOrderTransportUnit();
    const isSaving = createUnit.isPending || updateUnit.isPending;

    const grouped = useMemo(
        () => ({
            DELIVERY_BILLABLE: transportUnits.filter((unit) => unit.kind === "DELIVERY_BILLABLE"),
            PICKUP_OPS: transportUnits.filter((unit) => unit.kind === "PICKUP_OPS"),
            OTHER_ACCESS: transportUnits.filter((unit) => unit.kind === "OTHER_ACCESS"),
        }),
        [transportUnits]
    );

    const openCreateDialog = () => {
        setEditingUnit(null);
        setForm(emptyFormState());
        setDialogOpen(true);
    };

    const openEditDialog = (unit: OrderTransportUnit) => {
        setEditingUnit(unit);
        setForm(mapUnitToForm(unit));
        setDialogOpen(true);
    };

    const handleKindChange = (kind: OrderTransportUnitKind) => {
        setForm((prev) => ({
            ...prev,
            kind,
            is_billable: kind === "DELIVERY_BILLABLE" ? prev.is_billable : false,
            billable_rate: kind === "DELIVERY_BILLABLE" ? prev.billable_rate : "",
            vehicle_type_id: kind === "DELIVERY_BILLABLE" ? prev.vehicle_type_id : "",
            delivery_notes: kind === "DELIVERY_BILLABLE" ? prev.delivery_notes : "",
            pickup_notes: kind === "PICKUP_OPS" ? prev.pickup_notes : "",
        }));
    };

    const buildDetailPayload = () => ({
        truck_plate: form.truck_plate || undefined,
        driver_name: form.driver_name || undefined,
        driver_contact: form.driver_contact || undefined,
        truck_size: form.truck_size || undefined,
        tailgate_required: !!form.tailgate_required,
        manpower: Number(form.manpower || 0),
        delivery_notes:
            form.kind === "DELIVERY_BILLABLE" ? form.delivery_notes || undefined : undefined,
        pickup_notes: form.kind === "PICKUP_OPS" ? form.pickup_notes || undefined : undefined,
        notes: form.notes || undefined,
    });

    const handleSave = async () => {
        if (form.kind === "DELIVERY_BILLABLE" && !form.vehicle_type_id) {
            toast.error("Delivery units require a vehicle type");
            return;
        }

        const parsedRate =
            form.billable_rate.trim().length > 0 ? Number(form.billable_rate.trim()) : undefined;
        if (parsedRate !== undefined && Number.isNaN(parsedRate)) {
            toast.error("Billable rate must be a valid number");
            return;
        }

        const payload: CreateOrderTransportUnitPayload | UpdateOrderTransportUnitPayload = {
            kind: form.kind,
            label: form.label.trim() || undefined,
            vehicle_type_id:
                form.kind === "DELIVERY_BILLABLE"
                    ? form.vehicle_type_id
                    : editingUnit
                      ? null
                      : undefined,
            is_default: form.is_default,
            is_billable: form.kind === "DELIVERY_BILLABLE" ? form.is_billable : false,
            billable_rate:
                form.kind === "DELIVERY_BILLABLE"
                    ? (parsedRate ?? (editingUnit ? null : undefined))
                    : undefined,
            detail: buildDetailPayload(),
        };

        try {
            if (editingUnit) {
                await updateUnit.mutateAsync({
                    orderId,
                    unitId: editingUnit.id,
                    payload: payload as UpdateOrderTransportUnitPayload,
                });
                toast.success("Transport unit updated");
            } else {
                await createUnit.mutateAsync({
                    orderId,
                    payload: payload as CreateOrderTransportUnitPayload,
                });
                toast.success("Transport unit added");
            }
            setDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save transport unit");
        }
    };

    const handleDelete = async () => {
        if (!editingUnit) return;
        if (!window.confirm("Delete this transport unit?")) return;
        try {
            await deleteUnit.mutateAsync({
                orderId,
                unitId: editingUnit.id,
            });
            toast.success("Transport unit deleted");
            setDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete transport unit");
        }
    };

    const renderUnitRow = (unit: OrderTransportUnit, index: number) => {
        const detail = unit.details || {};
        return (
            <div key={unit.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-mono text-sm font-semibold">
                            {unit.label || `${KIND_LABEL[unit.kind].split(" ")[0]} #${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                            {unit.vehicle_type?.name || "No configured vehicle"}
                            {unit.is_billable && unit.billable_rate
                                ? ` • Manual rate: ${unit.billable_rate} AED`
                                : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {unit.is_default && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                                DEFAULT
                            </Badge>
                        )}
                        {unit.is_billable && (
                            <Badge className="font-mono text-[10px]">BILLABLE</Badge>
                        )}
                        {canManage && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(unit)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono text-muted-foreground">
                    <p>Plate: {detail.truck_plate || "-"}</p>
                    <p>Driver: {detail.driver_name || "-"}</p>
                    <p>Contact: {detail.driver_contact || "-"}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                    <p>Truck size: {detail.truck_size || "-"}</p>
                    <p>Manpower: {detail.manpower ?? 0}</p>
                </div>
                {(detail.delivery_notes || detail.pickup_notes || detail.notes) && (
                    <p className="text-xs font-mono text-muted-foreground">
                        Notes: {detail.delivery_notes || detail.pickup_notes || detail.notes}
                    </p>
                )}
            </div>
        );
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="font-mono text-sm flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            TRANSPORT UNITS
                        </CardTitle>
                        {canManage && (
                            <Button type="button" size="sm" onClick={openCreateDialog}>
                                <PlusCircle className="h-4 w-4 mr-1" />
                                Add Truck
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    {isLoading && (
                        <p className="text-xs font-mono text-muted-foreground">
                            Loading transport units...
                        </p>
                    )}

                    {!isLoading &&
                        (Object.keys(KIND_LABEL) as OrderTransportUnitKind[]).map((kind) => (
                            <div key={kind} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="font-mono text-xs font-semibold">
                                        {KIND_LABEL[kind]}
                                    </p>
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                        {grouped[kind].length}
                                    </Badge>
                                </div>
                                <p className="text-[11px] font-mono text-muted-foreground">
                                    {KIND_HELPER[kind]}
                                </p>
                                {grouped[kind].length > 0 ? (
                                    <div className="space-y-2">
                                        {grouped[kind].map((unit, index) =>
                                            renderUnitRow(unit, index)
                                        )}
                                    </div>
                                ) : (
                                    <div className="border border-dashed rounded-md p-3 text-xs font-mono text-muted-foreground">
                                        No units added yet.
                                    </div>
                                )}
                            </div>
                        ))}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-mono">
                            {editingUnit ? "EDIT TRANSPORT UNIT" : "ADD TRANSPORT UNIT"}
                        </DialogTitle>
                        <DialogDescription className="font-mono text-xs">
                            Select type, then provide per-truck details for delivery, pickup, or
                            access.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
                        {!editingUnit && (
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">TRUCK TYPE</Label>
                                <Select
                                    value={form.kind}
                                    onValueChange={(value) =>
                                        handleKindChange(value as OrderTransportUnitKind)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DELIVERY_BILLABLE">
                                            Delivery (Billable)
                                        </SelectItem>
                                        <SelectItem value="PICKUP_OPS">
                                            Pickup (Operational)
                                        </SelectItem>
                                        <SelectItem value="OTHER_ACCESS">Other Access</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="font-mono text-xs">LABEL</Label>
                            <Input
                                value={form.label}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, label: event.target.value }))
                                }
                                placeholder="Optional label (e.g., Delivery Truck 2)"
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs">
                                VEHICLE TYPE{" "}
                                {form.kind === "DELIVERY_BILLABLE" ? "*" : "(optional)"}
                            </Label>
                            <Select
                                value={form.vehicle_type_id || "__none__"}
                                onValueChange={(value) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        vehicle_type_id: value === "__none__" ? "" : value,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">No vehicle type</SelectItem>
                                    {vehicleTypes?.data?.map((vehicleType) => (
                                        <SelectItem key={vehicleType.id} value={vehicleType.id}>
                                            {vehicleType.name} ({vehicleType.vehicle_size})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 pt-2">
                                <Checkbox
                                    id="is-default-unit"
                                    checked={form.is_default}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, is_default: !!checked }))
                                    }
                                />
                                <Label htmlFor="is-default-unit" className="font-mono text-xs">
                                    Set as default
                                </Label>
                            </div>
                            {form.kind === "DELIVERY_BILLABLE" && (
                                <div className="flex items-center gap-2 pt-2">
                                    <Checkbox
                                        id="is-billable-unit"
                                        checked={form.is_billable}
                                        onCheckedChange={(checked) =>
                                            setForm((prev) => ({ ...prev, is_billable: !!checked }))
                                        }
                                    />
                                    <Label htmlFor="is-billable-unit" className="font-mono text-xs">
                                        Billable unit
                                    </Label>
                                </div>
                            )}
                        </div>

                        {form.kind === "DELIVERY_BILLABLE" && (
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">
                                    MANUAL BILLABLE RATE (AED)
                                </Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.billable_rate}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            billable_rate: event.target.value,
                                        }))
                                    }
                                    placeholder="Optional override. Leave empty to use configured rate."
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">TRUCK PLATE</Label>
                                <Input
                                    value={form.truck_plate}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            truck_plate: event.target.value,
                                        }))
                                    }
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">TRUCK SIZE</Label>
                                <Input
                                    value={form.truck_size}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            truck_size: event.target.value,
                                        }))
                                    }
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">DRIVER NAME</Label>
                                <Input
                                    value={form.driver_name}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            driver_name: event.target.value,
                                        }))
                                    }
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">DRIVER CONTACT</Label>
                                <Input
                                    value={form.driver_contact}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            driver_contact: event.target.value,
                                        }))
                                    }
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">MANPOWER</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.manpower}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            manpower: Number(event.target.value || 0),
                                        }))
                                    }
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-7">
                                <Checkbox
                                    id="tailgate-required"
                                    checked={form.tailgate_required}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            tailgate_required: !!checked,
                                        }))
                                    }
                                />
                                <Label htmlFor="tailgate-required" className="font-mono text-xs">
                                    Tailgate required
                                </Label>
                            </div>
                        </div>

                        {form.kind === "DELIVERY_BILLABLE" && (
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">DELIVERY NOTES</Label>
                                <Textarea
                                    value={form.delivery_notes}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            delivery_notes: event.target.value,
                                        }))
                                    }
                                    rows={2}
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}

                        {form.kind === "PICKUP_OPS" && (
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">PICKUP NOTES</Label>
                                <Textarea
                                    value={form.pickup_notes}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            pickup_notes: event.target.value,
                                        }))
                                    }
                                    rows={2}
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="font-mono text-xs">GENERAL NOTES</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                                }
                                rows={2}
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        {editingUnit && canManage && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleteUnit.isPending || isSaving}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
