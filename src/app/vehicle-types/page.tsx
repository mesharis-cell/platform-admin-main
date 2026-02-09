"use client";

import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVehicleType, useListVehicleTypes, useUpdateVehicleType } from "@/hooks/use-vehicle-types";
import { CreateVehicleTypeRequest, UpdateVehicleTypeRequest, VehicleTypeEntity } from "@/types/hybrid-pricing";
import { formatDate } from "date-fns";
import {
  Car,
  Edit,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function VehicleTypesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVehicleType, setEditingVehicleType] = useState<VehicleTypeEntity | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<{ id: string, name: string, currentStatus: boolean } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateVehicleTypeRequest>>({
    name: "",
    vehicle_size: 0,
    display_order: 1,
    description: "",
    isDefault: false,
  });

  const createVehicleType = useCreateVehicleType();
  const updateVehicleType = useUpdateVehicleType();

  // Query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search_term = searchQuery;
    if (includeInactive) params.include_inactive = "true";
    return params;
  }, [searchQuery, includeInactive]);

  const { data: vehicleTypesData, isLoading, error } = useListVehicleTypes(queryParams);
  const vehicleTypes = vehicleTypesData?.data || [];

  const resetForm = () => {
    setEditingVehicleType(null);
    setIsCreateOpen(false);
    setFormData({
      name: "",
      vehicle_size: 0,
      display_order: 1,
      description: "",
      isDefault: false,
    });
  };

  const openEditDialog = (vehicleType: VehicleTypeEntity) => {
    setEditingVehicleType(vehicleType);
    setFormData({
      name: vehicleType.name,
      vehicle_size: vehicleType.vehicle_size,
      display_order: vehicleType.display_order,
      description: vehicleType.description || "",
      isDefault: vehicleType.is_default,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name || !formData.vehicle_size) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate name length
    if (formData.name.length < 2) {
      toast.error("Vehicle type name must be at least 2 characters long");
      return;
    }
    if (formData.name.length > 100) {
      toast.error("Vehicle type name cannot exceed 100 characters");
      return;
    }

    const payload: CreateVehicleTypeRequest = {
      name: formData.name!,
      vehicle_size: Number(formData.vehicle_size),
      display_order: Number(formData.display_order) || 1,
      description: formData.description,
      isDefault: formData.isDefault,
    };

    try {
      if (editingVehicleType) {
        const updatePayload: UpdateVehicleTypeRequest = {};
        if (formData.name && formData.name !== editingVehicleType.name) {
          updatePayload.name = formData.name;
        }

        if (payload.vehicle_size !== editingVehicleType.vehicle_size) {
          updatePayload.vehicle_size = payload.vehicle_size;
        }

        if (payload.display_order !== editingVehicleType.display_order) {
          updatePayload.display_order = payload.display_order;
        }

        const description = formData.description || "";
        if (description !== (editingVehicleType.description || "")) {
          updatePayload.description = description;
        }

        if (formData.isDefault !== editingVehicleType.is_default) {
          updatePayload.isDefault = formData.isDefault;
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateVehicleType.mutateAsync({
            id: editingVehicleType.id,
            data: updatePayload,
          });
          toast.success("Vehicle type updated successfully");
        } else {
          toast.info("No changes detected");
        }
        resetForm();
      } else {
        await createVehicleType.mutateAsync(payload);
        toast.success("Vehicle type created successfully");
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleStatus = async () => {
    try {
      if (confirmToggle) {
        if (confirmToggle.currentStatus) {
          await updateVehicleType.mutateAsync({
            id: confirmToggle.id,
            data: {
              isActive: false
            }
          });
        } else {
          await updateVehicleType.mutateAsync({
            id: confirmToggle.id,
            data: {
              isActive: true
            }
          });
        }
        toast.success(`Vehicle type ${!confirmToggle.currentStatus ? 'activated' : 'deactivated'} successfully`);
        setConfirmToggle(null);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (error) {
    return <div className="text-center py-12 space-y-3">
      <Car className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
      <p className="font-mono text-sm text-muted-foreground">AN ERROR OCCURRED</p>
    </div>;
  }

  return (
    <div>
      <AdminHeader
        icon={Car}
        title="VEHICLE TYPES"
        description="Manage vehicle types and configurations"
        stats={{ label: "TOTAL VEHICLE TYPES", value: vehicleTypes.length }}
        actions={
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 font-mono">
                <Plus className="h-4 w-4" />
                NEW VEHICLE TYPE
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-mono">
                  {editingVehicleType ? "EDIT VEHICLE TYPE" : "CREATE NEW VEHICLE TYPE"}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {editingVehicleType
                    ? "Update vehicle type details"
                    : "Add new vehicle type to the system"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-mono text-xs">
                      VEHICLE TYPE NAME *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
                      }
                      placeholder="Standard Truck"
                      required
                      minLength={2}
                      maxLength={100}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_size" className="font-mono text-xs">
                      VEHICLE MAX CAPACITY (m³)*
                    </Label>
                    <Input
                      id="vehicle_size"
                      type="number"
                      value={formData.vehicle_size}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vehicle_size: Number(e.target.value),
                        })
                      }
                      placeholder="20"
                      required
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_order" className="font-mono text-xs">
                      DISPLAY ORDER
                    </Label>
                    <Input
                      id="display_order"
                      type="number"
                      min="1"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_order: parseInt(e.target.value) || 1,
                        })
                      }
                      placeholder="1"
                      className="font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="default-toggle"
                        checked={formData.isDefault}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isDefault: checked })
                        }
                      />
                      <Label htmlFor="default-toggle" className="font-mono text-xs cursor-pointer">
                        {formData.isDefault ? "DEFAULT VEHICLE" : "SET AS DEFAULT"}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="font-mono text-xs">
                    DESCRIPTION (OPTIONAL)
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Additional details about the vehicle type..."
                    className="font-mono min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="font-mono"
                    disabled={createVehicleType.isPending || updateVehicleType.isPending}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={createVehicleType.isPending || updateVehicleType.isPending}
                    className="font-mono"
                  >
                    {createVehicleType.isPending || updateVehicleType.isPending
                      ? "PROCESSING..."
                      : editingVehicleType
                        ? "UPDATE"
                        : "CREATE"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Control Panel */}
      <div className="border-b border-border bg-card px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vehicle types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-mono text-sm"
            />
          </div>

          <Button
            variant={includeInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeInactive(!includeInactive)}
            className="gap-2 font-mono text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {includeInactive ? "HIDE INACTIVE" : "SHOW INACTIVE"}
          </Button>
        </div>
      </div>

      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm font-mono text-muted-foreground animate-pulse">
              LOADING VEHICLE TYPES...
            </div>
          </div>
        ) : vehicleTypes.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Car className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="font-mono text-sm text-muted-foreground">NO VEHICLE TYPES FOUND</p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="font-mono text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              CREATE FIRST VEHICLE TYPE
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border/50">
                  <TableHead className="font-mono text-xs font-bold w-[250px]">
                    VEHICLE TYPE NAME
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    VEHICLE SIZE
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    DISPLAY ORDER
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    CREATED AT
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleTypes.map((vehicleType: VehicleTypeEntity, index: number) => (
                  <TableRow
                    key={vehicleType.id}
                    className="group hover:bg-muted/30 transition-colors border-border/50"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <TableCell className="font-mono">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{vehicleType.name}</span>
                          {vehicleType.is_default && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                              Default
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {vehicleType.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {vehicleType.vehicle_size}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {vehicleType.display_order}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(vehicleType.created_at, "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(vehicleType)}
                          className="font-mono text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmToggle({
                            id: vehicleType.id,
                            name: vehicleType.name,
                            currentStatus: vehicleType.is_active
                          })}
                          className={`font-mono text-xs ${vehicleType.is_active ? "text-destructive" : "text-green-600"}`}
                        >
                          {vehicleType.is_active ? (
                            <>
                              <PowerOff className="h-3.5 w-3.5 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="h-3.5 w-3.5 mr-2" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Confirm Toggle Dialog */}
      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        onConfirm={handleToggleStatus}
        title={confirmToggle?.currentStatus ? "Deactivate Vehicle Type" : "Activate Vehicle Type"}
        description={`Are you sure you want to ${confirmToggle?.currentStatus ? 'deactivate' : 'activate'} ${confirmToggle?.name}?`}
        confirmText={confirmToggle?.currentStatus ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        variant={confirmToggle?.currentStatus ? "destructive" : "default"}
      />
    </div>
  );
}