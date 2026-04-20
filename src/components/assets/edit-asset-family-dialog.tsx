"use client";

import { useState, useEffect } from "react";
import { useBrands } from "@/hooks/use-brands";
import { useTeams } from "@/hooks/use-teams";
import { useUpdateAssetFamily } from "@/hooks/use-asset-families";
import { Layers3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import type { AssetFamily } from "@/types/asset-family";
import { CategoryCombobox } from "@/components/assets/category-combobox";
const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];

interface EditAssetFamilyDialogProps {
    family: AssetFamily | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditAssetFamilyDialog({
    family,
    open,
    onOpenChange,
    onSuccess,
}: EditAssetFamilyDialogProps) {
    const [formData, setFormData] = useState({
        brand_id: "" as string | null,
        team_id: "" as string | null,
        name: "",
        company_item_code: "" as string | null,
        description: "" as string | null,
        category_id: null as string | null,
        new_category: null as { name: string; color?: string } | null,
        stock_mode: "SERIALIZED" as "SERIALIZED" | "POOLED",
        packaging: "" as string | null,
        handling_tags: [] as string[],
        is_active: true,
    });

    useEffect(() => {
        if (family && open) {
            setFormData({
                brand_id: family.brand_id || null,
                team_id: family.team_id || null,
                name: family.name || "",
                company_item_code: family.company_item_code || null,
                description: family.description || null,
                category_id: family.category?.id || null,
                new_category: null,
                stock_mode: (family.stock_mode as "SERIALIZED" | "POOLED") || "SERIALIZED",
                packaging: family.packaging || null,
                handling_tags: family.handling_tags || [],
                is_active: family.is_active ?? true,
            });
        }
    }, [family, open]);

    const { data: brandsData } = useBrands(
        family?.company_id ? { company_id: family.company_id } : undefined
    );
    const { data: teamsData } = useTeams(
        family?.company_id ? { company_id: family.company_id } : undefined
    );
    const brands = brandsData?.data || [];
    const teams = teamsData?.data || [];
    const updateMutation = useUpdateAssetFamily();

    function toggleHandlingTag(tag: string) {
        setFormData((prev) => ({
            ...prev,
            handling_tags: prev.handling_tags.includes(tag)
                ? prev.handling_tags.filter((t) => t !== tag)
                : [...prev.handling_tags, tag],
        }));
    }

    async function handleSubmit() {
        if (
            !family ||
            !formData.name?.trim() ||
            (!formData.category_id && !formData.new_category)
        ) {
            toast.error("Name and category are required");
            return;
        }
        try {
            const payload: Record<string, unknown> = {
                brand_id: formData.brand_id || null,
                team_id: formData.team_id || null,
                name: formData.name.trim(),
                company_item_code: formData.company_item_code?.trim() || null,
                description: formData.description?.trim() || null,
                stock_mode: formData.stock_mode,
                packaging: formData.packaging?.trim() || null,
                handling_tags: formData.handling_tags,
                is_active: formData.is_active,
            };
            if (formData.new_category) {
                payload.new_category = formData.new_category;
            } else {
                payload.category_id = formData.category_id;
            }
            await updateMutation.mutateAsync({ id: family.id, data: payload });
            toast.success("Asset family updated");
            onOpenChange(false);
            onSuccess?.();
        } catch {
            toast.error("Failed to update asset family");
        }
    }

    if (!family) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-mono flex items-center gap-2">
                        <Layers3 className="h-5 w-5 text-primary" />
                        Edit Asset Family
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs">
                        Update catalog identity. Company cannot be changed.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                        <Label className="font-mono text-xs">Company Item Code</Label>
                        <Input
                            value={formData.company_item_code || ""}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    company_item_code: e.target.value || null,
                                })
                            }
                            placeholder="External or client-specific item code"
                            className="font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">Category *</Label>
                        <CategoryCombobox
                            companyId={family?.company_id || null}
                            value={formData.category_id}
                            newCategory={formData.new_category}
                            onChange={(categoryId, newCat) =>
                                setFormData({
                                    ...formData,
                                    category_id: categoryId,
                                    new_category: newCat,
                                })
                            }
                        />
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
                                <SelectItem value="SERIALIZED">Serialized</SelectItem>
                                <SelectItem value="POOLED">Pooled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">Team</Label>
                            <Select
                                value={formData.team_id || "__none__"}
                                onValueChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        team_id: v === "__none__" ? null : v,
                                    })
                                }
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
                            disabled={updateMutation.isPending}
                            className="font-mono"
                        >
                            {updateMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
