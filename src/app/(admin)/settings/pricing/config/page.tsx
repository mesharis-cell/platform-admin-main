"use client";

/**
 * Pricing Configuration Settings
 * Manage warehouse operations rate per company or platform default
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import {
    pricingConfigKeys,
    useGetPlatformConfig,
    useRemoveCompanyOverride,
    useSetCompanyOverride,
    useSetPlatformDefault,
} from "@/hooks/use-pricing-config";
import { useCompanies } from "@/hooks/use-companies";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type { PricingConfig } from "@/types/hybrid-pricing";
import type { Company } from "@/types";
import { useQueries } from "@tanstack/react-query";

const fetchCompanyConfig = async (companyId: string): Promise<PricingConfig> => {
    try {
        const response = await apiClient.get(`/operations/v1/pricing/config/${companyId}`);
        return response.data.data;
    } catch (error) {
        throwApiError(error);
    }
};

export default function PricingConfigPage() {
    const { data: platformConfig, isLoading } = useGetPlatformConfig();
    const setPlatformDefault = useSetPlatformDefault();
    const setCompanyOverride = useSetCompanyOverride();
    const removeCompanyOverride = useRemoveCompanyOverride();
    const { data: companiesData, isLoading: companiesLoading } = useCompanies({ includeArchived: "false" });

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [newRate, setNewRate] = useState<string>("");
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
    const [companyRate, setCompanyRate] = useState<string>("");

    const companies = companiesData?.data || [];
    const companyConfigQueries = useQueries({
        queries: companies.map((company) => ({
            queryKey: pricingConfigKeys.company(company.id),
            queryFn: () => fetchCompanyConfig(company.id),
            enabled: companies.length > 0,
        })),
    });

    const companyConfigMap = useMemo(() => {
        const map: Record<string, PricingConfig | undefined> = {};
        companies.forEach((company, index) => {
            const config = companyConfigQueries[index]?.data;
            if (config) map[company.id] = config;
        });
        return map;
    }, [companies, companyConfigQueries]);

    const handleEditPlatform = () => {
        setNewRate(platformConfig?.warehouseOpsRate?.toString() || "25.20");
        setEditDialogOpen(true);
    };

    const handleSavePlatform = async () => {
        const rateNum = parseFloat(newRate);
        if (isNaN(rateNum) || rateNum < 0) {
            toast.error("Please enter a valid rate");
            return;
        }

        try {
            await setPlatformDefault.mutateAsync({ warehouseOpsRate: rateNum });
            toast.success("Platform default rate updated successfully");
            setEditDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to update rate");
        }
    };

    const openCompanyDialog = (company: Company | null) => {
        const defaultRate = platformConfig?.warehouseOpsRate?.toString() || "25.20";
        const config = company ? companyConfigMap[company.id] : undefined;

        setSelectedCompanyId(company?.id || "");
        setCompanyRate(config?.warehouseOpsRate?.toString() || defaultRate);
        setCompanyDialogOpen(true);
    };

    const handleSaveCompanyOverride = async () => {
        if (!selectedCompanyId) {
            toast.error("Please select a company");
            return;
        }

        const rateNum = parseFloat(companyRate);
        if (isNaN(rateNum) || rateNum < 0) {
            toast.error("Please enter a valid rate");
            return;
        }

        try {
            await setCompanyOverride.mutateAsync({
                companyId: selectedCompanyId,
                data: { warehouseOpsRate: rateNum },
            });
            toast.success("Company override updated successfully");
            setCompanyDialogOpen(false);
            setSelectedCompanyId("");
            setCompanyRate("");
        } catch (error: any) {
            toast.error(error.message || "Failed to update company override");
        }
    };

    const handleRemoveCompanyOverride = async (companyId: string) => {
        try {
            await removeCompanyOverride.mutateAsync(companyId);
            toast.success("Company override removed");
        } catch (error: any) {
            toast.error(error.message || "Failed to remove company override");
        }
    };

    const configLoading = companiesLoading || companyConfigQueries.some((query) => query.isLoading);

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Settings}
                title="PRICING CONFIGURATION"
                description="Warehouse Operations Rate"
            />

            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Platform Default Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-muted-foreground">Loading...</p>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <Label>Warehouse Operations Rate (AED per m³)</Label>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="text-2xl font-bold font-mono">
                                            {platformConfig?.warehouseOpsRate?.toFixed(2) ||
                                                "25.20"}{" "}
                                            AED/m³
                                        </div>
                                        <Button onClick={handleEditPlatform} variant="outline">
                                            Edit Rate
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        This rate covers: Picking (6.00) + Handling Out (9.60) +
                                        Handling In (9.60)
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Company Overrides Section - TODO */}
                <Card className="mt-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Company-Specific Overrides</CardTitle>
                            <Button variant="outline" onClick={() => openCompanyDialog(null)}>
                                Add Company Override
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {configLoading ? (
                            <p className="text-muted-foreground">Loading companies...</p>
                        ) : companies.length === 0 ? (
                            <p className="text-muted-foreground">No companies found.</p>
                        ) : (
                            <div className="space-y-2">
                                {companies.map((company) => {
                                    const config = companyConfigMap[company.id];
                                    const isOverride = config?.companyId === company.id;
                                    const rate = config?.warehouseOpsRate ?? platformConfig?.warehouseOpsRate;

                                    return (
                                        <div
                                            key={company.id}
                                            className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold">
                                                        {company.name}
                                                    </span>
                                                    <Badge variant={isOverride ? "default" : "outline"}>
                                                        {isOverride ? "Custom" : "Default"}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {isOverride
                                                        ? "Company override applied"
                                                        : "Using platform default"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-lg font-bold font-mono">
                                                    {rate?.toFixed(2) || "25.20"} AED/m³
                                                </span>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openCompanyDialog(company)}
                                                    >
                                                        {isOverride ? "Edit" : "Add"}
                                                    </Button>
                                                    {isOverride && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleRemoveCompanyOverride(company.id)
                                                            }
                                                        >
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Platform Default Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Platform Default Rate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="rate">
                                Warehouse Operations Rate (AED per m³){" "}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="rate"
                                type="number"
                                step="0.01"
                                min="0"
                                value={newRate}
                                onChange={(e) => setNewRate(e.target.value)}
                                placeholder="25.20"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Covers picking, handling out, and handling in operations
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditDialogOpen(false)}
                            disabled={setPlatformDefault.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSavePlatform}
                            disabled={setPlatformDefault.isPending}
                        >
                            {setPlatformDefault.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Company Override Dialog */}
            <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Company Override</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>
                                Company <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={selectedCompanyId}
                                onValueChange={(value) => setSelectedCompanyId(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((company) => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="companyRate">
                                Warehouse Operations Rate (AED per m³){" "}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="companyRate"
                                type="number"
                                step="0.01"
                                min="0"
                                value={companyRate}
                                onChange={(e) => setCompanyRate(e.target.value)}
                                placeholder="25.20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCompanyDialogOpen(false)}
                            disabled={setCompanyOverride.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveCompanyOverride}
                            disabled={setCompanyOverride.isPending}
                        >
                            {setCompanyOverride.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
