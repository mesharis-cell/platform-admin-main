"use client";

import { useEffect, useRef, useState } from "react";
import { useAssetFamilies } from "@/hooks/use-asset-families";
import { useUpdateAsset } from "@/hooks/use-assets";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Layers3 } from "lucide-react";
import { toast } from "sonner";
import type { AssetFamily } from "@/types/asset-family";

interface MoveToFamilyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: {
        id: string;
        name: string;
        family_id?: string | null;
        company?: { id: string; name?: string } | null;
        family?: { stock_mode?: string } | null;
    };
    currentFamilyName?: string;
    onSuccess?: () => void;
}

export function MoveToFamilyModal({
    open,
    onOpenChange,
    asset,
    currentFamilyName,
    onSuccess,
}: MoveToFamilyModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedFamily, setSelectedFamily] = useState<AssetFamily | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const updateAsset = useUpdateAsset();

    const currentStockMode = asset.family?.stock_mode || null;

    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setDebouncedSearch("");
            setSelectedFamily(null);
        }
    }, [open]);

    const queryParams: Record<string, string> = { limit: "30" };
    if (debouncedSearch) queryParams.search_term = debouncedSearch;
    if (asset.company?.id) queryParams.company_id = asset.company.id;

    const { data, isLoading } = useAssetFamilies(queryParams);
    const families = data?.data || [];

    async function handleConfirm() {
        if (!selectedFamily) return;
        try {
            await updateAsset.mutateAsync({
                id: asset.id,
                data: { family_id: selectedFamily.id },
            });
            toast.success(`Moved "${asset.name}" to family "${selectedFamily.name}"`);
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Failed to move asset";
            toast.error(message);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-mono">
                        Move {asset.name}
                    </DialogTitle>
                    {currentFamilyName && (
                        <p className="text-xs font-mono text-muted-foreground">
                            Current family: {currentFamilyName}
                        </p>
                    )}
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search families..."
                        className="pl-10 font-mono"
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[360px] space-y-1">
                    {isLoading ? (
                        <div className="space-y-2 p-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : families.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Layers3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm font-mono text-muted-foreground">
                                {debouncedSearch
                                    ? "No families match your search"
                                    : "No families available"}
                            </p>
                        </div>
                    ) : (
                        families.map((family) => {
                            const isCurrent = family.id === asset.family_id;
                            const stockModeMismatch =
                                currentStockMode != null &&
                                family.stock_mode !== currentStockMode;
                            const isDisabled = isCurrent || stockModeMismatch;
                            const isSelected = selectedFamily?.id === family.id;

                            return (
                                <button
                                    key={family.id}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => setSelectedFamily(family)}
                                    className={`w-full text-left px-3 py-2.5 rounded-md transition-colors font-mono text-sm flex items-center justify-between gap-2 ${
                                        isDisabled
                                            ? "opacity-40 cursor-not-allowed"
                                            : isSelected
                                              ? "border-2 border-primary bg-primary/5"
                                              : "hover:bg-muted/60 border-2 border-transparent"
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="block truncate font-medium">
                                            {family.name}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[10px] text-muted-foreground">
                                                Current family
                                            </span>
                                        )}
                                        {stockModeMismatch && !isCurrent && (
                                            <span className="text-[10px] text-muted-foreground">
                                                Stock mode mismatch
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Badge
                                            variant="secondary"
                                            className="font-mono text-[10px]"
                                        >
                                            {family.stock_mode}
                                        </Badge>
                                        {family.category && (
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                                style={{
                                                    borderColor: family.category.color,
                                                    color: family.category.color,
                                                }}
                                            >
                                                <span
                                                    className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            family.category.color,
                                                    }}
                                                />
                                                {family.category.name}
                                            </Badge>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="font-mono"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedFamily || updateAsset.isPending}
                        className="font-mono"
                    >
                        {updateAsset.isPending ? "Moving..." : "Confirm Move"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
