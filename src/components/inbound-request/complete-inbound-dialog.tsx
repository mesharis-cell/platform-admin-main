"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCompleteInboundRequest } from "@/hooks/use-inbound-requests";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useZones } from "@/hooks/use-zones";
import { CheckCircle2 } from "lucide-react";

interface CompleteInboundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: string;
    companyId: string;
    platformId: string;
    onSuccess?: () => void;
}

export function CompleteInboundDialog({
    open,
    onOpenChange,
    requestId,
    companyId,
    platformId,
    onSuccess,
}: CompleteInboundDialogProps) {
    const completeRequest = useCompleteInboundRequest();

    // Fetch available warehouses filtered by platform
    const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses({
        platform_id: platformId,
    });

    // Selected state
    const [warehouseId, setWarehouseId] = useState("");
    const [zoneId, setZoneId] = useState("");

    // Fetch zones for selected warehouse AND company
    // Note: The backend validation says: "Zone not found or does not belong to the specified warehouse and company"
    // So we should filter zones by warehouse_id and company_id
    const { data: zones, isLoading: isLoadingZones } = useZones(
        warehouseId
            ? {
                  warehouse_id: warehouseId,
                  company_id: companyId,
                  platform_id: platformId,
              }
            : undefined
    );

    const handleSubmit = async () => {
        if (!warehouseId || !zoneId) {
            toast.error("Please select both a warehouse and a zone");
            return;
        }

        try {
            await completeRequest.mutateAsync({
                id: requestId,
                payload: {
                    warehouse_id: warehouseId,
                    zone_id: zoneId,
                },
            });
            toast.success("Inbound request completed successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to complete request");
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        setWarehouseId("");
        setZoneId("");
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        Complete New Stock Request
                    </DialogTitle>
                    <DialogDescription>
                        This will mark the request as completed, create assets for all items, and
                        generate an invoice.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="warehouse">Target Warehouse</Label>
                        <Select
                            value={warehouseId}
                            onValueChange={(value) => {
                                setWarehouseId(value);
                                setZoneId(""); // Reset zone when warehouse changes
                            }}
                        >
                            <SelectTrigger id="warehouse">
                                <SelectValue placeholder="Select warehouse..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingWarehouses ? (
                                    <div className="p-2 text-xs text-muted-foreground">
                                        Loading warehouses...
                                    </div>
                                ) : warehouses?.data ? (
                                    warehouses.data.map((wh) => (
                                        <SelectItem key={wh.id} value={wh.id}>
                                            {wh.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-muted-foreground">
                                        No warehouses found
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="zone">Target Zone</Label>
                        <Select value={zoneId} onValueChange={setZoneId} disabled={!warehouseId}>
                            <SelectTrigger id="zone">
                                <SelectValue
                                    placeholder={
                                        !warehouseId ? "Select warehouse first" : "Select zone..."
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingZones ? (
                                    <div className="p-2 text-xs text-muted-foreground">
                                        Loading zones...
                                    </div>
                                ) : zones?.data && zones.data.length > 0 ? (
                                    zones.data.map((zone) => (
                                        <SelectItem key={zone.id} value={zone.id}>
                                            {zone.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-muted-foreground">
                                        {warehouseId
                                            ? "No zones found for this company in this warehouse"
                                            : "Select warehouse first"}
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                        {warehouseId && zones?.data && zones.data.length === 0 && (
                            <p className="text-xs text-destructive mt-1">
                                No zones assigned to this company in the selected warehouse. Please
                                assign a zone first.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={completeRequest.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={completeRequest.isPending || !warehouseId || !zoneId}
                    >
                        {completeRequest.isPending ? "Completing..." : "Complete Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
