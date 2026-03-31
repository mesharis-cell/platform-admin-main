"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdminHeader } from "@/components/admin-header";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import {
    ADMIN_PERMISSION_GROUPS,
    LOGISTICS_PERMISSION_GROUPS,
    PERMISSION_GROUPS,
    type AccessPolicy,
    type UserRole,
} from "@/types/auth";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";

const ROLES: UserRole[] = ["ADMIN", "LOGISTICS", "CLIENT"];

function getPermissionGroupsForRole(role: UserRole): Record<string, string[]> {
    if (role === "ADMIN") return ADMIN_PERMISSION_GROUPS;
    if (role === "LOGISTICS") return LOGISTICS_PERMISSION_GROUPS;
    return PERMISSION_GROUPS;
}

export default function AccessPoliciesPage() {
    const { user } = useToken();
    const { data, isLoading } = useAccessPolicies();
    const createAccessPolicy = useCreateAccessPolicy();
    const updateAccessPolicy = useUpdateAccessPolicy();
    const deleteAccessPolicy = useDeleteAccessPolicy();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [confirmDeletePolicy, setConfirmDeletePolicy] = useState<AccessPolicy | null>(null);
    const [form, setForm] = useState({
        code: "",
        name: "",
        description: "",
        role: "ADMIN" as UserRole,
        permissions: [] as string[],
        is_active: true,
    });

    const policies = useMemo(() => data?.data || [], [data?.data]);
    const canManagePolicies = hasPermission(user, "access_policies:update");

    const activePermissionGroups = useMemo(
        () => getPermissionGroupsForRole(form.role),
        [form.role]
    );

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

    const handleRoleChange = (newRole: UserRole) => {
        const newGroups = getPermissionGroupsForRole(newRole);
        const allNewPermissions = new Set(Object.values(newGroups).flat());
        setForm((prev) => ({
            ...prev,
            role: newRole,
            permissions: prev.permissions.filter((p) => allNewPermissions.has(p)),
        }));
    };

    const handleSubmit = async () => {
        if (!canManagePolicies) return;
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

    const handleDelete = async () => {
        if (!canManagePolicies) return;
        if (!confirmDeletePolicy) return;
        try {
            await deleteAccessPolicy.mutateAsync(confirmDeletePolicy.id);
            toast.success("Access policy deleted");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete access policy");
        } finally {
            setConfirmDeletePolicy(null);
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
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Shield}
                title="ACCESS POLICIES"
                description="Define · Assign · Control"
                stats={{ label: "Policies", value: policies.length }}
                actions={
                    canManagePolicies ? (
                        <Button
                            size="sm"
                            onClick={() => {
                                reset();
                                setIsOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Policy
                        </Button>
                    ) : undefined
                }
            />

            <div className="container mx-auto px-6 py-8 space-y-6">
                <Dialog
                    open={isOpen}
                    onOpenChange={(open) => {
                        setIsOpen(open);
                        if (!open) reset();
                    }}
                >
                    <DialogContent className="sm:max-w-4xl">
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
                                            handleRoleChange(value as UserRole)
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
                            <label className="flex items-center gap-3 rounded-md bg-muted/40 p-3">
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
                                <Label>Permissions ({form.permissions.length} selected)</Label>
                                <div className="max-h-[480px] overflow-y-auto space-y-2 rounded-md bg-muted/30 p-4">
                                    {Object.entries(activePermissionGroups).map(
                                        ([groupName, permissions]) => {
                                            if (permissions.length === 0) return null;
                                            const selectedCount = permissions.filter((p) =>
                                                form.permissions.includes(p)
                                            ).length;
                                            const allSelected =
                                                selectedCount === permissions.length;
                                            return (
                                                <Collapsible key={groupName}>
                                                    <div className="flex items-center justify-between">
                                                        <CollapsibleTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="gap-2"
                                                            >
                                                                <ChevronDown className="h-3.5 w-3.5 transition-transform" />
                                                                <span className="text-sm font-medium">
                                                                    {groupName}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({selectedCount}/
                                                                    {permissions.length})
                                                                </span>
                                                            </Button>
                                                        </CollapsibleTrigger>
                                                        {canManagePolicies ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs"
                                                                onClick={() => {
                                                                    if (allSelected) {
                                                                        setForm((prev) => ({
                                                                            ...prev,
                                                                            permissions:
                                                                                prev.permissions.filter(
                                                                                    (p) =>
                                                                                        !permissions.includes(
                                                                                            p
                                                                                        )
                                                                                ),
                                                                        }));
                                                                    } else {
                                                                        setForm((prev) => ({
                                                                            ...prev,
                                                                            permissions: [
                                                                                ...new Set([
                                                                                    ...prev.permissions,
                                                                                    ...permissions,
                                                                                ]),
                                                                            ],
                                                                        }));
                                                                    }
                                                                }}
                                                            >
                                                                {allSelected
                                                                    ? "Deselect All"
                                                                    : "Select All"}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                    <CollapsibleContent>
                                                        <div className="grid grid-cols-2 gap-2 pt-2 pb-3">
                                                            {permissions.map((permission) => (
                                                                <label
                                                                    key={permission}
                                                                    className="flex items-start gap-3 rounded-md border border-border/60 p-2"
                                                                >
                                                                    <Checkbox
                                                                        checked={form.permissions.includes(
                                                                            permission
                                                                        )}
                                                                        disabled={
                                                                            !canManagePolicies
                                                                        }
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
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
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            {canManagePolicies ? (
                                <Button onClick={handleSubmit}>
                                    {editingId ? "Save Changes" : "Create Policy"}
                                </Button>
                            ) : null}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Configured Policies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground">
                                Loading access policies...
                            </p>
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
                                            <TableCell className="font-mono">
                                                {policy.code}
                                            </TableCell>
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
                                                <Badge
                                                    variant={
                                                        policy.is_active ? "default" : "outline"
                                                    }
                                                >
                                                    {policy.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {canManagePolicies ? (
                                                    <>
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
                                                            onClick={() =>
                                                                setConfirmDeletePolicy(policy)
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <ConfirmDialog
                    open={!!confirmDeletePolicy}
                    onOpenChange={(open) => {
                        if (!open) setConfirmDeletePolicy(null);
                    }}
                    onConfirm={handleDelete}
                    title="Delete Access Policy"
                    description={
                        (confirmDeletePolicy?.assigned_user_count ?? 0) > 0
                            ? `This policy is currently assigned to ${confirmDeletePolicy?.assigned_user_count} user(s). Deleting it will remove their policy assignment. Are you sure?`
                            : `Are you sure you want to delete "${confirmDeletePolicy?.name}"? This cannot be undone.`
                    }
                    confirmText={
                        (confirmDeletePolicy?.assigned_user_count ?? 0) > 0
                            ? "Delete Anyway"
                            : "Delete"
                    }
                    variant="destructive"
                />
            </div>
        </div>
    );
}
