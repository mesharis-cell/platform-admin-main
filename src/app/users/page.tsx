"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Search, Shield, UserPlus, Users } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAccessPolicies } from "@/hooks/use-access-policies";
import { useCompanies } from "@/hooks/use-companies";
import {
    useCreateUser,
    useGenerateUserPassword,
    useSetUserPassword,
    useUsers,
} from "@/hooks/use-users";
import { useToken } from "@/lib/auth/use-token";
import {
    ADMIN_PERMISSION_GROUPS,
    LOGISTICS_PERMISSION_GROUPS,
    PERMISSION_GROUPS,
    type User,
    type UserRole,
} from "@/types/auth";
import ButtonCopy from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

type UserFormState = {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    access_policy_id: string | null;
    permission_grants: string[];
    permission_revokes: string[];
    company_id: string | null;
    is_active: boolean;
    is_super_admin: boolean;
};

const EMPTY_FORM: UserFormState = {
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
    access_policy_id: null,
    permission_grants: [],
    permission_revokes: [],
    company_id: null,
    is_active: true,
    is_super_admin: false,
};

const ROLES: UserRole[] = ["ADMIN", "LOGISTICS", "CLIENT"];
const OVERRIDE_FILTERS = ["all", "policy", "overrides", "grants", "revokes"] as const;

type OverrideFilter = (typeof OVERRIDE_FILTERS)[number];

function getPermissionGroupsForRole(role: UserRole): Record<string, string[]> {
    if (role === "ADMIN") return ADMIN_PERMISSION_GROUPS;
    if (role === "LOGISTICS") return LOGISTICS_PERMISSION_GROUPS;
    return PERMISSION_GROUPS;
}

export default function UsersPage() {
    const { user: authUser } = useToken();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordUser, setPasswordUser] = useState<User | null>(null);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [customPassword, setCustomPassword] = useState("");
    const [showCustomPassword, setShowCustomPassword] = useState(false);
    const [overrideSearchTerm, setOverrideSearchTerm] = useState("");
    const [overrideFilter, setOverrideFilter] = useState<OverrideFilter>("all");
    const [duplicateSource, setDuplicateSource] = useState<User | null>(null);

    const queryParams = useMemo(() => {
        const params: Record<string, string> = { limit: "100", page: "1" };
        if (searchTerm.trim()) params.search_term = searchTerm.trim();
        if (roleFilter !== "all") params.role = roleFilter;
        if (statusFilter === "active") params.is_active = "true";
        if (statusFilter === "inactive") params.is_active = "false";
        return params;
    }, [roleFilter, searchTerm, statusFilter]);

    const { data: usersData, isLoading } = useUsers(queryParams);
    const { data: companiesData } = useCompanies({ limit: "200", page: "1" });
    const { data: accessPoliciesData } = useAccessPolicies();
    const createUser = useCreateUser();
    const generatePassword = useGenerateUserPassword();
    const setUserPassword = useSetUserPassword();

    const companies = companiesData?.data || [];
    const users = usersData?.data || [];
    const accessPolicies = accessPoliciesData?.data || [];
    const rolePolicies = accessPolicies.filter((policy) => policy.role === form.role);
    const activePermissionGroups = useMemo(
        () => getPermissionGroupsForRole(form.role),
        [form.role]
    );
    const selectedPolicy =
        accessPolicies.find((policy) => policy.id === form.access_policy_id) || null;
    const canManagePasswords =
        authUser?.is_super_admin || authUser?.permissions?.includes("users:manage_password");

    const effectivePermissions = useMemo(() => {
        const base = selectedPolicy?.permissions || [];
        return [...new Set([...base, ...form.permission_grants])].filter(
            (permission) => !form.permission_revokes.includes(permission)
        );
    }, [form.permission_grants, form.permission_revokes, selectedPolicy?.permissions]);

    const permissionIsImpliedByPolicy = (permission: string) => {
        const policyPermissions = selectedPolicy?.permissions || [];
        if (policyPermissions.includes(permission)) return true;

        const [resource, action] = permission.split(":");
        return Boolean(action && policyPermissions.includes(`${resource}:*`));
    };

    const filteredPermissionGroups = useMemo(() => {
        const query = overrideSearchTerm.trim().toLowerCase();

        return Object.entries(activePermissionGroups)
            .map(([groupName, permissions]) => {
                const filteredPermissions = permissions.filter((permission) => {
                    const inPolicy = permissionIsImpliedByPolicy(permission);
                    const granted = form.permission_grants.includes(permission);
                    const revoked = form.permission_revokes.includes(permission);
                    const matchesQuery =
                        !query ||
                        groupName.toLowerCase().includes(query) ||
                        permission.toLowerCase().includes(query);

                    if (!matchesQuery) return false;

                    switch (overrideFilter) {
                        case "policy":
                            return inPolicy;
                        case "overrides":
                            return granted || revoked;
                        case "grants":
                            return granted;
                        case "revokes":
                            return revoked;
                        default:
                            return true;
                    }
                });

                return [groupName, filteredPermissions] as const;
            })
            .filter(([, permissions]) => permissions.length > 0);
    }, [
        activePermissionGroups,
        form.permission_grants,
        form.permission_revokes,
        overrideFilter,
        overrideSearchTerm,
        selectedPolicy?.permissions,
    ]);

    const openCreate = (role: UserRole) => {
        const defaultPolicy = accessPolicies.find(
            (policy) => policy.role === role && policy.is_active
        );
        setForm({
            ...EMPTY_FORM,
            role,
            access_policy_id: defaultPolicy?.id || null,
        });
        setGeneratedPassword(null);
        setCustomPassword("");
        setShowCustomPassword(false);
        setDuplicateSource(null);
        setIsCreateOpen(true);
    };
    const openDuplicate = (source: User) => {
        // Copy everything that defines "who this user is" except identity
        // (name/email) and credentials (password). Admin fills those in.
        setForm({
            name: "",
            email: "",
            password: "",
            role: source.role,
            access_policy_id: source.access_policy_id ?? source.access_policy?.id ?? null,
            permission_grants: source.permission_grants ?? [],
            permission_revokes: source.permission_revokes ?? [],
            company_id: source.company?.id ?? null,
            is_active: source.is_active,
            is_super_admin: source.is_super_admin,
        });
        setGeneratedPassword(null);
        setCustomPassword("");
        setShowCustomPassword(false);
        setDuplicateSource(source);
        setIsCreateOpen(true);
    };
    const openPasswordDialog = (user: User) => {
        setPasswordUser(user);
        setGeneratedPassword(null);
        setCustomPassword("");
        setShowCustomPassword(false);
        setPasswordDialogOpen(true);
    };

    const toggleOverride = (mode: "grant" | "revoke", permission: string, checked: boolean) => {
        const key = mode === "grant" ? "permission_grants" : "permission_revokes";
        setForm((prev) => {
            const current = prev[key];
            const next = checked
                ? [...new Set([...current, permission])]
                : current.filter((item) => item !== permission);
            const otherKey = mode === "grant" ? "permission_revokes" : "permission_grants";
            return {
                ...prev,
                [key]: next,
                [otherKey]: prev[otherKey].filter((item) => item !== permission),
            };
        });
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return toast.error("Name is required");
        if (!form.email.trim()) return toast.error("Email is required");
        if (form.password.length < 8) {
            return toast.error("Password must be at least 8 characters");
        }
        if (form.role === "CLIENT" && !form.company_id) {
            return toast.error("Client users must be assigned to a company");
        }

        try {
            await createUser.mutateAsync({
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
                role: form.role,
                access_policy_id: form.access_policy_id,
                permission_grants: form.permission_grants,
                permission_revokes: form.permission_revokes,
                company_id: form.role === "CLIENT" ? form.company_id : null,
                is_active: form.is_active,
            });
            toast.success("User created");

            setIsCreateOpen(false);
            setForm(EMPTY_FORM);
            setShowPassword(false);
            setDuplicateSource(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to save user");
        }
    };

    const generateRandomPassword = (length = 12) => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        const bytes = new Uint32Array(length);
        if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
            globalThis.crypto.getRandomValues(bytes);
        } else {
            for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * chars.length);
        }
        let out = "";
        for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
        return out;
    };

    const handleGenerateForCreate = () => {
        const next = generateRandomPassword(12);
        setForm((prev) => ({ ...prev, password: next }));
        setGeneratedPassword(next);
        setShowPassword(true);
    };

    const handleGenerateForExisting = async () => {
        if (!passwordUser) return;
        try {
            const result = await generatePassword.mutateAsync({
                userId: passwordUser.id,
                length: 12,
            });
            setGeneratedPassword(result.temporary_password);
            toast.success("Temporary password generated");
        } catch (error: any) {
            toast.error(error.message || "Failed to generate password");
        }
    };

    const handleSetCustomPassword = async () => {
        if (!passwordUser) return;
        if (customPassword.length < 8) return toast.error("Password must be at least 8 characters");
        try {
            await setUserPassword.mutateAsync({
                userId: passwordUser.id,
                newPassword: customPassword,
            });
            toast.success("Password updated");
            setCustomPassword("");
            setShowCustomPassword(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to set password");
        }
    };

    return (
        <div>
            <AdminHeader
                icon={Users}
                title="USER MANAGEMENT"
                description="Role · Access Policy · Overrides"
                stats={
                    usersData ? { label: "TOTAL USERS", value: usersData.meta.total } : undefined
                }
            />

            {/* Search strip */}
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search users by name or email"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 font-mono text-sm"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px] font-mono text-xs">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-mono text-xs">
                                ALL ROLES
                            </SelectItem>
                            {ROLES.map((role) => (
                                <SelectItem key={role} value={role} className="font-mono text-xs">
                                    {role}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] font-mono text-xs">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-mono text-xs">
                                ALL STATUSES
                            </SelectItem>
                            <SelectItem value="active" className="font-mono text-xs">
                                ACTIVE
                            </SelectItem>
                            <SelectItem value="inactive" className="font-mono text-xs">
                                INACTIVE
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => openCreate("ADMIN")}
                            className="font-mono text-xs"
                        >
                            <UserPlus className="mr-1 h-4 w-4" />
                            Admin
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => openCreate("LOGISTICS")}
                            className="font-mono text-xs"
                        >
                            <UserPlus className="mr-1 h-4 w-4" />
                            Logistics
                        </Button>
                        <Button onClick={() => openCreate("CLIENT")} className="font-mono text-xs">
                            <UserPlus className="mr-1 h-4 w-4" />
                            Client
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm font-mono text-muted-foreground animate-pulse">
                            LOADING USERS...
                        </div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="font-mono text-sm text-muted-foreground">NO USERS FOUND</p>
                    </div>
                ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50">
                                    <TableHead className="font-mono text-xs font-bold">
                                        USER
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        ROLE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        COMPANY
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        ACCESS POLICY
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        OVERRIDES
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        EFFECTIVE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        STATUS
                                    </TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user, index) => (
                                    <TableRow
                                        key={user.id}
                                        className="group hover:bg-muted/30 transition-colors border-border/50"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <TableCell className="font-mono">
                                            <div>
                                                <p className="font-medium text-sm">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {user.role}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {user.company?.name || "Platform-wide"}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {user.access_policy?.name || "No policy"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            +{user.permission_grants?.length || 0} / -
                                            {user.permission_revokes?.length || 0}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {user.permissions.length}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {user.is_active ? "Active" : "Inactive"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/users/${user.id}`)}
                                                    className="font-mono text-xs"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDuplicate(user)}
                                                    className="font-mono text-xs"
                                                >
                                                    Duplicate
                                                </Button>
                                                {canManagePasswords ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openPasswordDialog(user)}
                                                        className="font-mono text-xs"
                                                    >
                                                        Password
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {duplicateSource
                                ? `Duplicate User — copying from ${duplicateSource.name}`
                                : "Create User"}
                        </DialogTitle>
                        <DialogDescription>
                            {duplicateSource
                                ? "Role, access policy, permission overrides, company, and status were copied from the source user. Fill in a new name, email, and password."
                                : "Role sets the boundary. Access Policy sets the default permission bundle. Grants and revokes are explicit per-user overrides."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    value={form.email}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            email: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Temporary Password</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            password: event.target.value,
                                        }))
                                    }
                                    placeholder="Generate or enter a temporary password"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGenerateForCreate}
                                >
                                    Generate
                                </Button>
                                <ButtonCopy
                                    onCopy={async () => {
                                        if (!form.password) return;
                                        await navigator.clipboard.writeText(form.password);
                                        toast.success("Copied");
                                    }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This password is shown once. Share it securely with the user.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                    value={form.role}
                                    onValueChange={(value) => {
                                        const nextRole = value as UserRole;
                                        const defaultPolicy = accessPolicies.find(
                                            (policy) => policy.role === nextRole && policy.is_active
                                        );
                                        setForm((prev) => ({
                                            ...prev,
                                            role: nextRole,
                                            access_policy_id: defaultPolicy?.id || null,
                                            company_id:
                                                nextRole === "CLIENT" ? prev.company_id : null,
                                            permission_grants: [],
                                            permission_revokes: [],
                                        }));
                                    }}
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
                            <div className="space-y-2">
                                <Label>Access Policy</Label>
                                <Select
                                    value={form.access_policy_id || "__none__"}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            access_policy_id: value === "__none__" ? null : value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="No policy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">No policy</SelectItem>
                                        {rolePolicies.map((policy) => (
                                            <SelectItem key={policy.id} value={policy.id}>
                                                {policy.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Company Scope</Label>
                                <Select
                                    value={form.company_id || "__platform__"}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            company_id: value === "__platform__" ? null : value,
                                        }))
                                    }
                                    disabled={form.role !== "CLIENT"}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__platform__">Platform-wide</SelectItem>
                                        {companies.map((company) => (
                                            <SelectItem key={company.id} value={company.id}>
                                                {company.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <Card>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        <h3 className="font-semibold">Permission Overrides</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <Input
                                            value={overrideSearchTerm}
                                            onChange={(event) =>
                                                setOverrideSearchTerm(event.target.value)
                                            }
                                            placeholder="Filter permissions or groups"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {OVERRIDE_FILTERS.map((filter) => (
                                                <Button
                                                    key={filter}
                                                    type="button"
                                                    size="sm"
                                                    variant={
                                                        overrideFilter === filter
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    onClick={() => setOverrideFilter(filter)}
                                                >
                                                    {filter === "all"
                                                        ? "All"
                                                        : filter === "policy"
                                                          ? "In Policy"
                                                          : filter === "overrides"
                                                            ? "Overrides"
                                                            : filter === "grants"
                                                              ? "Granted"
                                                              : "Revoked"}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="max-h-[360px] overflow-y-auto space-y-4 pr-1">
                                        {filteredPermissionGroups.length === 0 ? (
                                            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                                No matching permissions.
                                            </div>
                                        ) : (
                                            filteredPermissionGroups.map(
                                                ([groupName, permissions]) => (
                                                    <div key={groupName} className="space-y-2">
                                                        <p className="text-sm font-medium">
                                                            {groupName}
                                                        </p>
                                                        <div className="space-y-2">
                                                            {permissions.map((permission) => {
                                                                const inPolicy =
                                                                    permissionIsImpliedByPolicy(
                                                                        permission
                                                                    );
                                                                const granted =
                                                                    form.permission_grants.includes(
                                                                        permission
                                                                    );
                                                                const revoked =
                                                                    form.permission_revokes.includes(
                                                                        permission
                                                                    );

                                                                return (
                                                                    <div
                                                                        key={permission}
                                                                        className={cn(
                                                                            "space-y-2 rounded-md border p-3",
                                                                            inPolicy
                                                                                ? "border-primary/25 bg-primary/5"
                                                                                : "border-border/60 bg-muted/40"
                                                                        )}
                                                                    >
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="text-xs font-mono">
                                                                                {permission}
                                                                            </span>
                                                                            {inPolicy ? (
                                                                                <Badge variant="outline">
                                                                                    In policy
                                                                                </Badge>
                                                                            ) : null}
                                                                            {granted ? (
                                                                                <Badge
                                                                                    variant={
                                                                                        inPolicy
                                                                                            ? "outline"
                                                                                            : "secondary"
                                                                                    }
                                                                                >
                                                                                    {inPolicy
                                                                                        ? "Grant no-op"
                                                                                        : "Granted"}
                                                                                </Badge>
                                                                            ) : null}
                                                                            {revoked ? (
                                                                                <Badge
                                                                                    variant={
                                                                                        inPolicy
                                                                                            ? "destructive"
                                                                                            : "outline"
                                                                                    }
                                                                                >
                                                                                    {inPolicy
                                                                                        ? "Revoked"
                                                                                        : "Revoke no-op"}
                                                                                </Badge>
                                                                            ) : null}
                                                                        </div>
                                                                        <div className="grid grid-cols-[auto_auto] justify-start gap-4">
                                                                            <label className="flex items-center gap-2 text-xs">
                                                                                <Checkbox
                                                                                    checked={
                                                                                        granted
                                                                                    }
                                                                                    onCheckedChange={(
                                                                                        checked
                                                                                    ) =>
                                                                                        toggleOverride(
                                                                                            "grant",
                                                                                            permission,
                                                                                            checked ===
                                                                                                true
                                                                                        )
                                                                                    }
                                                                                />
                                                                                Grant
                                                                            </label>
                                                                            <label className="flex items-center gap-2 text-xs">
                                                                                <Checkbox
                                                                                    checked={
                                                                                        revoked
                                                                                    }
                                                                                    onCheckedChange={(
                                                                                        checked
                                                                                    ) =>
                                                                                        toggleOverride(
                                                                                            "revoke",
                                                                                            permission,
                                                                                            checked ===
                                                                                                true
                                                                                        )
                                                                                    }
                                                                                />
                                                                                Revoke
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            )
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6 space-y-4">
                                    <h3 className="font-semibold">Effective Access</h3>
                                    <div className="rounded-md bg-muted/50 p-4 space-y-2">
                                        <p className="text-sm">
                                            Policy:
                                            <span className="ml-2 font-medium">
                                                {selectedPolicy?.name || "No policy"}
                                            </span>
                                        </p>
                                        <p className="text-sm">
                                            Overrides:
                                            <span className="ml-2 font-medium">
                                                +{form.permission_grants.length} / -
                                                {form.permission_revokes.length}
                                            </span>
                                        </p>
                                        <p className="text-sm">
                                            Effective Permissions:
                                            <span className="ml-2 font-medium">
                                                {effectivePermissions.length}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="max-h-[320px] overflow-y-auto rounded-md bg-muted/30 p-4">
                                        {effectivePermissions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                No effective permissions selected.
                                            </p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {effectivePermissions.map((permission) => (
                                                    <span
                                                        key={permission}
                                                        className="rounded-full bg-muted px-2 py-1 text-xs font-mono"
                                                    >
                                                        {permission}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {authUser?.is_super_admin ? (
                                        <label className="flex items-center gap-3 rounded-md bg-muted/40 p-3">
                                            <Checkbox
                                                checked={form.is_super_admin}
                                                onCheckedChange={(checked) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        is_super_admin: checked === true,
                                                    }))
                                                }
                                            />
                                            <span className="text-sm">Super admin</span>
                                        </label>
                                    ) : null}
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
                                        <span className="text-sm">User is active</span>
                                    </label>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>Create User</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Manage Password</DialogTitle>
                        <DialogDescription>
                            Generate a temporary password or set a custom one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-4 w-4" />
                                    <p className="text-sm font-medium">
                                        Generate temporary password
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGenerateForExisting}
                                        disabled={generatePassword.isPending}
                                    >
                                        {generatePassword.isPending ? "Generating..." : "Generate"}
                                    </Button>
                                    {generatedPassword ? (
                                        <>
                                            <Input value={generatedPassword} readOnly />
                                            <ButtonCopy
                                                onCopy={async () => {
                                                    await navigator.clipboard.writeText(
                                                        generatedPassword
                                                    );
                                                    toast.success("Copied");
                                                }}
                                            />
                                        </>
                                    ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    This temporary password is shown once. Share it securely.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-4 w-4" />
                                    <p className="text-sm font-medium">Set custom password</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type={showCustomPassword ? "text" : "password"}
                                        value={customPassword}
                                        onChange={(event) => setCustomPassword(event.target.value)}
                                        placeholder="Minimum 8 characters"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowCustomPassword((prev) => !prev)}
                                    >
                                        {showCustomPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleSetCustomPassword}
                                        disabled={setUserPassword.isPending}
                                    >
                                        {setUserPassword.isPending ? "Saving..." : "Save"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    This replaces the current password immediately.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
