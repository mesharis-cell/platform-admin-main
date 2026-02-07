"use client";

import { useCities, useCreateCity, useDeleteCity, useUpdateCity } from "@/hooks/use-cities";
import { useCountries } from "@/hooks/use-countries";
import {
  Plus,
  Building2,
  Edit,
  Search,
  Trash2,
  MapPin,
  Globe,
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
import { City } from "@/types/country";
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

export default function Cities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<City | null>(null);
  const [formData, setFormData] = useState({ name: "", country_id: "" });

  const createCity = useCreateCity();
  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();

  // Query params for cities
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      limit: "100",
      offset: "0",
    };
    if (searchQuery) params.search_term = searchQuery;
    if (selectedCountry && selectedCountry !== "all") params.country_id = selectedCountry;
    return params;
  }, [searchQuery, selectedCountry]);

  // Fetch cities
  const { data: citiesData, isLoading, error } = useCities(queryParams);
  const cities = citiesData?.data || [];

  // Fetch countries for dropdown
  const { data: countriesData } = useCountries({ limit: "100" });
  const countries = countriesData?.data || [];

  const resetForm = () => {
    setEditingCity(null);
    setIsCreateOpen(false);
    setFormData({ name: "", country_id: "" });
  };

  const openEditDialog = (city: City) => {
    setEditingCity(city);
    setFormData({ name: city.name, country_id: city.country_id });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name || !formData.country_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingCity) {
        const res = await updateCity.mutateAsync({
          id: editingCity.id,
          data: formData,
        });

        if (res.success) {
          resetForm();
          toast.success("City updated successfully");
        }
      } else {
        const res = await createCity.mutateAsync(formData);

        if (res.success) {
          resetForm();
          toast.success("City created successfully");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  const handleDeleteRestore = async () => {
    try {
      if (confirmDelete) {
        const res = await deleteCity.mutateAsync({
          id: confirmDelete.id,
        });

        if (res.success) {
          toast.success("City deleted successfully");
          setConfirmDelete(null);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  if (error) {
    return <div className="text-center py-12 space-y-3">
      <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
      <p className="font-mono text-sm text-muted-foreground">AN ERROR OCCURRED</p>
    </div>;
  }

  return (
    <div>
      <AdminHeader
        icon={MapPin}
        title="CITY REGISTRY"
        description="Cities"
        stats={{ label: "REGISTERED CITIES", value: cities.length }}
        actions={
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                setEditingCity(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 font-mono">
                <Plus className="h-4 w-4" />
                NEW CITY
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-mono">
                  {editingCity ? "EDIT CITY" : "CREATE NEW CITY"}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {editingCity
                    ? "Update city details and location"
                    : "Add new city for asset localization"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cityName" className="font-mono text-xs">
                    CITY NAME *
                  </Label>
                  <Input
                    id="cityName"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., Dubai"
                    required
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="countryId" className="font-mono text-xs">
                    COUNTRY *
                  </Label>
                  <Select
                    value={formData.country_id}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        country_id: value
                      })
                    }
                    required
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id} className="font-mono">
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingCity(null);
                      resetForm();
                    }}
                    disabled={createCity.isPending || updateCity.isPending}
                    className="font-mono"
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCity.isPending || updateCity.isPending}
                    className="font-mono"
                  >
                    {createCity.isPending || updateCity.isPending
                      ? "PROCESSING..."
                      : editingCity
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
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-mono text-sm"
            />
          </div>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-[200px] font-mono text-xs">
              <SelectValue placeholder="Filter by Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">ALL COUNTRIES</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.id} className="font-mono text-xs">
                  {country.name.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm font-mono text-muted-foreground animate-pulse">
              LOADING CITIES...
            </div>
          </div>
        ) : cities.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="font-mono text-sm text-muted-foreground">NO CITIES FOUND</p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="font-mono text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              CREATE FIRST CITY
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border/50">
                  <TableHead className="font-mono text-xs font-bold">
                    CITY
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    COUNTRY
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    CREATED AT
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.map((city, index) => (
                  <TableRow
                    key={city.id}
                    className="group hover:bg-muted/30 transition-colors border-border/50"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {city.name || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {city.country?.name || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(city.created_at, "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(city)}
                          className="font-mono text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(city)}
                          className="font-mono text-xs text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete City
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        onConfirm={handleDeleteRestore}
        title="Delete City"
        description={`Are you sure you want to delete ${confirmDelete?.name}?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
