import { Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useState } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "../ui/dialog";
import { CreateTransportRateRequest, TripType } from "@/types/hybrid-pricing";
import { Plus } from "lucide-react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useCompanies } from "@/hooks/use-companies";
import { useCities } from "@/hooks/use-cities";
import { Input } from "../ui/input";
import { useListVehicleTypes } from "@/hooks/use-vehicle-types";
import { useCreateTransportRate } from "@/hooks/use-transport-rates";
import { useUpdateOrderPricing } from "@/hooks/use-orders";

const TRIP_TYPES = ["ONE_WAY", "ROUND_TRIP"] as const;

export const AddMissingTransportRate = ({ order }: { order: Order }) => {
    const { data: companies } = useCompanies();
    const { data: cities } = useCities();
    const { data: vehicleTypes } = useListVehicleTypes();
    const [showTransportRateDialog, setShowTransportRateDialog] = useState(false);
    const [formData, setFormData] = useState<CreateTransportRateRequest>({
        company_id: order.company.id,
        city_id: order.venue_city_id,
        area: "",
        trip_type: order.trip_type,
        vehicle_type_id: order.vehicle_type_id,
        rate: 0,
    });
    const transportRateMutation = useCreateTransportRate();
    const updateOrderPricingMutation = useUpdateOrderPricing();

    const handleAddTransportRate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.trip_type || !formData.vehicle_type_id || !formData.rate) {
            toast.error("Please fill all the required fields");
            return;
        }

        try {
            const res = await transportRateMutation.mutateAsync({
                ...formData,
                rate: Number(formData.rate),
            });

            if (res.id) {
                await updateOrderPricingMutation.mutateAsync({
                    orderId: order.id,
                    pricingId: order.order_pricing_id,
                    rate: Number(formData.rate),
                });
                toast.success("Transport rate added successfully");
                setShowTransportRateDialog(false);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to add transport rate");
        }
    };

    return (
        <>
            <Card className="border-2 border-red-500/50 bg-red-500/5">
                <CardHeader>
                    <CardTitle className="text-red-500">Transport Rate is Missing</CardTitle>
                </CardHeader>
                <CardContent>
                    <Dialog
                        open={showTransportRateDialog}
                        onOpenChange={(open) => setShowTransportRateDialog(open)}
                    >
                        <DialogTrigger asChild>
                            <Button className="gap-2 font-mono">
                                <Plus className="h-4 w-4" />
                                ADD RATE
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="font-mono">CREATE NEW RATE</DialogTitle>
                                <DialogDescription className="font-mono text-xs">
                                    Add new transport rate configuration
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddTransportRate} className="space-y-6">
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
                                        >
                                            <SelectTrigger className="font-mono">
                                                <SelectValue placeholder="All Companies" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="font-mono">
                                                    All Companies
                                                </SelectItem>
                                                {companies?.data?.map((company) => (
                                                    <SelectItem
                                                        key={company.id}
                                                        value={company.id}
                                                        className="font-mono"
                                                    >
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
                                            disabled
                                            required
                                        >
                                            <SelectTrigger className="font-mono">
                                                <SelectValue placeholder="Select City" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {cities?.data?.map((city) => (
                                                    <SelectItem
                                                        key={city.id}
                                                        value={city.id}
                                                        className="font-mono"
                                                    >
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
                                            disabled
                                        >
                                            <SelectTrigger className="font-mono">
                                                <SelectValue placeholder="Select Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRIP_TYPES.map((type) => (
                                                    <SelectItem
                                                        key={type}
                                                        value={type}
                                                        className="font-mono"
                                                    >
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
                                            disabled
                                        >
                                            <SelectTrigger className="font-mono">
                                                <SelectValue placeholder="Select Vehicle" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicleTypes?.data.map((type) => (
                                                    <SelectItem
                                                        key={type.id}
                                                        value={type.id}
                                                        className="font-mono"
                                                    >
                                                        {type.name} ({type.vehicle_size})
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
                                        step="1"
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
                                    <p className="text-xs text-muted-foreground font-mono">
                                        Min (1) {formData.trip_type} trip
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowTransportRateDialog(false)}
                                        className="font-mono"
                                        disabled={
                                            transportRateMutation.isPending ||
                                            updateOrderPricingMutation.isPending
                                        }
                                    >
                                        CANCEL
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            transportRateMutation.isPending ||
                                            updateOrderPricingMutation.isPending
                                        }
                                        className="font-mono"
                                    >
                                        {transportRateMutation.isPending ||
                                        updateOrderPricingMutation.isPending
                                            ? "PROCESSING..."
                                            : "CREATE RATE"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </>
    );
};
