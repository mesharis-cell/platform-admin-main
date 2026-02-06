"use client";

import { useListTransportRates, useCreateTransportRate, useUpdateTransportRate, useDeleteTransportRate } from "@/hooks/use-transport-rates";
import { useCities } from "@/hooks/use-cities";
import { useCompanies } from "@/hooks/use-companies";
import {
  Plus,
  Truck,
  Edit,
  Trash2,
  Power,
  PowerOff,
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
import { TransportRate, TripType, CreateTransportRateRequest } from "@/types/hybrid-pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { removeUnderScore } from "@/lib/utils/helper";
import { useListVehicleTypes } from "@/hooks/use-vehicle-types";

const TRIP_TYPES: TripType[] = ["ONE_WAY", "ROUND_TRIP"];

export default function TransportRates() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TransportRate | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ id: string, name: string, currentStatus: boolean } | null>(null);

  // Filters
  const [selectedEmirate, setSelectedEmirate] = useState<string>("all");
  const [selectedTripType, setSelectedTripType] = useState<string>("all");
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateTransportRateRequest>>({
    company_id: null,
    city_id: "",
    area: "",
    trip_type: "ONE_WAY",
    vehicle_type_id: "",
    rate: 0,
  });

  const { data: vehicleTypesData } = useListVehicleTypes({ limit: "100" });
  const vehicleTypes = vehicleTypesData?.data || [];

  const createRate = useCreateTransportRate();
  const updateRate = useUpdateTransportRate();
  const deleteRate = useDeleteTransportRate();

  // Reference data hooks
  const { data: citiesData } = useCities({ limit: "100" });
  const cities = citiesData?.data || [];

  const { data: companiesData } = useCompanies({ limit: "100" });
  const companies = companiesData?.data || [];

  // Query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (selectedEmirate && selectedEmirate !== "all") params.emirate = selectedEmirate;
    if (selectedTripType && selectedTripType !== "all") params.trip_type = selectedTripType;
    if (selectedVehicleType && selectedVehicleType !== "all") params.vehicle_type = selectedVehicleType;
    if (selectedCompany && selectedCompany !== "all") params.company_id = selectedCompany;
    if (includeInactive) params.include_inactive = "true";
    return params;
  }, [selectedEmirate, selectedTripType, selectedVehicleType, selectedCompany, includeInactive]);

  const { data: ratesData, isLoading, error } = useListTransportRates(queryParams);
  const rates = ratesData?.data || [];

  const resetForm = () => {
    setEditingRate(null);
    setIsCreateOpen(false);
    setFormData({
      company_id: null,
      city_id: "",
      area: "",
      trip_type: "ONE_WAY",
      vehicle_type_id: "",
      rate: 0,
    });
  };

  const openEditDialog = (rate: TransportRate) => {
    setEditingRate(rate);
    setFormData({
      company_id: rate?.company?.id,
      city_id: rate?.city?.id, // This will be the city ID based on requirement "emirate means city id"
      area: rate?.area || "",
      trip_type: rate?.trip_type,
      vehicle_type_id: rate?.vehicle_type.id,
      rate: rate?.rate,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.city_id || !formData.trip_type || !formData.vehicle_type_id || formData.rate === undefined) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload: CreateTransportRateRequest = {
      company_id: formData.company_id === "all" || formData.company_id === "" ? null : formData.company_id,
      city_id: formData.city_id,
      area: formData.area || null,
      trip_type: formData.trip_type,
      vehicle_type_id: formData.vehicle_type_id,
      rate: Number(formData.rate),
    };

    try {
      if (editingRate) {
        await updateRate.mutateAsync({
          id: editingRate.id,
          data: {
            rate: payload.rate,
            // Assuming we only update rate and active status generally, but full update might be supported
            // Based on types UpdateTransportRateRequest only has rate and isActive
            // If the user wants to update other fields, the backend must support it or we might need to recreate
            // For now, consistent with Type definition:
          },
        });
        toast.success("Transport rate updated successfully");
        resetForm();
      } else {
        await createRate.mutateAsync(payload);
        toast.success("Transport rate created successfully");
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const handleToggleStatus = async () => {
    try {
      if (confirmToggle) {
        if (confirmToggle.currentStatus) {
          await deleteRate.mutateAsync(confirmToggle.id);
        } else {
          await updateRate.mutateAsync({
            id: confirmToggle.id,
            data: {
              isActive: true
            }
          });
        }
        toast.success(`Rate ${!confirmToggle.currentStatus ? 'activated' : 'deactivated'} successfully`);
        setConfirmToggle(null);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  if (error) {
    return <div className="text-center py-12 space-y-3">
      <Truck className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
      <p className="font-mono text-sm text-muted-foreground">AN ERROR OCCURRED</p>
    </div>;
  }

  return (
    <div>
      <AdminHeader
        icon={Truck}
        title="TRANSPORT RATES"
        description="Manage logistics and transport pricing"
        stats={{ label: "TOTAL RATES", value: rates.length }}
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
                NEW RATE
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-mono">
                  {editingRate ? "EDIT RATE" : "CREATE NEW RATE"}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {editingRate
                    ? "Update transport pricing details"
                    : "Add new transport rate configuration"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="font-mono text-xs">
                      COMPANY (OPTIONAL)
                    </Label>
                    <Select
                      value={formData.company_id || "all"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          company_id: value === "all" ? null : value,
                        })
                      }
                      disabled={!!editingRate} // Assuming ID fields shouldn't change on edit per types
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="All Companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-mono">All Companies</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id} className="font-mono">
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="font-mono text-xs">
                      CITY (EMIRATE) *
                    </Label>
                    <Select
                      value={formData.city_id}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          city_id: value,
                        })
                      }
                      disabled={!!editingRate}
                      required
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select City" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id} className="font-mono">
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Area is optional and text based */}
                <div className="space-y-2">
                  <Label htmlFor="area" className="font-mono text-xs">
                    AREA (OPTIONAL)
                  </Label>
                  <Input
                    id="area"
                    value={formData.area || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        area: e.target.value,
                      })
                    }
                    placeholder="Specific area or district"
                    className="font-mono"
                    disabled={!!editingRate}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tripType" className="font-mono text-xs">
                      TRIP TYPE *
                    </Label>
                    <Select
                      value={formData.trip_type}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          trip_type: value as TripType,
                        })
                      }
                      disabled={!!editingRate}
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIP_TYPES.map((type) => (
                          <SelectItem key={type} value={type} className="font-mono">
                            {type.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type" className="font-mono text-xs">
                      VEHICLE TYPE *
                    </Label>
                    <Select
                      value={formData.vehicle_type_id}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          vehicle_type_id: value,
                        })
                      }
                      disabled={!!editingRate}
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select Vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id} className="font-mono">
                            {type.name} ({removeUnderScore(type.vehicle_size)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate" className="font-mono text-xs">
                    RATE (AED) *
                  </Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rate: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className="font-mono"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="font-mono"
                    disabled={createRate.isPending || updateRate.isPending}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRate.isPending || updateRate.isPending}
                    className="font-mono"
                  >
                    {createRate.isPending || updateRate.isPending
                      ? "PROCESSING..."
                      : editingRate
                        ? "UPDATE RATE"
                        : "CREATE RATE"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Control Panel */}
      <div className="border-b border-border bg-card px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* Filter: City */}
          <Select value={selectedEmirate} onValueChange={setSelectedEmirate}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">ALL CITIES</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id} className="font-mono text-xs">
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter: Trip Type */}
          <Select value={selectedTripType} onValueChange={setSelectedTripType}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="All Trip Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">ALL TRIPS</SelectItem>
              {TRIP_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="font-mono text-xs">
                  {removeUnderScore(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter: Vehicle Type */}
          <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">ALL VEHICLES</SelectItem>
              {vehicleTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id} className="font-mono text-xs">
                  {type.name} ({removeUnderScore(type.vehicle_size)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter: Company */}
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">ALL COMPANIES</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id} className="font-mono text-xs">
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>


          <Button
            variant={includeInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeInactive(!includeInactive)}
            className="gap-2 font-mono text-xs w-full"
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
              LOADING RATES...
            </div>
          </div>
        ) : rates.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="font-mono text-sm text-muted-foreground">NO RATES FOUND</p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="font-mono text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              CREATE FIRST RATE
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border/50">
                  <TableHead className="font-mono text-xs font-bold">
                    COMPANY
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    CITY
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    AREA
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    VEHICLE TYPE
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    TRIP TYPE
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
                {rates.map((rate: TransportRate, index: number) => (
                  <TableRow
                    key={rate.id}
                    className="group hover:bg-muted/30 transition-colors border-border/50"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <TableCell className="font-mono">
                      <span className="text-xs">{rate?.company?.name || "All Companies"}</span>
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{rate?.city?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{rate?.area}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      <span className="font-mono font-medium w-fit">
                        {removeUnderScore(rate.trip_type)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      <span className="font-mono font-medium w-fit">
                        {removeUnderScore(rate.vehicle_type.name)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold">
                      {rate.rate} AED
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(rate.created_at, "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(rate)}
                          className="font-mono text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmToggle({
                            id: rate.id,
                            name: `${rate.rate} AED`,
                            currentStatus: rate.is_active
                          })}
                          className={`font-mono text-xs ${rate.is_active ? "text-destructive" : "text-green-600"}`}
                        >
                          {rate.is_active ? (
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
        title={confirmToggle?.currentStatus ? "Deactivate Rate" : "Activate Rate"}
        description={`Are you sure you want to ${confirmToggle?.currentStatus ? 'deactivate' : 'activate'} this rate?`}
        confirmText={confirmToggle?.currentStatus ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        variant={confirmToggle?.currentStatus ? "destructive" : "default"}
      />
    </div>
  );
}