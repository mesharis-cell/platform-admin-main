"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Shield, Trash2 } from "lucide-react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    useAccessPolicies,
    useCreateAccessPolicy,
    useDeleteAccessPolicy,
    useUpdateAccessPolicy,
} from "@/hooks/use-access-policies";
import { PERMISSION_GROUPS, type AccessPolicy, type UserRole } from "@/types/auth";

const ROLES: UserRole[] = ["ADMIN", "LOGISTICS", "CLIENT"];

export default function AccessPoliciesPage() {
    const { data, isLoading } = useAccessPolicies();
    const createAccessPolicy = useCreateAccessPolicy();
    const updateAccessPolicy = useUpdateAccessPolicy();
    const deleteAccessPolicy = useDeleteAccessPolicy();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        code: "",
        name: "",
        description: "",
        role: "ADMIN" as UserRole,
        permissions: [] as string[],
        is_active: true,
    });

    const policies = useMemo(() => data?.data || [], [data?.data]);

    const reset = () => {
        setEditingId(null);
        setForm({
            code: "",
            name: "",
            description: "",
            role: "ADMIN",
            permissions: [],
            is_active: true,
        });
    };

    const togglePermission = (permission: string, checked: boolean) => {
        setForm((prev) => ({
            ...prev,
            permissions: checked
                ? [...new Set([...prev.permissions, permission])]
                : prev.permissions.filter((item) => item !== permission),
        }));
    };

    const handleSubmit = async () => {
        if (!form.code.trim() || !form.name.trim()) {
            return toast.error("Code and name are required");
        }
        if (form.permissions.length === 0) {
            return toast.error("Select at least one permission");
        }

        try {
            const payload = {
                code: form.code.trim().toUpperCase(),
                name: form.name.trim(),
                description: form.description.trim() || null,
                role: form.role,
                permissions: form.permissions,
                is_active: form.is_active,
            };
            if (editingId) {
                await updateAccessPolicy.mutateAsync({ id: editingId, payload });
                toast.success("Access policy updated");
            } else {
                await createAccessPolicy.mutateAsync(payload);
                toast.success("Access policy created");
            }
            setIsOpen(false);
            reset();
        } catch (error: any) {
            toast.error(error.message || "Failed to save access policy");
        }
    };

    const openEdit = (policy: AccessPolicy) => {
        setEditingId(policy.id);
        setForm({
            code: policy.code,
            name: policy.name,
            description: policy.description || "",
            role: policy.role,
            permissions: policy.permissions,
            is_active: policy.is_active,
        });
        setIsOpen(true);
    };

    return (
        <div className="container mx-auto px-6 py-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Access Policies</h1>
                    <p className="text-sm text-muted-foreground">
                        Define reusable access bundles per role. Users can follow a policy and still
                        keep explicit grant/revoke overrides.
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
                            Add Access Policy
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingId ? "Edit Access Policy" : "Create Access Policy"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
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
                                        placeholder="ADMIN_OPERATIONS"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                name: event.target.value,
                                            }))
                                        }
                                        placeholder="Admin Operations"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select
                                        value={form.role}
                                        onValueChange={(value) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                role: value as UserRole,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map((role) => (
                                                <SelectItem key={role} value={role}>
                                                    {role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            description: event.target.value,
                                        }))
                                    }
                                    placeholder="Optional summary for admins"
                                />
                            </div>
                            <label className="flex items-center gap-3 rounded-md border p-3">
                                <Checkbox
                                    checked={form.is_active}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            is_active: checked === true,
                                        }))
                                    }
                                />
                                <span className="text-sm">Policy is active</span>
                            </label>
                            <div className="space-y-3">
                                <Label>Permissions</Label>
                                <div className="max-h-[360px] overflow-y-auto space-y-4 rounded-md border p-4">
                                    {Object.entries(PERMISSION_GROUPS).map(
                                        ([groupName, permissions]) => (
                                            <div key={groupName} className="space-y-2">
                                                <p className="text-sm font-medium">{groupName}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {permissions.map((permission) => (
                                                        <label
                                                            key={permission}
                                                            className="flex items-start gap-3 rounded-md border border-border/60 p-2"
                                                        >
                                                            <Checkbox
                                                                checked={form.permissions.includes(
                                                                    permission
                                                                )}
                                                                onCheckedChange={(checked) =>
                                                                    togglePermission(
                                                                        permission,
                                                                        checked === true
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-xs font-mono">
                                                                {permission}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit}>
                                {editingId ? "Save Changes" : "Create Policy"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Configured Policies
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading access policies...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Permissions</TableHead>
                                    <TableHead>Assigned Users</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {policies.map((policy) => (
                                    <TableRow key={policy.id}>
                                        <TableCell className="font-mono">{policy.code}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{policy.name}</p>
                                                {policy.description ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {policy.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell>{policy.role}</TableCell>
                                        <TableCell>{policy.permissions.length}</TableCell>
                                        <TableCell>{policy.assigned_user_count ?? 0}</TableCell>
                                        <TableCell>
                                            {policy.is_active ? "Active" : "Inactive"}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEdit(policy)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    try {
                                                        await deleteAccessPolicy.mutateAsync(
                                                            policy.id
                                                        );
                                                        toast.success("Access policy deleted");
                                                    } catch (error: any) {
                                                        toast.error(
                                                            error.message ||
                                                                "Failed to delete access policy"
                                                        );
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
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
