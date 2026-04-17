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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
    Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CategoriesSettingsPage() {
    const { data: categoriesData, isLoading } = useAssetCategories();
    const createMutation = useCreateAssetCategory();
    const updateMutation = useUpdateAssetCategory();
    const categories = categoriesData?.data || [];

    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    const filtered = searchQuery
        ? categories.filter((c) =>
              c.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : categories;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        try {
            await createMutation.mutateAsync({ name });
            setNewName("");
            setIsCreateOpen(false);
            toast.success(`Category "${name}" created`);
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to create category");
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
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to rename");
        }
    };

    const handleColorChange = async (cat: AssetCategory, color: string) => {
        try {
            await updateMutation.mutateAsync({ id: cat.id, data: { color } });
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to update color");
        }
    };

    const handleToggleActive = async (cat: AssetCategory) => {
        try {
            await updateMutation.mutateAsync({
                id: cat.id,
                data: { is_active: !cat.is_active },
            });
            toast.success(cat.is_active ? "Category archived" : "Category restored");
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to update");
        }
    };

    const handleMove = async (
        cat: AssetCategory,
        index: number,
        direction: "up" | "down"
    ) => {
        const swapIdx = direction === "up" ? index - 1 : index + 1;
        if (swapIdx < 0 || swapIdx >= filtered.length) return;
        const other = filtered[swapIdx];
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

    if (!isLoading && categories.length === 0) {
        return (
            <div className="min-h-screen bg-background">
                <AdminHeader
                    icon={Tag}
                    title="ASSET CATEGORIES"
                    description="Category taxonomy for asset families"
                    stats={{ label: "CATEGORIES", value: 0 }}
                />
                <div className="text-center py-12 space-y-3">
                    <Tag className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <p className="font-mono text-sm text-muted-foreground">
                        NO CATEGORIES CONFIGURED
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Tag}
                title="ASSET CATEGORIES"
                description="Category taxonomy for asset families. Categories appear in create/edit dropdowns and as filter options across admin, warehouse, and client."
                stats={{ label: "CATEGORIES", value: categories.length }}
                actions={
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 font-mono">
                                <Plus className="h-4 w-4" />
                                NEW CATEGORY
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="font-mono">
                                    CREATE NEW CATEGORY
                                </DialogTitle>
                                <DialogDescription className="font-mono text-xs">
                                    New categories are universal (visible to all companies).
                                    Company-specific categories are created inline during asset
                                    family creation.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="categoryName"
                                        className="font-mono text-xs"
                                    >
                                        CATEGORY NAME *
                                    </Label>
                                    <Input
                                        id="categoryName"
                                        placeholder="e.g. Beverages, Signage, AV Equipment..."
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="font-mono"
                                        autoFocus
                                    />
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="submit"
                                        disabled={
                                            !newName.trim() || createMutation.isPending
                                        }
                                        className="font-mono"
                                    >
                                        {createMutation.isPending
                                            ? "CREATING..."
                                            : "CREATE CATEGORY"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                }
            />

            {/* Search bar strip */}
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 font-mono text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="px-8 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm font-mono text-muted-foreground animate-pulse">
                            LOADING CATEGORIES...
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Tag className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="font-mono text-sm text-muted-foreground">
                            NO CATEGORIES FOUND
                        </p>
                    </div>
                ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50">
                                    <TableHead className="font-mono text-xs font-bold w-[60px]">
                                        COLOR
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        NAME
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold w-[120px]">
                                        SCOPE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold w-[80px] text-center">
                                        ORDER
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold w-[80px] text-center">
                                        ACTIVE
                                    </TableHead>
                                    <TableHead className="w-12" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((cat, i) => (
                                    <TableRow
                                        key={cat.id}
                                        className={cn(!cat.is_active && "opacity-50")}
                                    >
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
                                                        handleColorChange(cat, e.target.value)
                                                    }
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                />
                                            </label>
                                        </TableCell>

                                        <TableCell>
                                            {editingId === cat.id ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        autoFocus
                                                        value={editingName}
                                                        onChange={(e) =>
                                                            setEditingName(e.target.value)
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
                                                        onClick={() => handleRename(cat)}
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

                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-mono"
                                            >
                                                {cat.company_id ? "COMPANY" : "UNIVERSAL"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0"
                                                    disabled={i === 0}
                                                    onClick={() => handleMove(cat, i, "up")}
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0"
                                                    disabled={i === filtered.length - 1}
                                                    onClick={() => handleMove(cat, i, "down")}
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Switch
                                                checked={cat.is_active}
                                                onCheckedChange={() =>
                                                    handleToggleActive(cat)
                                                }
                                            />
                                        </TableCell>

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
                    </div>
                )}
            </div>
        </div>
    );
}
