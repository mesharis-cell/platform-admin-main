"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Wrench,
    Plus,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Search,
    Ban,
    RotateCcw,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import {
    useListServiceTypes,
    useCreateServiceType,
    useUpdateServiceType,
    useDeleteServiceType,
    useToggleServiceTypeStatus,
} from "@/hooks/use-service-types";
import type { ServiceType, ServiceCategory } from "@/types/hybrid-pricing";

const CATEGORIES: { value: ServiceCategory; label: string }[] = [
    { value: "ASSEMBLY", label: "Assembly" },
    { value: "EQUIPMENT", label: "Equipment" },
    { value: "HANDLING", label: "Handling" },
    { value: "TRANSPORT", label: "Transport" },
    { value: "RESKIN", label: "Reskin/Rebrand" },
    { value: "OTHER", label: "Other" },
];

const PAGE_SIZE = 20;
type StatusFilter = "active" | "disabled" | "both";

export default function ServiceTypesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [page, setPage] = useState(1);

    const filters: Record<string, string> = {
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
    };
    if (searchTerm.trim()) filters.search_term = searchTerm.trim();
    if (categoryFilter !== "all") filters.category = categoryFilter;
    if (statusFilter === "both") {
        filters.include_inactive = "true";
    } else if (statusFilter === "active") {
        filters.is_active = "true";
    } else if (statusFilter === "disabled") {
        filters.include_inactive = "true";
        filters.is_active = "false";
    }

    const { data, isLoading } = useListServiceTypes(filters);
    const createService = useCreateServiceType();
    const updateService = useUpdateServiceType();
    const deleteService = useDeleteServiceType();
    const toggleServiceStatus = useToggleServiceTypeStatus();

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

    const totalItems = data?.meta?.total || 0;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    const services = data?.data || [];

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
        if (!confirm(`Delete service type "${service.name}" permanently? This cannot be undone.`)) {
            return;
        }

        try {
            await deleteService.mutateAsync(service.id);
            toast.success("Service type deleted");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete service type");
        }
    };

    const handleToggleStatus = async (service: ServiceType, nextIsActive: boolean) => {
        const actionLabel = nextIsActive ? "enable" : "disable";
        if (!confirm(`${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} "${service.name}"?`)) {
            return;
        }

        try {
            await toggleServiceStatus.mutateAsync({ id: service.id, isActive: nextIsActive });
            toast.success(`Service type ${nextIsActive ? "enabled" : "disabled"}`);
        } catch (error: any) {
            toast.error(error.message || `Failed to ${actionLabel} service type`);
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
        <div>
            <AdminHeader
                icon={Wrench}
                title="SERVICE TYPES CATALOG"
                description="Billable services configuration"
                stats={{ label: "TOTAL SERVICE TYPES", value: totalItems }}
                actions={
                    <Button
                        onClick={() => {
                            resetForm();
                            setCreateDialogOpen(true);
                        }}
                        className="gap-2 font-mono"
                    >
                        <Plus className="h-4 w-4" />
                        NEW SERVICE TYPE
                    </Button>
                }
            />

            {/* Search strip */}
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10 font-mono text-sm"
                        />
                    </div>
                    <Select
                        value={categoryFilter}
                        onValueChange={(v) => {
                            setCategoryFilter(v);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[180px] font-mono text-xs">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-mono text-xs">
                                ALL CATEGORIES
                            </SelectItem>
                            {CATEGORIES.map((cat) => (
                                <SelectItem
                                    key={cat.value}
                                    value={cat.value}
                                    className="font-mono text-xs"
                                >
                                    {cat.label.toUpperCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={statusFilter}
                        onValueChange={(v: StatusFilter) => {
                            setStatusFilter(v);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[160px] font-mono text-xs">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active" className="font-mono text-xs">
                                ACTIVE
                            </SelectItem>
                            <SelectItem value="both" className="font-mono text-xs">
                                ALL STATUSES
                            </SelectItem>
                            <SelectItem value="disabled" className="font-mono text-xs">
                                DISABLED
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm font-mono text-muted-foreground animate-pulse">
                            LOADING SERVICE TYPES...
                        </div>
                    </div>
                ) : services.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Wrench className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="font-mono text-sm text-muted-foreground">
                            NO SERVICE TYPES FOUND
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="border border-border rounded-lg overflow-hidden bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-border/50">
                                        <TableHead className="font-mono text-xs font-bold">
                                            NAME
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold">
                                            CATEGORY
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold">
                                            UNIT
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold text-right">
                                            DEFAULT RATE
                                        </TableHead>
                                        <TableHead className="font-mono text-xs font-bold">
                                            STATUS
                                        </TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {services.map((service: ServiceType, index: number) => (
                                        <TableRow
                                            key={service.id}
                                            className="group hover:bg-muted/30 transition-colors border-border/50"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <TableCell className="font-mono">
                                                <div>
                                                    <span className="font-medium text-sm">
                                                        {service.name}
                                                    </span>
                                                    {service.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 max-w-[300px] truncate">
                                                            {service.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-xs"
                                                >
                                                    {service.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {service.unit}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {service.default_rate != null
                                                    ? `${service.default_rate.toFixed(2)} AED`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        service.is_active ? "default" : "destructive"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {service.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEdit(service)}
                                                        className="font-mono text-xs"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleToggleStatus(
                                                                service,
                                                                !service.is_active
                                                            )
                                                        }
                                                        title={
                                                            service.is_active
                                                                ? "Disable service type"
                                                                : "Enable service type"
                                                        }
                                                        className="font-mono text-xs"
                                                    >
                                                        {service.is_active ? (
                                                            <Ban className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(service)}
                                                        title="Delete service type"
                                                        className="font-mono text-xs text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-sm text-muted-foreground font-mono">
                                    Page {page} of {totalPages} ({totalItems} total)
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => p - 1)}
                                        className="gap-1 font-mono"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Prev
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                        className="gap-1 font-mono"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-mono">
                            {selectedService ? "EDIT SERVICE TYPE" : "CREATE SERVICE TYPE"}
                        </DialogTitle>
                        <DialogDescription className="font-mono text-xs">
                            {selectedService
                                ? "Update service type configuration"
                                : "Add a new billable service to the catalog"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">NAME *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Assembly (Regular Hours)"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">CATEGORY *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(v: ServiceCategory) =>
                                    setFormData({ ...formData, category: v })
                                }
                            >
                                <SelectTrigger className="font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem
                                            key={cat.value}
                                            value={cat.value}
                                            className="font-mono"
                                        >
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">UNIT *</Label>
                            <Input
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="hour, day, trip, unit"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">DEFAULT RATE (AED)</Label>
                            <Input
                                type="number"
                                step="1"
                                min="0"
                                value={formData.defaultRate}
                                onChange={(e) =>
                                    setFormData({ ...formData, defaultRate: e.target.value })
                                }
                                placeholder="18.00"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">DESCRIPTION</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Optional description"
                                rows={3}
                                className="font-mono"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateDialogOpen(false);
                                setEditDialogOpen(false);
                                resetForm();
                            }}
                            className="font-mono"
                        >
                            CANCEL
                        </Button>
                        <Button
                            onClick={selectedService ? handleEdit : handleCreate}
                            disabled={createService.isPending || updateService.isPending}
                            className="font-mono"
                        >
                            {createService.isPending || updateService.isPending
                                ? "PROCESSING..."
                                : selectedService
                                  ? "UPDATE"
                                  : "CREATE"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
