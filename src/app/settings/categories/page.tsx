"use client";

import { useState } from "react";
import {
    useAssetCategories,
    useCreateAssetCategory,
    useUpdateAssetCategory,
    type AssetCategory,
} from "@/hooks/use-asset-categories";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowUp,
    ArrowDown,
    Plus,
    Tag,
    Check,
    X,
    Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CategoriesSettingsPage() {
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

    const startEditing = (cat: AssetCategory) => {
        setEditingId(cat.id);
        setEditingName(cat.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingName("");
    };

    const handleRename = async (cat: AssetCategory) => {
        const name = editingName.trim();
        if (!name || name === cat.name) {
            cancelEditing();
            return;
        }
        try {
            await updateMutation.mutateAsync({ id: cat.id, data: { name } });
            cancelEditing();
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
            toast.success(cat.is_active ? "Category archived" : "Category restored");
        } catch (e: unknown) {
            toast.error((e as Error).message || "Failed to update");
        }
    };

    const handleMove = async (
        cat: AssetCategory,
        index: number,
        direction: "up" | "down"
    ) => {
        const swapIdx = direction === "up" ? index - 1 : index + 1;
        if (swapIdx < 0 || swapIdx >= categories.length) return;
        const other = categories[swapIdx];
        try {
            await Promise.all([
                updateMutation.mutateAsync({
                    id: cat.id,
                    data: { sort_order: other.sort_order },
                }),
                updateMutation.mutateAsync({
                    id: other.id,
                    data: { sort_order: cat.sort_order },
                }),
            ]);
        } catch {
            toast.error("Failed to reorder");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Tag}
                title="ASSET CATEGORIES"
                description="Manage the category taxonomy for asset families. Categories appear in create/edit dropdowns and as filter options across admin, warehouse, and client."
                stats={{
                    label: "TOTAL CATEGORIES",
                    value: categories.length,
                }}
            />

            <div className="mx-auto max-w-[1000px] px-6 py-8 space-y-6">
                {/* Add new category */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 space-y-1.5">
                                <label
                                    htmlFor="new-category"
                                    className="text-xs font-mono uppercase tracking-wide text-muted-foreground"
                                >
                                    New Category
                                </label>
                                <Input
                                    id="new-category"
                                    placeholder="e.g. Beverages, Signage, AV Equipment..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCreate();
                                    }}
                                    className="font-mono"
                                />
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={!newName.trim() || createMutation.isPending}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {createMutation.isPending ? "Creating..." : "Add Category"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            New categories are created as universal (visible to all companies).
                            Company-specific categories are created inline when logistics assigns
                            a category during asset family creation.
                        </p>
                    </CardContent>
                </Card>

                {/* Categories table */}
                <Card>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Loading categories...
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No categories yet. Add one above.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Color</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-[120px]">Scope</TableHead>
                                        <TableHead className="w-[80px] text-center">
                                            Order
                                        </TableHead>
                                        <TableHead className="w-[80px] text-center">
                                            Active
                                        </TableHead>
                                        <TableHead className="w-[60px]" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((cat, i) => (
                                        <TableRow
                                            key={cat.id}
                                            className={cn(
                                                !cat.is_active && "opacity-50"
                                            )}
                                        >
                                            {/* Color */}
                                            <TableCell>
                                                <label className="relative cursor-pointer inline-block">
                                                    <span
                                                        className="block h-6 w-6 rounded-full border-2 border-border shadow-sm"
                                                        style={{
                                                            backgroundColor: cat.color,
                                                        }}
                                                    />
                                                    <input
                                                        type="color"
                                                        value={cat.color}
                                                        onChange={(e) =>
                                                            handleColorChange(
                                                                cat,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    />
                                                </label>
                                            </TableCell>

                                            {/* Name (inline editable) */}
                                            <TableCell>
                                                {editingId === cat.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            autoFocus
                                                            value={editingName}
                                                            onChange={(e) =>
                                                                setEditingName(
                                                                    e.target.value
                                                                )
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter")
                                                                    handleRename(cat);
                                                                if (e.key === "Escape")
                                                                    cancelEditing();
                                                            }}
                                                            className="h-8 text-sm font-mono max-w-[300px]"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() =>
                                                                handleRename(cat)
                                                            }
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0"
                                                            onClick={cancelEditing}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="font-mono text-sm font-medium">
                                                        {cat.name}
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Scope */}
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-mono"
                                                >
                                                    {cat.company_id
                                                        ? "Company"
                                                        : "Universal"}
                                                </Badge>
                                            </TableCell>

                                            {/* Sort order */}
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        disabled={i === 0}
                                                        onClick={() =>
                                                            handleMove(cat, i, "up")
                                                        }
                                                    >
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        disabled={
                                                            i === categories.length - 1
                                                        }
                                                        onClick={() =>
                                                            handleMove(cat, i, "down")
                                                        }
                                                    >
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>

                                            {/* Active toggle */}
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={cat.is_active}
                                                    onCheckedChange={() =>
                                                        handleToggleActive(cat)
                                                    }
                                                />
                                            </TableCell>

                                            {/* Edit action */}
                                            <TableCell>
                                                {editingId !== cat.id ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => startEditing(cat)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
