"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronRight, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetFamilies } from "@/hooks/use-asset-families";
import type { FamilySummary } from "./types";

interface Props {
    onSelect: (family: FamilySummary) => void;
}

export function WizardFamilySearch({ onSelect }: Props) {
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        timerRef.current = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(timerRef.current);
    }, [search]);

    const { data, isLoading } = useAssetFamilies(
        debounced ? { search_term: debounced, limit: "30" } : { limit: "30" }
    );
    const families = data?.data || [];

    function mapFamily(raw: any): FamilySummary {
        return {
            id: raw.id,
            name: raw.name,
            category: raw.category,
            stockMode: raw.stock_mode,
            images: raw.images || [],
            brand: raw.brand,
            company: raw.company,
            availableQuantity: Number(raw.available_quantity || 0),
            totalQuantity: Number(raw.total_quantity || 0),
            dimensions: raw.dimensions,
            weightPerUnit: raw.weight_per_unit ? Number(raw.weight_per_unit) : undefined,
            volumePerUnit: raw.volume_per_unit ? Number(raw.volume_per_unit) : undefined,
            packaging: raw.packaging,
            handlingTags: raw.handling_tags,
            description: raw.description,
        };
    }

    return (
        <div className="py-2 space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name, category, or brand..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 font-mono text-sm"
                    autoFocus
                />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2 -mx-1 px-1">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))
                ) : families.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        {debounced ? "No items match your search." : "No items found."}
                    </div>
                ) : (
                    families.map((raw: any) => {
                        const family = mapFamily(raw);
                        const img = family.images[0]?.url;
                        const isSerialized = family.stockMode === "SERIALIZED";

                        return (
                            <button
                                key={family.id}
                                onClick={() => onSelect(family)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors text-left"
                                data-testid="wizard-family-result"
                            >
                                <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                                    {img ? (
                                        <Image
                                            src={img}
                                            alt={family.name}
                                            width={48}
                                            height={48}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Package className="h-5 w-5 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{family.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-muted-foreground">
                                            {family.category}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] py-0">
                                            {isSerialized ? "Serialized" : "Pooled"}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {family.availableQuantity} avail
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
