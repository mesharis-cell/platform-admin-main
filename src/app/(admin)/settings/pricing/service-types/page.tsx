"use client";

/**
 * Service Types Catalog Management
 * Manage billable services (assembly, equipment, handling)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Wrench, Plus, Pencil, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import {
    useListServiceTypes,
    useCreateServiceType,
    useUpdateServiceType,
    useDeleteServiceType,
} from "@/hooks/use-service-types";
import type { ServiceType, ServiceCategory } from "@/types/hybrid-pricing";

const CATEGORIES: { value: ServiceCategory; label: string }[] = [
    { value: "ASSEMBLY", label: "Assembly" },
    { value: "EQUIPMENT", label: "Equipment" },
    { value: "HANDLING", label: "Handling" },
    { value: "RESKIN", label: "Reskin/Rebrand" },
    { value: "OTHER", label: "Other" },
];

export default function ServiceTypesPage() {
    const { data, isLoading } = useListServiceTypes({});
    const createService = useCreateServiceType();
    const updateService = useUpdateServiceType();
    const deleteService = useDeleteServiceType();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<ServiceType | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        category: "ASSEMBLY" as ServiceCategory,
        unit: "",
        defaultRate: "",
        description: "",
    });

    const resetForm = () => {
        setFormData({ name: "", category: "ASSEMBLY", unit: "", defaultRate: "", description: "" });
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.unit) {
            toast.error("Name and unit are required");
            return;
        }

        const rateNum = formData.defaultRate ? parseFloat(formData.defaultRate) : null;
        if (formData.defaultRate && (isNaN(rateNum!) || rateNum! < 0)) {
            toast.error("Please enter a valid default rate");
            return;
        }

        try {
            await createService.mutateAsync({
                name: formData.name,
                category: formData.category,
                unit: formData.unit,
                default_rate: rateNum,
                description: formData.description || undefined,
            });
            toast.success("Service type created successfully");
            setCreateDialogOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Failed to create service type");
        }
    };

    const handleEdit = async () => {
        if (!selectedService) return;

        const rateNum = formData.defaultRate ? parseFloat(formData.defaultRate) : null;
        if (formData.defaultRate && (isNaN(rateNum!) || rateNum! < 0)) {
            toast.error("Please enter a valid default rate");
            return;
        }

        try {
            await updateService.mutateAsync({
                id: selectedService.id,
                data: {
                    name: formData.name,
                    unit: formData.unit,
                    defaultRate: rateNum,
                    description: formData.description || undefined,
                },
            });
            toast.success("Service type updated successfully");
            setEditDialogOpen(false);
            setSelectedService(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to update service type");
        }
    };

    const handleDelete = async (service: ServiceType) => {
        if (!confirm(`Deactivate service type "${service.name}"?`)) return;

        try {
            await deleteService.mutateAsync(service.id);
            toast.success("Service type deactivated");
        } catch (error: any) {
            toast.error(error.message || "Failed to deactivate service type");
        }
    };

    const openEdit = (service: ServiceType) => {
        setSelectedService(service);
        setFormData({
            name: service.name,
            category: service.category,
            unit: service.unit,
            defaultRate: service.default_rate?.toString() || "",
            description: service.description || "",
        });
        setEditDialogOpen(true);
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Wrench}
                title="SERVICE TYPES CATALOG"
                description="Billable Services Configuration"
                actions={
                    <Button
                        onClick={() => {
                            resetForm();
                            setCreateDialogOpen(true);
                        }}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Service
                    </Button>
                }
            />

            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Service Catalog</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-muted-foreground">Loading...</p>
                        ) : !data?.data || data.data.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                No service types configured
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {data.data.map((service: ServiceType) => (
                                    <div
                                        key={service.id}
                                        className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold">
                                                    {service.name}
                                                </span>
                                                <Badge variant="outline">{service.category}</Badge>
                                                {!service.is_active && (
                                                    <Badge variant="destructive">Inactive</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Unit: {service.unit}
                                                {service.default_rate &&
                                                    ` · Default rate: ${service.default_rate.toFixed(2)} AED`}
                                            </p>
                                            {service.description && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {service.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEdit(service)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(service)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog
                open={createDialogOpen || editDialogOpen}
                onOpenChange={(open) => {
                    setCreateDialogOpen(false);
                    setEditDialogOpen(false);
                    if (!open) {
                        resetForm();
                        setSelectedService(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedService ? "Edit" : "Add"} Service Type</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Assembly (Regular Hours)"
                            />
                        </div>
                        <div>
                            <Label>
                                Category <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formData.category}
                                onValueChange={(v: ServiceCategory) =>
                                    setFormData({ ...formData, category: v })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>
                                Unit <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="hour, day, trip, unit"
                            />
                        </div>
                        <div>
                            <Label>Default Rate (AED)</Label>
                            <Input
                                type="number"
                                step="1"
                                min="0"
                                value={formData.defaultRate}
                                onChange={(e) =>
                                    setFormData({ ...formData, defaultRate: e.target.value })
                                }
                                placeholder="18.00"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Optional description"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateDialogOpen(false);
                                setEditDialogOpen(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={selectedService ? handleEdit : handleCreate}
                            disabled={createService.isPending || updateService.isPending}
                        >
                            {createService.isPending || updateService.isPending
                                ? "Saving..."
                                : selectedService
                                    ? "Update"
                                    : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
