"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Shield, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdminHeader } from "@/components/admin-header";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
    const [searchQuery, setSearchQuery] = useState("");
    const [form, setForm] = useState({
        code: "",
        name: "",
        description: "",
        role: "ADMIN" as UserRole,
        permissions: [] as string[],
        is_active: true,
    });

    const policies = useMemo(() => data?.data || [], [data?.data]);
    const filtered = searchQuery
        ? policies.filter(
              (p) =>
                  p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.role.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : policies;
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
        <div>
            <AdminHeader
                icon={Shield}
                title="ACCESS POLICIES"
                description="Define · Assign · Control"
                stats={{ label: "CONFIGURED POLICIES", value: policies.length }}
                actions={
                    canManagePolicies ? (
                        <Button
                            onClick={() => {
                                reset();
                                setIsOpen(true);
                            }}
                            className="gap-2 font-mono"
                        >
                            <Plus className="h-4 w-4" />
                            NEW POLICY
                        </Button>
                    ) : undefined
                }
            />

            {/* Search strip */}
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search policies..."
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
                            LOADING ACCESS POLICIES...
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="font-mono text-sm text-muted-foreground">
                            NO ACCESS POLICIES FOUND
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
                                        NAME
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        ROLE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        PERMISSIONS
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        ASSIGNED USERS
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        STATUS
                                    </TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((policy, index) => (
                                    <TableRow
                                        key={policy.id}
                                        className="group hover:bg-muted/30 transition-colors border-border/50"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <TableCell className="font-mono text-xs">
                                            {policy.code}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium font-mono text-sm">
                                                    {policy.name}
                                                </p>
                                                {policy.description ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {policy.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {policy.role}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {policy.permissions.length}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {policy.assigned_user_count ?? 0}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={policy.is_active ? "default" : "outline"}
                                                className="text-xs"
                                            >
                                                {policy.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {canManagePolicies ? (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEdit(policy)}
                                                        className="font-mono text-xs"
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            setConfirmDeletePolicy(policy)
                                                        }
                                                        className="font-mono text-xs text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog
                open={isOpen}
                onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) reset();
                }}
            >
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="font-mono">
                            {editingId ? "EDIT ACCESS POLICY" : "CREATE ACCESS POLICY"}
                        </DialogTitle>
                        <DialogDescription className="font-mono text-xs">
                            {editingId
                                ? "Update policy configuration and permissions"
                                : "Define a new permission bundle for user assignment"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
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
                                    placeholder="ADMIN_OPERATIONS"
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">NAME *</Label>
                                <Input
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            name: event.target.value,
                                        }))
                                    }
                                    placeholder="Admin Operations"
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">ROLE *</Label>
                                <Select
                                    value={form.role}
                                    onValueChange={(value) => handleRoleChange(value as UserRole)}
                                >
                                    <SelectTrigger className="font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map((role) => (
                                            <SelectItem
                                                key={role}
                                                value={role}
                                                className="font-mono"
                                            >
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">DESCRIPTION</Label>
                            <Input
                                value={form.description}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        description: event.target.value,
                                    }))
                                }
                                placeholder="Optional summary for admins"
                                className="font-mono"
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
                            <Label className="font-mono text-xs">
                                PERMISSIONS ({form.permissions.length} selected)
                            </Label>
                            <div className="max-h-[480px] overflow-y-auto space-y-2 rounded-md bg-muted/30 p-4">
                                {Object.entries(activePermissionGroups).map(
                                    ([groupName, permissions]) => {
                                        if (permissions.length === 0) return null;
                                        const selectedCount = permissions.filter((p) =>
                                            form.permissions.includes(p)
                                        ).length;
                                        const allSelected = selectedCount === permissions.length;
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
                                                                    disabled={!canManagePolicies}
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
                                                </CollapsibleContent>
                                            </Collapsible>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            className="font-mono"
                        >
                            CANCEL
                        </Button>
                        {canManagePolicies ? (
                            <Button onClick={handleSubmit} className="font-mono">
                                {editingId ? "SAVE CHANGES" : "CREATE POLICY"}
                            </Button>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete */}
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
                    (confirmDeletePolicy?.assigned_user_count ?? 0) > 0 ? "Delete Anyway" : "Delete"
                }
                variant="destructive"
            />
        </div>
    );
}
