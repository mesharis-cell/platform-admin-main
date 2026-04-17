"use client";

/**
 * CategoryManager — admin-only inline management panel for asset categories.
 * Collapsible card on the assets page. Supports:
 *   - Inline rename (click name → input → blur saves)
 *   - Color picker (click dot → <input type="color">)
 *   - Archive toggle (is_active switch)
 *   - Add new category row at bottom
 *   - Sort ordering (move up / move down)
 *
 * Company-specific categories show the company name; universal show "All companies".
 */

import { useState } from "react";
import {
    useAssetCategories,
    useCreateAssetCategory,
    useUpdateAssetCategory,
    type AssetCategory,
} from "@/hooks/use-asset-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChevronDown,
    ChevronUp,
    Plus,
    ArrowUp,
    ArrowDown,
    Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CategoryManager() {
    const [open, setOpen] = useState(false);
    const { data: categoriesData, isLoading } = useAssetCategories();
    const createMutation = useCreateAssetCategory();
    const updateMutation = useUpdateAssetCategory();
    const categories = categoriesData?.data || [];

    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        try {
            await createMutation.mutateAsync({ name });
            setNewName("");
            toast.success(`Category "${name}" created`);
        } catch (e: unknown) {
            toast.error((e as Error).message || "Failed to create category");
        }
    };

    const handleRename = async (cat: AssetCategory) => {
        const name = editingName.trim();
        if (!name || name === cat.name) {
            setEditingId(null);
            return;
        }
        try {
            await updateMutation.mutateAsync({ id: cat.id, data: { name } });
            setEditingId(null);
            toast.success(`Renamed to "${name}"`);
        } catch (e: unknown) {
            toast.error((e as Error).message || "Failed to rename");
        }
    };

    const handleColorChange = async (cat: AssetCategory, color: string) => {
        try {
            await updateMutation.mutateAsync({ id: cat.id, data: { color } });
        } catch (e: unknown) {
            toast.error((e as Error).message || "Failed to update color");
        }
    };

    const handleToggleActive = async (cat: AssetCategory) => {
        try {
            await updateMutation.mutateAsync({
                id: cat.id,
                data: { is_active: !cat.is_active },
            });
            toast.success(cat.is_active ? "Archived" : "Restored");
        } catch (e: unknown) {
            toast.error((e as Error).message || "Failed to toggle");
        }
    };

    const handleMoveUp = async (cat: AssetCategory, index: number) => {
        if (index === 0) return;
        const prev = categories[index - 1];
        try {
            await Promise.all([
                updateMutation.mutateAsync({
                    id: cat.id,
                    data: { sort_order: prev.sort_order },
                }),
                updateMutation.mutateAsync({
                    id: prev.id,
                    data: { sort_order: cat.sort_order },
                }),
            ]);
        } catch {
            toast.error("Failed to reorder");
        }
    };

    const handleMoveDown = async (cat: AssetCategory, index: number) => {
        if (index === categories.length - 1) return;
        const next = categories[index + 1];
        try {
            await Promise.all([
                updateMutation.mutateAsync({
                    id: cat.id,
                    data: { sort_order: next.sort_order },
                }),
                updateMutation.mutateAsync({
                    id: next.id,
                    data: { sort_order: cat.sort_order },
                }),
            ]);
        } catch {
            toast.error("Failed to reorder");
        }
    };

    return (
        <Card>
            <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setOpen((v) => !v)}
            >
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wide">
                        <Settings2 className="h-4 w-4" />
                        Manage Categories
                    </CardTitle>
                    {open ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            </CardHeader>
            {open ? (
                <CardContent className="space-y-3">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <div className="space-y-1">
                            {categories.map((cat, i) => (
                                <div
                                    key={cat.id}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                                        !cat.is_active && "opacity-50"
                                    )}
                                >
                                    {/* Color dot / picker */}
                                    <label className="relative cursor-pointer shrink-0">
                                        <span
                                            className="block h-4 w-4 rounded-full border border-border"
                                            style={{ backgroundColor: cat.color }}
                                        />
                                        <input
                                            type="color"
                                            value={cat.color}
                                            onChange={(e) =>
                                                handleColorChange(cat, e.target.value)
                                            }
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                    </label>

                                    {/* Name (inline editable) */}
                                    {editingId === cat.id ? (
                                        <Input
                                            autoFocus
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onBlur={() => handleRename(cat)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleRename(cat);
                                                if (e.key === "Escape") setEditingId(null);
                                            }}
                                            className="h-7 text-sm flex-1"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className="flex-1 text-left hover:underline font-mono text-xs"
                                            onClick={() => {
                                                setEditingId(cat.id);
                                                setEditingName(cat.name);
                                            }}
                                        >
                                            {cat.name}
                                        </button>
                                    )}

                                    {/* Scope */}
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                        {cat.company_id ? "Company" : "Universal"}
                                    </span>

                                    {/* Sort arrows */}
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            type="button"
                                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            disabled={i === 0}
                                            onClick={() => handleMoveUp(cat, i)}
                                        >
                                            <ArrowUp className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            disabled={i === categories.length - 1}
                                            onClick={() => handleMoveDown(cat, i)}
                                        >
                                            <ArrowDown className="h-3 w-3" />
                                        </button>
                                    </div>

                                    {/* Active toggle */}
                                    <Switch
                                        checked={cat.is_active}
                                        onCheckedChange={() => handleToggleActive(cat)}
                                        className="shrink-0"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add new */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                        <Input
                            placeholder="New category name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate();
                            }}
                            className="h-8 text-sm flex-1"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={handleCreate}
                            disabled={!newName.trim() || createMutation.isPending}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                        </Button>
                    </div>
                </CardContent>
            ) : null}
        </Card>
    );
}
