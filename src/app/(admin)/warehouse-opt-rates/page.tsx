"use client";

import {
  Wrench,
  Edit,
  Search,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCompanies, useUpdateCompany } from "@/hooks/use-companies";
import { Company } from "@/types";

export default function WarehouseOptRates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editCompany, setEditCompany] = useState<Company | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Company>>({
    id: null,
    warehouse_ops_rate: null,
  });

  const updateCompany = useUpdateCompany();

  // Query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search_term = searchQuery;
    return params;
  }, [searchQuery]);

  const { data: companiesData, isLoading, error } = useCompanies(queryParams);
  const companies = companiesData?.data || [];

  const resetForm = () => {
    setEditCompany(null);
    setFormData({
      id: null,
      warehouse_ops_rate: null,
    });
  };

  const openEditDialog = (company: Company) => {
    setEditCompany(company);
    setFormData({
      id: company.id,
      warehouse_ops_rate: company.warehouse_ops_rate,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id) {
      toast.error("Company ID is required");
      return;
    }

    try {
      await updateCompany.mutateAsync({
        id: formData.id,
        data: { warehouse_ops_rate: formData.warehouse_ops_rate },
      });
      toast.success("Warehouse operation rate updated successfully");
      resetForm();
    } catch (error) {
      toast.error("Failed to update warehouse operation rate");
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
        title="WAREHOUSE OPERATION RATES"
        description="Manage warehouse operation rates"
        stats={{ label: "TOTAL WAREHOUSE OPERATION RATES", value: companies.length }}
      />

      {/* Control Panel */}
      <div className="border-b border-border bg-card px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm font-mono text-muted-foreground animate-pulse">
              LOADING SERVICES...
            </div>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border/50">
                  <TableHead className="font-mono text-xs font-bold w-[300px]">
                    COMPANY NAME
                  </TableHead>
                  <TableHead className="font-mono text-xs font-bold">
                    WAREHOUSE OPS RATE
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company: Company, index: number) => (
                  <TableRow
                    key={company.id}
                    className="group hover:bg-muted/30 transition-colors border-border/50"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <TableCell className="font-mono">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {company.warehouse_ops_rate ? `${company.warehouse_ops_rate} AED` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(company)}
                          className="font-mono text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
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

      <Dialog
        open={!!editCompany}
        onOpenChange={(open) => {
          setEditCompany(open ? editCompany : null);
          if (!open) {
            setEditCompany(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[calc(100vh-10rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              EDIT COMPANY
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Update company details and configuration
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono text-xs">
                COMPANY NAME *
              </Label>
              <Input
                id="name"
                value={formData.name}
                disabled
                placeholder="e.g., Pernod Ricard"
                required
                className="font-mono"
              />
            </div>

            {/* Warehouse Ops Rate */}
            <div className="space-y-2">
              <Label
                htmlFor="warehouse_ops_rate"
                className="font-mono text-xs flex items-center gap-2"
              >
                WAREHOUSE OPS RATE
              </Label>
              <Input
                id="warehouse_ops_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.warehouse_ops_rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    warehouse_ops_rate: parseFloat(
                      e.target.value
                    ),
                  })
                }
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground font-mono">
                Default rate applied to orders (2 decimal places)
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditCompany(null);
                  resetForm();
                }}
                disabled={updateCompany.isPending}
                className="font-mono"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                disabled={updateCompany.isPending}
                className="font-mono"
              >
                {updateCompany.isPending
                  ? "PROCESSING..."
                  : editCompany
                    ? "UPDATE"
                    : "CREATE"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}