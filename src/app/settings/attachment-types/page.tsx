"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
    useAttachmentTypes,
    useCreateAttachmentType,
    useUpdateAttachmentType,
    type AttachmentEntityType,
} from "@/hooks/use-attachments";
import { Plus } from "lucide-react";

const ENTITY_OPTIONS: AttachmentEntityType[] = [
    "ORDER",
    "INBOUND_REQUEST",
    "SERVICE_REQUEST",
    "WORKFLOW_REQUEST",
];

export default function AttachmentTypesPage() {
    const { data, isLoading } = useAttachmentTypes();
    const createAttachmentType = useCreateAttachmentType();
    const updateAttachmentType = useUpdateAttachmentType();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        code: "",
        label: "",
        allowed_entity_types: [] as AttachmentEntityType[],
        default_visible_to_client: false,
        is_active: true,
        sort_order: 0,
    });

    const types = useMemo(
        () => [...(data?.data || [])].sort((a, b) => a.sort_order - b.sort_order),
        [data?.data]
    );

    const reset = () => {
        setEditingId(null);
        setForm({
            code: "",
            label: "",
            allowed_entity_types: [],
            default_visible_to_client: false,
            is_active: true,
            sort_order: 0,
        });
    };

    const handleSubmit = async () => {
        if (!form.code.trim() || !form.label.trim()) {
            return toast.error("Code and label are required");
        }
        if (form.allowed_entity_types.length === 0) {
            return toast.error("Select at least one allowed entity type");
        }

        try {
            if (editingId) {
                await updateAttachmentType.mutateAsync({
                    id: editingId,
                    payload: {
                        ...form,
                        code: form.code.trim().toUpperCase(),
                        label: form.label.trim(),
                    },
                });
                toast.success("Attachment type updated");
            } else {
                await createAttachmentType.mutateAsync({
                    ...form,
                    code: form.code.trim().toUpperCase(),
                    label: form.label.trim(),
                });
                toast.success("Attachment type created");
            }
            setIsOpen(false);
            reset();
        } catch (error: any) {
            toast.error(error.message || "Failed to save attachment type");
        }
    };

    return (
        <div className="container mx-auto px-6 py-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Attachment Types</h1>
                    <p className="text-sm text-muted-foreground">
                        Define reusable document categories for orders, inbound requests, service
                        requests, and internal workflows.
                    </p>
                </div>
                <Dialog
                    open={isOpen}
                    onOpenChange={(open) => {
                        setIsOpen(open);
                        if (!open) reset();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingId ? "Edit Attachment Type" : "Create Attachment Type"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        value={form.code}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                code: event.target.value,
                                            }))
                                        }
                                        placeholder="PO_DOCUMENT"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={form.label}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                label: event.target.value,
                                            }))
                                        }
                                        placeholder="PO Document"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Allowed Entity Types</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {ENTITY_OPTIONS.map((entity) => (
                                        <label
                                            key={entity}
                                            className="flex items-start gap-3 rounded-md border border-border/60 p-3"
                                        >
                                            <Checkbox
                                                checked={form.allowed_entity_types.includes(entity)}
                                                onCheckedChange={(checked) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        allowed_entity_types:
                                                            checked === true
                                                                ? [
                                                                      ...prev.allowed_entity_types,
                                                                      entity,
                                                                  ]
                                                                : prev.allowed_entity_types.filter(
                                                                      (item) => item !== entity
                                                                  ),
                                                    }))
                                                }
                                            />
                                            <span className="text-sm font-medium">
                                                {entity.replace(/_/g, " ")}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Sort Order</Label>
                                    <Input
                                        type="number"
                                        value={form.sort_order}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                sort_order: parseInt(event.target.value || "0", 10),
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-3 pt-7">
                                    <label className="flex items-center gap-3">
                                        <Checkbox
                                            checked={form.default_visible_to_client}
                                            onCheckedChange={(checked) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    default_visible_to_client: checked === true,
                                                }))
                                            }
                                        />
                                        <span className="text-sm">Client visible by default</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <Checkbox
                                            checked={form.is_active}
                                            onCheckedChange={(checked) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    is_active: checked === true,
                                                }))
                                            }
                                        />
                                        <span className="text-sm">Active</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit}>
                                {editingId ? "Save Changes" : "Create Type"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Configured Types</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading attachment types...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Label</TableHead>
                                    <TableHead>Scopes</TableHead>
                                    <TableHead>Client Default</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Sort</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {types.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-mono">{type.code}</TableCell>
                                        <TableCell>{type.label}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {type.allowed_entity_types.join(", ")}
                                        </TableCell>
                                        <TableCell>
                                            {type.default_visible_to_client ? "Yes" : "No"}
                                        </TableCell>
                                        <TableCell>
                                            {type.is_active ? "Active" : "Inactive"}
                                        </TableCell>
                                        <TableCell>{type.sort_order}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingId(type.id);
                                                    setForm({
                                                        code: type.code,
                                                        label: type.label,
                                                        allowed_entity_types:
                                                            type.allowed_entity_types,
                                                        default_visible_to_client:
                                                            type.default_visible_to_client,
                                                        is_active: type.is_active,
                                                        sort_order: type.sort_order,
                                                    });
                                                    setIsOpen(true);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
