"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, ChevronsUpDown, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/asset";

type Props = {
    assets: Asset[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
};

const getAssetImage = (asset: Asset) => asset.images?.[0]?.url || asset.group_images?.[0]?.url;

export function AssetSearchSelect({
    assets,
    value,
    onChange,
    placeholder = "Select asset",
    disabled,
}: Props) {
    const [open, setOpen] = useState(false);
    const selected = assets.find((asset) => asset.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className="h-auto min-h-10 w-full justify-between gap-2 px-3 py-2 text-left font-mono"
                >
                    {selected ? (
                        <span className="flex min-w-0 items-center gap-2">
                            <AssetThumb asset={selected} />
                            <span className="min-w-0">
                                <span className="block truncate text-sm">{selected.name}</span>
                                <span className="block truncate text-[10px] text-muted-foreground">
                                    {selected.qr_code} · {selected.category || "Uncategorized"}
                                </span>
                            </span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search assets..." />
                    <CommandList>
                        <CommandEmpty>No matching assets.</CommandEmpty>
                        <CommandGroup>
                            {assets.map((asset) => (
                                <CommandItem
                                    key={asset.id}
                                    value={`${asset.name} ${asset.qr_code} ${asset.category} ${asset.brand?.name || ""}`}
                                    onSelect={() => {
                                        onChange(asset.id);
                                        setOpen(false);
                                    }}
                                    className="items-center gap-2"
                                >
                                    <AssetThumb asset={asset} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-mono text-sm">
                                            {asset.name}
                                        </span>
                                        <span className="block truncate font-mono text-[10px] text-muted-foreground">
                                            {asset.qr_code} · {asset.brand?.name || "No brand"} ·{" "}
                                            {asset.category || "Uncategorized"}
                                        </span>
                                    </span>
                                    <Check
                                        className={cn(
                                            "h-4 w-4",
                                            value === asset.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function AssetThumb({ asset }: { asset: Asset }) {
    const image = getAssetImage(asset);
    return (
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {image ? (
                <Image src={image} alt="" fill className="object-cover" sizes="40px" />
            ) : (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
        </span>
    );
}
