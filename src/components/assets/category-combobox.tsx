"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAssetCategories, type AssetCategory } from "@/hooks/use-asset-categories";

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] =
                a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function randomColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 65%, 55%)`;
}

function hslToHex(hsl: string): string {
    const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return "#888888";
    const h = Number(match[1]) / 360;
    const s = Number(match[2]) / 100;
    const l = Number(match[3]) / 100;
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

interface CategoryComboboxProps {
    companyId: string | null;
    value: string | null;
    newCategory: { name: string; color?: string } | null;
    onChange: (
        categoryId: string | null,
        newCategory: { name: string; color?: string } | null
    ) => void;
}

export function CategoryCombobox({
    companyId,
    value,
    newCategory,
    onChange,
}: CategoryComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [draftColor, setDraftColor] = useState<string>(() => hslToHex(randomColor()));

    const { data: categoriesData } = useAssetCategories(companyId || undefined);
    const categories: AssetCategory[] = useMemo(
        () =>
            (categoriesData?.data || [])
                .filter((c) => c.is_active)
                .sort((a, b) => a.sort_order - b.sort_order),
        [categoriesData]
    );

    const selectedCategory = useMemo(() => {
        if (newCategory) return null;
        if (!value) return null;
        return categories.find((c) => c.id === value) || null;
    }, [categories, value, newCategory]);

    const filtered = useMemo(() => {
        if (!search.trim()) return categories;
        const q = search.toLowerCase();
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, search]);

    const exactMatch = useMemo(() => {
        if (!search.trim()) return true;
        return categories.some((c) => c.name.toLowerCase() === search.trim().toLowerCase());
    }, [categories, search]);

    const similarWarning = useMemo(() => {
        if (!search.trim() || search.trim().length <= 2 || exactMatch) return null;
        const q = search.trim().toLowerCase();
        for (const c of categories) {
            const dist = levenshtein(q, c.name.toLowerCase());
            if (dist > 0 && dist <= 2) {
                return c.name;
            }
        }
        return null;
    }, [categories, search, exactMatch]);

    const displayLabel = newCategory
        ? newCategory.name
        : selectedCategory
          ? selectedCategory.name
          : "Select category";

    const displayColor = newCategory
        ? newCategory.color || "#888888"
        : selectedCategory
          ? selectedCategory.color
          : null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-mono"
                >
                    <span className="flex items-center gap-2 truncate">
                        {displayColor && (
                            <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                                style={{ backgroundColor: displayColor }}
                            />
                        )}
                        <span
                            className={cn(
                                !selectedCategory && !newCategory && "text-muted-foreground"
                            )}
                        >
                            {displayLabel}
                        </span>
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                style={{
                    maxHeight: "min(var(--radix-popover-content-available-height), 360px)",
                }}
            >
                <Command shouldFilter={false} className="max-h-[inherit]">
                    <CommandInput
                        placeholder="Search or create category..."
                        value={search}
                        onValueChange={setSearch}
                        className="font-mono"
                    />
                    <CommandList
                        className="max-h-none"
                        style={{
                            maxHeight:
                                "calc(min(var(--radix-popover-content-available-height), 360px) - 45px)",
                            overflowY: "auto",
                        }}
                    >
                        <CommandEmpty className="py-3 text-center text-xs font-mono text-muted-foreground">
                            No categories found.
                        </CommandEmpty>
                        <CommandGroup>
                            {filtered.map((cat) => (
                                <CommandItem
                                    key={cat.id}
                                    value={cat.id}
                                    onSelect={() => {
                                        onChange(cat.id, null);
                                        setSearch("");
                                        setOpen(false);
                                    }}
                                    className="font-mono text-sm"
                                >
                                    <span
                                        className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                    <span className="truncate">{cat.name}</span>
                                    {value === cat.id && !newCategory && (
                                        <Check className="ml-auto h-4 w-4 shrink-0" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {search.trim() && !exactMatch && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    {similarWarning && (
                                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-amber-600">
                                            <AlertTriangle className="h-3 w-3 shrink-0" />
                                            <span>
                                                Similar to: {similarWarning}. Create anyway?
                                            </span>
                                        </div>
                                    )}
                                    <CommandItem
                                        onSelect={() => {
                                            onChange(null, {
                                                name: search.trim(),
                                                color: draftColor,
                                            });
                                            setSearch("");
                                            setOpen(false);
                                            setDraftColor(hslToHex(randomColor()));
                                        }}
                                        className="font-mono text-sm"
                                    >
                                        <span
                                            className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                                            style={{ backgroundColor: draftColor }}
                                        />
                                        <Plus className="h-3.5 w-3.5 shrink-0" />
                                        <span>Create &ldquo;{search.trim()}&rdquo;</span>
                                        <input
                                            type="color"
                                            value={draftColor}
                                            onChange={(e) => setDraftColor(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="ml-auto h-5 w-5 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
                                            title="Pick color"
                                        />
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
