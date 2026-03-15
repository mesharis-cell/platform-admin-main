"use client";

import { useState } from "react";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import { useTeams } from "@/hooks/use-teams";
import { useCreateAssetFamily } from "@/hooks/use-asset-families";
import { Layers3, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

const DEFAULT_CATEGORIES = ["Furniture", "Glassware", "Installation", "Decor"];
const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];

interface CreateAssetFamilyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateAssetFamilyDialog({
    open,
    onOpenChange,
    onSuccess,
}: CreateAssetFamilyDialogProps) {
    const [formData, setFormData] = useState({
        company_id: "",
        brand_id: "" as string | null,
        team_id: "" as string | null,
        name: "",
        description: "" as string | null,
        category: "",
        stock_mode: "SERIALIZED" as "SERIALIZED" | "POOLED",
        packaging: "" as string | null,
        weight_per_unit: null as number | null,
        volume_per_unit: null as number | null,
        handling_tags: [] as string[],
        is_active: true,
    });

    const { data: companiesData } = useCompanies({ limit: "100" });
    const { data: brandsData } = useBrands(
        formData.company_id ? { company_id: formData.company_id } : undefined
    );
    const { data: teamsData } = useTeams(
        formData.company_id ? { company_id: formData.company_id } : undefined
    );
    const companies = companiesData?.data || [];
    const brands = brandsData?.data || [];
    const teams = teamsData?.data || [];
    const createMutation = useCreateAssetFamily();

    function toggleHandlingTag(tag: string) {
        setFormData((prev) => ({
            ...prev,
            handling_tags: prev.handling_tags.includes(tag)
                ? prev.handling_tags.filter((t) => t !== tag)
                : [...prev.handling_tags, tag],
        }));
    }

    async function handleSubmit() {
        if (!formData.company_id || !formData.name?.trim() || !formData.category?.trim()) {
            toast.error("Company, name, and category are required");
            return;
        }
        try {
            const payload = {
                company_id: formData.company_id,
                brand_id: formData.brand_id || null,
                team_id: formData.team_id || null,
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                category: formData.category.trim(),
                stock_mode: formData.stock_mode,
                packaging: formData.packaging?.trim() || null,
                weight_per_unit: formData.weight_per_unit,
                volume_per_unit: formData.volume_per_unit,
                handling_tags: formData.handling_tags,
                is_active: formData.is_active,
            };
            await createMutation.mutateAsync(payload);
            toast.success("Asset family created");
            onOpenChange(false);
            onSuccess?.();
            setFormData({
                company_id: "",
                brand_id: null,
                team_id: null,
                name: "",
                description: null,
                category: "",
                stock_mode: "SERIALIZED",
                packaging: null,
                weight_per_unit: null,
                volume_per_unit: null,
                handling_tags: [],
                is_active: true,
            });
        } catch {
            toast.error("Failed to create asset family");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="font-mono">
                    <Layers3 className="mr-2 h-4 w-4" />
                    Create Family
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-mono flex items-center gap-2">
                        <Layers3 className="h-5 w-5 text-primary" />
                        Create Asset Family
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs">
                        Add a new catalog identity. Stock records can be added to this family later.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">Company *</Label>
                            <Select
                                value={formData.company_id}
                                onValueChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        company_id: v,
                                        brand_id: null,
                                        team_id: null,
                                    })
                                }
                            >
                                <SelectTrigger className="font-mono">
                                    <SelectValue placeholder="Select company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">Brand</Label>
                            <Select
                                value={formData.brand_id || "__none__"}
                                onValueChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        brand_id: v === "__none__" ? null : v,
                                    })
                                }
                                disabled={!formData.company_id}
                            >
                                <SelectTrigger className="font-mono">
                                    <SelectValue placeholder="Select brand" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {brands.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">Name *</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Pedestrian Fan"
                            className="font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">Category *</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(v) => setFormData({ ...formData, category: v })}
                        >
                            <SelectTrigger className="font-mono">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {DEFAULT_CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">Stock Mode *</Label>
                        <Select
                            value={formData.stock_mode}
                            onValueChange={(v: "SERIALIZED" | "POOLED") =>
                                setFormData({ ...formData, stock_mode: v })
                            }
                        >
                            <SelectTrigger className="font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SERIALIZED">
                                    Serialized (one unit per record)
                                </SelectItem>
                                <SelectItem value="POOLED">
                                    Pooled (multiple units per record)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">Team</Label>
                        <Select
                            value={formData.team_id || "__none__"}
                            onValueChange={(v) =>
                                setFormData({ ...formData, team_id: v === "__none__" ? null : v })
                            }
                            disabled={!formData.company_id}
                        >
                            <SelectTrigger className="font-mono">
                                <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {teams.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">Description</Label>
                        <Textarea
                            value={formData.description || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value || null })
                            }
                            placeholder="Optional description"
                            className="font-mono resize-none"
                            rows={2}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">Handling Tags</Label>
                        <div className="flex flex-wrap gap-2">
                            {HANDLING_TAGS.map((tag) => (
                                <Button
                                    key={tag}
                                    type="button"
                                    variant={
                                        formData.handling_tags.includes(tag) ? "default" : "outline"
                                    }
                                    size="sm"
                                    className="font-mono"
                                    onClick={() => toggleHandlingTag(tag)}
                                >
                                    {tag}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="font-mono"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending}
                            className="font-mono"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            Create Family
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
