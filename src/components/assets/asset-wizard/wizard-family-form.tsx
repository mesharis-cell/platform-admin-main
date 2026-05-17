"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import { CategoryCombobox } from "@/components/assets/category-combobox";
import { cn } from "@/lib/utils";
import type { WizardState } from "./types";

const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];

interface Props {
    state: WizardState;
    update: (fields: Partial<WizardState>) => void;
}

export function WizardFamilyForm({ state, update }: Props) {
    const [brandOpen, setBrandOpen] = useState(false);
    const { data: companiesData } = useCompanies();
    const { data: brandsData } = useBrands(
        state.companyId ? { company_id: state.companyId, limit: "200" } : undefined
    );
    const companies = companiesData?.data || [];
    const brands = brandsData?.data || [];
    const selectedBrand = brands.find((brand) => brand.id === state.brandId) || null;

    return (
        <div className="py-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Company *</Label>
                    <Select
                        value={state.companyId}
                        onValueChange={(value) => update({ companyId: value, brandId: "" })}
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

                <div className="space-y-2">
                    <Label>Brand</Label>
                    <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={brandOpen}
                                disabled={!state.companyId}
                                className="w-full justify-between font-normal"
                            >
                                <span
                                    className={cn(
                                        "truncate",
                                        !selectedBrand && "text-muted-foreground"
                                    )}
                                >
                                    {selectedBrand ? selectedBrand.name : "Select brand"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search brand..." />
                                <CommandList>
                                    <CommandEmpty>No brand matches.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="__none__"
                                            onSelect={() => {
                                                update({ brandId: "" });
                                                setBrandOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    !state.brandId ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="text-muted-foreground">No brand</span>
                                        </CommandItem>
                                        {brands.map((brand) => (
                                            <CommandItem
                                                key={brand.id}
                                                value={brand.name}
                                                onSelect={() => {
                                                    update({ brandId: brand.id });
                                                    setBrandOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        state.brandId === brand.id
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {brand.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Asset Name *</Label>
                <Input
                    value={state.itemName}
                    onChange={(event) => update({ itemName: event.target.value })}
                    placeholder="e.g. Red Bull Fridge, Fan, Gasoline Canister"
                />
                {state.stockMode === "SERIALIZED" && (
                    <p className="text-xs text-muted-foreground">
                        Multiple units will be named with numeric suffixes automatically.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Category *</Label>
                <CategoryCombobox
                    companyId={state.companyId || null}
                    value={state.category_id}
                    newCategory={state.new_category}
                    onChange={(categoryId, newCategory) =>
                        update({ category_id: categoryId, new_category: newCategory })
                    }
                />
            </div>

            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                    value={state.itemDescription}
                    onChange={(event) => update({ itemDescription: event.target.value })}
                    rows={2}
                    placeholder="Brief description of this asset"
                />
            </div>

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
                                            ? state.handlingTags.filter((item) => item !== tag)
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
