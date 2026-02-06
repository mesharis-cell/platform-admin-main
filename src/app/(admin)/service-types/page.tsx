"use client";

import { useListServiceTypes, useCreateServiceType, useUpdateServiceType, useDeleteServiceType } from "@/hooks/use-service-types";
import {
  Plus,
  Wrench,
  Edit,
  Search,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin-header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ServiceType, ServiceCategory, CreateServiceTypeRequest } from "@/types/hybrid-pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "date-fns";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const SERVICE_CATEGORIES: ServiceCategory[] = ["ASSEMBLY", "EQUIPMENT", "HANDLING", "RESKIN", "OTHER"];
const DEFAULT_UNITS = ["trip", "hour", "day", "unit"];

export default function ServiceTypes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [confirmToggle, setConfirmToggle] = useState<{ id: string, name: string, currentStatus: boolean } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateServiceTypeRequest>>({
    name: "",
    category: "ASSEMBLY",
    unit: "trip",
    default_rate: null,
    description: "",
  });
  const [customUnit, setCustomUnit] = useState("");

  const createService = useCreateServiceType();
  const updateService = useUpdateServiceType();

  // Query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search_term = searchQuery;
    if (includeInactive) params.include_inactive = "true";
    if (selectedCategory && selectedCategory !== "all") params.category = selectedCategory;
    return params;
  }, [searchQuery, includeInactive, selectedCategory]);

  const { data: servicesData, isLoading, error } = useListServiceTypes(queryParams);
  const services = servicesData?.data || [];

  const resetForm = () => {
    setEditingService(null);
    setIsCreateOpen(false);
    setFormData({
      name: "",
      category: "ASSEMBLY",
      unit: "trip",
      default_rate: null,
      description: "",
    });
    setCustomUnit("");
  };

  const openEditDialog = (service: ServiceType) => {
    setEditingService(service);
    const isCustomUnit = !DEFAULT_UNITS.includes(service.unit);

    setFormData({
      name: service.name,
      category: service.category,
      unit: isCustomUnit ? "__custom__" : service.unit,
      default_rate: service.default_rate,
      description: service.description || "",
    });

    if (isCustomUnit) {
      setCustomUnit(service.unit);
    } else {
      setCustomUnit("");
    }

    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let finalUnit = formData.unit;
    if (formData.unit === "__custom__") {
      if (!customUnit.trim()) {
        toast.error("Please enter a custom unit");
        return;
      }
      finalUnit = customUnit.trim();
    }

    if (!formData.name || !finalUnit || !formData.category || !formData.default_rate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload: CreateServiceTypeRequest = {
      name: formData.name,
      category: editingService ? undefined : formData.category,
      unit: finalUnit,
      default_rate: formData.default_rate,
      description: formData.description,
    };

    try {
      if (editingService) {
        await updateService.mutateAsync({
          id: editingService.id,
          data: payload,
        });
        toast.success("Service updated successfully");
        resetForm();
      } else {
        await createService.mutateAsync(payload);
        toast.success("Service created successfully");
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleStatus = async () => {
    try {
      if (confirmToggle) {
        await updateService.mutateAsync({
          id: confirmToggle.id,
          data: {
            isActive: !confirmToggle.currentStatus
          }
        });
        toast.success(`Service ${!confirmToggle.currentStatus ? 'activated' : 'deactivated'} successfully`);
        setConfirmToggle(null);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (error) {
    return <div className="text-center py-12 space-y-3">
      <Wrench className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
      <p className="font-mono text-sm text-muted-foreground">AN ERROR OCCURRED</p>
    </div>;
  }

  return (
    <div>
      <AdminHeader
        icon={Wrench}
        title="SERVICE REGISTRY"
        description="Manage service types and pricing"
        stats={{ label: "TOTAL SERVICES", value: services.length }}
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
                NEW SERVICE
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-mono">
                  {editingService ? "EDIT SERVICE" : "CREATE NEW SERVICE"}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {editingService
                    ? "Update service details and rates"
                    : "Add new service type to the catalog"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceName" className="font-mono text-xs">
                      SERVICE NAME *
                    </Label>
                    <Input
                      id="serviceName"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., Installation"
                      required
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="font-mono text-xs">
                      CATEGORY *
                    </Label>
                    <Select
                      value={formData.category}
                      disabled={!!editingService}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          category: value as ServiceCategory,
                        })
                      }
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="font-mono">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit" className="font-mono text-xs">
                      UNIT *
                    </Label>
                    <div className="space-y-2">
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => {
                          if (value === "__custom__") {
                            setCustomUnit("");
                            setFormData({
                              ...formData,
                              unit: value,
                            });
                          } else {
                            setFormData({
                              ...formData,
                              unit: value,
                            });
                            setCustomUnit("");
                          }
                        }}
                      >
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit} className="font-mono">
                              {unit}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom__" className="font-mono text-primary font-bold">
                            + Custom Unit
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.unit === "__custom__" && (
                        <Input
                          placeholder="Enter custom unit (e.g., kg)"
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value)}
                          className="font-mono"
                          required
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultRate" className="font-mono text-xs">
                      RATE *
                    </Label>
                    <Input
                      id="defaultRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.default_rate === null || formData.default_rate === undefined ? "" : formData.default_rate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_rate: e.target.value === "" ? null : parseFloat(e.target.value),
                        })
                      }
                      placeholder="0.00"
                      className="font-mono"
                      required
                    />
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
                    placeholder="Additional details about the service..."
                    className="font-mono min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="font-mono"
                    disabled={createService.isPending || updateService.isPending}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={createService.isPending || updateService.isPending}
                    className="font-mono"
                  >
                    {createService.isPending || updateService.isPending
                      ? "PROCESSING..."
                      : editingService
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
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-mono text-sm"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px] font-mono text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">ALL CATEGORIES</SelectItem>
              {SERVICE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="font-mono text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
              LOADING SERVICES...
            </div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="font-mono text-sm text-muted-foreground">NO SERVICES FOUND</p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="font-mono text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              CREATE FIRST SERVICE
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border/50">
                  <TableHead className="font-mono text-xs font-bold w-[300px]">
                    SERVICE NAME
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    CATEGORY
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    UNIT
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    RATE
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    CREATED AT
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service: ServiceType, index: number) => (
                  <TableRow
                    key={service.id}
                    className="group hover:bg-muted/30 transition-colors border-border/50"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <TableCell className="font-mono">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{service.name}</span>
                        {service.description && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[250px]">
                            {service.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {service.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {service.unit}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {service.default_rate ? `${service.default_rate} AED` : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(service.created_at, "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(service)}
                          className="font-mono text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmToggle({
                            id: service.id,
                            name: service.name,
                            currentStatus: service.is_active
                          })}
                          className={`font-mono text-xs ${service.is_active ? "text-destructive" : "text-green-600"}`}
                        >
                          {service.is_active ? (
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
        title={confirmToggle?.currentStatus ? "Deactivate Service" : "Activate Service"}
        description={`Are you sure you want to ${confirmToggle?.currentStatus ? 'deactivate' : 'activate'} ${confirmToggle?.name}?`}
        confirmText={confirmToggle?.currentStatus ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        variant={confirmToggle?.currentStatus ? "destructive" : "default"}
      />
    </div>
  );
}