"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

export interface ComboboxOption {
    value: string;
    label: string;
    /** When set, this item is pinned to the top above a separator (e.g. "All companies"). */
    pinned?: boolean;
}

interface BaseProps {
    options: ComboboxOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    className?: string;
}

interface SingleProps extends BaseProps {
    multiple?: false;
    value: string | null;
    onChange: (value: string | null) => void;
}

interface MultiProps extends BaseProps {
    multiple: true;
    value: string[];
    onChange: (value: string[]) => void;
}

type ReportComboboxProps = SingleProps | MultiProps;

/**
 * Generic searchable combobox cloned from the asset CategoryCombobox pattern
 * (Popover + Command + CommandInput + CommandList + Check). Backs the
 * company / team / brand / group / category report filters.
 *
 * - Single-select: trigger shows the selected label or the placeholder.
 * - Multi-select: trigger shows "N selected" (or the single label when N===1).
 * - `pinned` options render in their own group above a separator (e.g. the
 *   "All companies" sentinel item on optional company filters).
 */
export function ReportCombobox(props: ReportComboboxProps) {
    const {
        options,
        placeholder = "Select…",
        searchPlaceholder = "Search…",
        emptyText = "No results found.",
        disabled = false,
        className,
    } = props;
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const isMulti = props.multiple === true;
    const selectedSet = useMemo(
        () => new Set(isMulti ? (props.value ?? []) : props.value ? [props.value] : []),
        [isMulti, props.value]
    );

    const pinned = useMemo(() => options.filter((o) => o.pinned), [options]);
    const regular = useMemo(() => options.filter((o) => !o.pinned), [options]);

    const filtered = useMemo(() => {
        if (!search.trim()) return regular;
        const q = search.toLowerCase();
        return regular.filter((o) => o.label.toLowerCase().includes(q));
    }, [regular, search]);

    const triggerLabel = useMemo(() => {
        if (isMulti) {
            const vals = props.value ?? [];
            if (vals.length === 0) return placeholder;
            if (vals.length === 1) {
                return options.find((o) => o.value === vals[0])?.label ?? `${vals.length} selected`;
            }
            return `${vals.length} selected`;
        }
        if (!props.value) return placeholder;
        return options.find((o) => o.value === props.value)?.label ?? placeholder;
    }, [isMulti, props.value, options, placeholder]);

    const hasSelection = isMulti ? (props.value?.length ?? 0) > 0 : Boolean(props.value);

    const handleSelect = (val: string) => {
        if (isMulti) {
            const current = new Set(props.value ?? []);
            if (current.has(val)) current.delete(val);
            else current.add(val);
            props.onChange([...current]);
            // keep the popover open for multi-select
        } else {
            const next = props.value === val ? null : val;
            props.onChange(next);
            setSearch("");
            setOpen(false);
        }
    };

    const renderItem = (opt: ComboboxOption) => (
        <CommandItem
            key={opt.value}
            value={opt.value}
            onSelect={() => handleSelect(opt.value)}
            className="text-sm"
        >
            <span className="truncate">{opt.label}</span>
            {selectedSet.has(opt.value) && <Check className="ml-auto h-4 w-4 shrink-0" />}
        </CommandItem>
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn("w-full justify-between font-normal", className)}
                >
                    <span className={cn("truncate", !hasSelection && "text-muted-foreground")}>
                        {triggerLabel}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                style={{
                    maxHeight: "min(var(--radix-popover-content-available-height), 360px)",
                    isolation: "isolate",
                }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
            >
                <Command shouldFilter={false} className="max-h-[inherit]">
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList
                        className="max-h-none"
                        style={{
                            maxHeight:
                                "calc(min(var(--radix-popover-content-available-height), 360px) - 45px)",
                            overflowY: "auto",
                            overscrollBehavior: "contain",
                            touchAction: "pan-y",
                            WebkitOverflowScrolling: "touch",
                        }}
                    >
                        <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                            {emptyText}
                        </CommandEmpty>
                        {pinned.length > 0 && !search.trim() && (
                            <>
                                <CommandGroup>{pinned.map(renderItem)}</CommandGroup>
                                <CommandSeparator />
                            </>
                        )}
                        <CommandGroup>{filtered.map(renderItem)}</CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
