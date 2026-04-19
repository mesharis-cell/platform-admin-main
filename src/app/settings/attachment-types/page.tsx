"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Paperclip, Plus, Search } from "lucide-react";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminHeader } from "@/components/admin-header";

const ENTITY_OPTIONS: AttachmentEntityType[] = [
    "ORDER",
    "INBOUND_REQUEST",
    "SERVICE_REQUEST",
    "WORKFLOW_REQUEST",
];
const ROLE_OPTIONS = ["ADMIN", "LOGISTICS", "CLIENT"] as const;

export default function AttachmentTypesPage() {
    const { user } = useToken();
    const { data, isLoading } = useAttachmentTypes();
    const createAttachmentType = useCreateAttachmentType();
    const updateAttachmentType = useUpdateAttachmentType();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [form, setForm] = useState({
        code: "",
        label: "",
        allowed_entity_types: [] as AttachmentEntityType[],
        upload_roles: ["ADMIN", "LOGISTICS"] as Array<(typeof ROLE_OPTIONS)[number]>,
        view_roles: ["ADMIN", "LOGISTICS"] as Array<(typeof ROLE_OPTIONS)[number]>,
        default_visible_to_client: false,
        required_note: false,
        is_active: true,
        sort_order: 0,
    });

    const types = useMemo(
        () => [...(data?.data || [])].sort((a, b) => a.sort_order - b.sort_order),
        [data?.data]
    );
    const filtered = searchQuery
        ? types.filter(
              (t) =>
                  t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : types;
    const canManageAttachmentTypes = hasPermission(user, "attachment_types:update");

    const reset = () => {
        setEditingId(null);
        setForm({
            code: "",
            label: "",
            allowed_entity_types: [],
            upload_roles: ["ADMIN", "LOGISTICS"],
            view_roles: ["ADMIN", "LOGISTICS"],
            default_visible_to_client: false,
            required_note: false,
            is_active: true,
            sort_order: 0,
        });
    };

    const handleSubmit = async () => {
        if (!canManageAttachmentTypes) return;
        if (!form.code.trim() || !form.label.trim()) {
            return toast.error("Code and label are required");
        }
        if (form.allowed_entity_types.length === 0) {
            return toast.error("Select at least one allowed entity type");
        }
        if (form.upload_roles.length === 0) {
            return toast.error("Select at least one upload role");
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
        <div>
            <AdminHeader
                icon={Paperclip}
                title="ATTACHMENT TYPES"
                description="Document categories for orders, requests, and workflows"
                stats={{ label: "CONFIGURED TYPES", value: types.length }}
                actions={
                    canManageAttachmentTypes ? (
                        <Dialog
                            open={isOpen}
                            onOpenChange={(open) => {
                                setIsOpen(open);
                                if (!open) reset();
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button className="gap-2 font-mono">
                                    <Plus className="h-4 w-4" />
                                    NEW TYPE
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle className="font-mono">
                                        {editingId
                                            ? "EDIT ATTACHMENT TYPE"
                                            : "CREATE ATTACHMENT TYPE"}
                                    </DialogTitle>
                                    <DialogDescription className="font-mono text-xs">
                                        {editingId
                                            ? "Update type configuration"
                                            : "Define a reusable document category"}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">CODE *</Label>
                                            <Input
                                                value={form.code}
                                                onChange={(event) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        code: event.target.value,
                                                    }))
                                                }
                                                placeholder="PO_DOCUMENT"
                                                className="font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">LABEL *</Label>
                                            <Input
                                                value={form.label}
                                                onChange={(event) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        label: event.target.value,
                                                    }))
                                                }
                                                placeholder="PO Document"
                                                className="font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">
                                            ALLOWED ENTITY TYPES
                                        </Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {ENTITY_OPTIONS.map((entity) => (
                                                <label
                                                    key={entity}
                                                    className="flex items-start gap-3 rounded-md border border-border/60 p-3"
                                                >
                                                    <Checkbox
                                                        checked={form.allowed_entity_types.includes(
                                                            entity
                                                        )}
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
                                                                              (item) =>
                                                                                  item !== entity
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
                                            <Label className="font-mono text-xs">
                                                WHO CAN UPLOAD
                                            </Label>
                                            <div className="space-y-2">
                                                {ROLE_OPTIONS.map((role) => (
                                                    <label
                                                        key={role}
                                                        className="flex items-center gap-3 rounded-md border border-border/60 p-3"
                                                    >
                                                        <Checkbox
                                                            checked={form.upload_roles.includes(
                                                                role
                                                            )}
                                                            onCheckedChange={(checked) =>
                                                                setForm((prev) => {
                                                                    const upload_roles =
                                                                        checked === true
                                                                            ? [
                                                                                  ...new Set([
                                                                                      ...prev.upload_roles,
                                                                                      role,
                                                                                  ]),
                                                                              ]
                                                                            : prev.upload_roles.filter(
                                                                                  (item) =>
                                                                                      item !== role
                                                                              );
                                                                    const view_roles =
                                                                        checked === true
                                                                            ? [
                                                                                  ...new Set([
                                                                                      ...prev.view_roles,
                                                                                      role,
                                                                                  ]),
                                                                              ]
                                                                            : prev.view_roles;
                                                                    return {
                                                                        ...prev,
                                                                        upload_roles,
                                                                        view_roles,
                                                                    };
                                                                })
                                                            }
                                                        />
                                                        <span className="text-sm">{role}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">
                                                WHO CAN VIEW
                                            </Label>
                                            <div className="space-y-2">
                                                {ROLE_OPTIONS.map((role) => (
                                                    <label
                                                        key={role}
                                                        className="flex items-center gap-3 rounded-md border border-border/60 p-3"
                                                    >
                                                        <Checkbox
                                                            checked={form.view_roles.includes(role)}
                                                            onCheckedChange={(checked) =>
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    view_roles:
                                                                        checked === true
                                                                            ? [
                                                                                  ...new Set([
                                                                                      ...prev.view_roles,
                                                                                      role,
                                                                                  ]),
                                                                              ]
                                                                            : prev.view_roles.filter(
                                                                                  (item) =>
                                                                                      item !== role
                                                                              ),
                                                                }))
                                                            }
                                                        />
                                                        <span className="text-sm">{role}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">SORT ORDER</Label>
                                            <Input
                                                type="number"
                                                value={form.sort_order}
                                                onChange={(event) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        sort_order: parseInt(
                                                            event.target.value || "0",
                                                            10
                                                        ),
                                                    }))
                                                }
                                                className="font-mono"
                                            />
                                        </div>
                                        <div className="space-y-3 pt-7">
                                            <label className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={form.default_visible_to_client}
                                                    onCheckedChange={(checked) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            default_visible_to_client:
                                                                checked === true,
                                                        }))
                                                    }
                                                />
                                                <span className="text-sm">
                                                    Client visible by default
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={form.required_note}
                                                    onCheckedChange={(checked) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            required_note: checked === true,
                                                        }))
                                                    }
                                                />
                                                <span className="text-sm">Require note</span>
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
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsOpen(false)}
                                        className="font-mono"
                                    >
                                        CANCEL
                                    </Button>
                                    {canManageAttachmentTypes ? (
                                        <Button onClick={handleSubmit} className="font-mono">
                                            {editingId ? "SAVE CHANGES" : "CREATE TYPE"}
                                        </Button>
                                    ) : null}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    ) : undefined
                }
            />

            {/* Search strip */}
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by code or label..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 font-mono text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm font-mono text-muted-foreground animate-pulse">
                            LOADING ATTACHMENT TYPES...
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Paperclip className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="font-mono text-sm text-muted-foreground">
                            NO ATTACHMENT TYPES FOUND
                        </p>
                    </div>
                ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50">
                                    <TableHead className="font-mono text-xs font-bold">
                                        CODE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        LABEL
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        SCOPES
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        UPLOAD
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        VIEW
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        CLIENT
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        NOTE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        STATUS
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        SORT
                                    </TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((type, index) => (
                                    <TableRow
                                        key={type.id}
                                        className="group hover:bg-muted/30 transition-colors border-border/50"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <TableCell className="font-mono text-xs">
                                            {type.code}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {type.label}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {type.allowed_entity_types.join(", ")}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {type.upload_roles.join(", ")}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {type.view_roles.join(", ")}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {type.default_visible_to_client ? "Yes" : "No"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {type.required_note ? "Yes" : "No"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {type.is_active ? "Active" : "Inactive"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {type.sort_order}
                                        </TableCell>
                                        <TableCell>
                                            {canManageAttachmentTypes ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="font-mono text-xs"
                                                    onClick={() => {
                                                        setEditingId(type.id);
                                                        setForm({
                                                            code: type.code,
                                                            label: type.label,
                                                            allowed_entity_types:
                                                                type.allowed_entity_types,
                                                            upload_roles: type.upload_roles,
                                                            view_roles: type.view_roles,
                                                            default_visible_to_client:
                                                                type.default_visible_to_client,
                                                            required_note:
                                                                type.required_note ?? false,
                                                            is_active: type.is_active,
                                                            sort_order: type.sort_order,
                                                        });
                                                        setIsOpen(true);
                                                    }}
                                                >
                                                    Edit
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
