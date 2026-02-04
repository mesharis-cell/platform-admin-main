"use client";

import { useCountries, useCreateCountry, useDeleteCountry, useUpdateCountry } from "@/hooks/use-countries";
import {
  Plus,
  Tag,
  Building2,
  Edit,
  Search,
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
import { Country } from "@/types/country";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "date-fns";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function Countries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Country | null>(null);
  const [formData, setFormData] = useState({ name: "" });
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();
  const deleteCountry = useDeleteCountry();

  // Build query params for brands
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      limit: "100",
      offset: "0",
    };
    if (searchQuery) params.search_term = searchQuery;
    if (includeDeleted) params.include_inactive = "true";
    return params;
  }, [searchQuery, includeDeleted]);

  const { data, isLoading, error } = useCountries(queryParams);
  const countries = data?.data || [];

  const resetForm = () => {
    setEditingCountry(null);
    setIsCreateOpen(false);
    setFormData({ name: "" });
  };

  const openEditDialog = (country: Country) => {
    setEditingCountry(country);
    setFormData({ name: country.name });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (editingCountry) {
        const res = await updateCountry.mutateAsync({
          id: editingCountry.id,
          data: formData,
        });

        if (res.success) {
          resetForm();
          toast.success("Country updated successfully");
        }
      } else {
        const res = await createCountry.mutateAsync(formData);

        if (res.success) {
          resetForm();
          toast.success("Country created successfully");
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
        const res = await deleteCountry.mutateAsync({
          id: confirmDelete.id,
        });

        if (res.success) {
          toast.success("Country deleted successfully");
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
      <Tag className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
      <p className="font-mono text-sm text-muted-foreground">AN ERROR OCCURRED</p>
    </div>;
  }

  return (
    <div>
      <AdminHeader
        icon={Tag}
        title="COUNTRY REGISTRY"
        description="Countries"
        stats={{ label: "REGISTERED COUNTRIES", value: data?.meta.total }}
        actions={
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                setEditingCountry(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 font-mono">
                <Plus className="h-4 w-4" />
                NEW BRAND
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-mono">
                  {editingCountry ? "EDIT COUNTRY" : "CREATE NEW COUNTRY"}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {editingCountry
                    ? "Update country details and identity"
                    : "Add new country for asset categorization"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="countryName" className="font-mono text-xs">
                    COUNTRY NAME *
                  </Label>
                  <Input
                    id="countryName"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., United States"
                    required
                    className="font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingCountry(null);
                      resetForm();
                    }}
                    className="font-mono"
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCountry.isPending || updateCountry.isPending}
                    className="font-mono"
                  >
                    {createCountry.isPending || updateCountry.isPending
                      ? "PROCESSING..."
                      : editingCountry
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
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-mono text-sm"
            />
          </div>
          <Button
            variant={includeDeleted ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeDeleted(!includeDeleted)}
            className="gap-2 font-mono text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {includeDeleted ? "HIDE DELETED" : "SHOW DELETED"}
          </Button>
        </div>
      </div>

      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm font-mono text-muted-foreground animate-pulse">
              LOADING COUNTRIES...
            </div>
          </div>
        ) : countries.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="font-mono text-sm text-muted-foreground">NO COUNTRIES FOUND</p>
            <Button
              // onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="font-mono text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              CREATE FIRST COUNTRY
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border/50">
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
                {countries.map((country, index) => (
                  <TableRow
                    key={country.id}
                    className="group hover:bg-muted/30 transition-colors border-border/50"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {country.name || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(country.created_at, "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(country)}
                          className="font-mono text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(country)}
                          className="font-mono text-xs text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete Country
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
        title="Delete Country"
        description={`Are you sure you want to delete ${confirmDelete?.name}?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}