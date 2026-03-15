"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import type { WizardState } from "./types";

const CATEGORIES = ["Furniture", "Glassware", "Installation", "Decor"];
const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];

interface Props {
    state: WizardState;
    update: (fields: Partial<WizardState>) => void;
}

export function WizardFamilyForm({ state, update }: Props) {
    const { data: companiesData } = useCompanies();
    const { data: brandsData } = useBrands(
        state.companyId ? { company_id: state.companyId } : undefined
    );
    const companies = companiesData?.data || [];
    const brands = brandsData?.data || [];

    return (
        <div className="py-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Company *</Label>
                    <Select
                        value={state.companyId}
                        onValueChange={(v) => update({ companyId: v, brandId: "" })}
                    >
                        <SelectTrigger>
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
                    <Label>Brand</Label>
                    <Select
                        value={state.brandId || "__none__"}
                        onValueChange={(v) => update({ brandId: v === "__none__" ? "" : v })}
                        disabled={!state.companyId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">No brand</SelectItem>
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
                <Label>Item Name *</Label>
                <Input
                    value={state.itemName}
                    onChange={(e) => update({ itemName: e.target.value })}
                    placeholder="e.g. Pedestrian Fan, Metal Stand, Gasoline Canister"
                />
                {state.stockMode === "SERIALIZED" && (
                    <p className="text-xs text-muted-foreground">
                        The system will automatically name each unit: {state.itemName || "Item"} #1,
                        #2, etc.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={state.category} onValueChange={(v) => update({ category: v })}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                    value={state.itemDescription}
                    onChange={(e) => update({ itemDescription: e.target.value })}
                    rows={2}
                    placeholder="Brief description of this item"
                />
            </div>

            {/* Handling tags */}
            <div className="space-y-2">
                <Label>Handling Tags</Label>
                <div className="flex flex-wrap gap-2">
                    {HANDLING_TAGS.map((tag) => {
                        const active = state.handlingTags.includes(tag);
                        return (
                            <Badge
                                key={tag}
                                variant={active ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() =>
                                    update({
                                        handlingTags: active
                                            ? state.handlingTags.filter((t) => t !== tag)
                                            : [...state.handlingTags, tag],
                                    })
                                }
                            >
                                {tag}
                            </Badge>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
