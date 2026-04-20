"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, KeyRound, Shield, Users } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAccessPolicies } from "@/hooks/use-access-policies";
import { useCompanies } from "@/hooks/use-companies";
import {
    useGenerateUserPassword,
    useSetUserPassword,
    useUpdateUser,
    useUser,
} from "@/hooks/use-users";
import { useToken } from "@/lib/auth/use-token";
import {
    ADMIN_PERMISSION_GROUPS,
    LOGISTICS_PERMISSION_GROUPS,
    PERMISSION_GROUPS,
    type UserRole,
} from "@/types/auth";
import ButtonCopy from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

type UserFormState = {
    name: string;
    email: string;
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
    role: "ADMIN",
    access_policy_id: null,
    permission_grants: [],
    permission_revokes: [],
    company_id: null,
    is_active: true,
    is_super_admin: false,
};

const OVERRIDE_FILTERS = ["all", "policy", "overrides", "grants", "revokes"] as const;

type OverrideFilter = (typeof OVERRIDE_FILTERS)[number];

function getPermissionGroupsForRole(role: UserRole): Record<string, string[]> {
    if (role === "ADMIN") return ADMIN_PERMISSION_GROUPS;
    if (role === "LOGISTICS") return LOGISTICS_PERMISSION_GROUPS;
    return PERMISSION_GROUPS;
}

export default function UserEditPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { user: authUser } = useToken();
    const userId = typeof params.id === "string" ? params.id : "";

    const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
    const [overrideSearchTerm, setOverrideSearchTerm] = useState("");
    const [overrideFilter, setOverrideFilter] = useState<OverrideFilter>("all");
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [customPassword, setCustomPassword] = useState("");
    const [showCustomPassword, setShowCustomPassword] = useState(false);

    const { data: userData, isLoading } = useUser(userId);
    const { data: companiesData } = useCompanies({ limit: "200", page: "1" });
    const { data: accessPoliciesData } = useAccessPolicies();
    const updateUser = useUpdateUser();
    const generatePassword = useGenerateUserPassword();
    const setUserPassword = useSetUserPassword();

    const existingUser = userData?.data || null;
    const companies = companiesData?.data || [];
    const accessPolicies = accessPoliciesData?.data || [];

    useEffect(() => {
        if (!existingUser) return;

        setForm({
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            access_policy_id: existingUser.access_policy_id || null,
            permission_grants: existingUser.permission_grants || [],
            permission_revokes: existingUser.permission_revokes || [],
            company_id: existingUser.company?.id || null,
            is_active: existingUser.is_active,
            is_super_admin: existingUser.is_super_admin,
        });
    }, [existingUser]);

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

    const handleSave = async () => {
        if (!userId) return;
        if (!form.name.trim()) return toast.error("Name is required");
        if (form.role === "CLIENT" && !form.company_id) {
            return toast.error("Client users must be assigned to a company");
        }

        try {
            const trimmedEmail = form.email.trim().toLowerCase();
            const emailChanged =
                authUser?.is_super_admin && trimmedEmail && trimmedEmail !== existingUser?.email;

            await updateUser.mutateAsync({
                userId,
                data: {
                    name: form.name.trim(),
                    access_policy_id: form.access_policy_id,
                    permission_grants: form.permission_grants,
                    permission_revokes: form.permission_revokes,
                    company_id: form.role === "CLIENT" ? form.company_id : null,
                    is_active: form.is_active,
                    ...(emailChanged ? { email: trimmedEmail } : {}),
                    ...(authUser?.is_super_admin ? { is_super_admin: form.is_super_admin } : {}),
                },
            });
            toast.success("User updated");
        } catch (error: any) {
            toast.error(error.message || "Failed to save user");
        }
    };

    const handleGeneratePassword = async () => {
        if (!userId) return;
        try {
            const result = await generatePassword.mutateAsync({ userId, length: 12 });
            setGeneratedPassword(result.temporary_password);
            toast.success("Temporary password generated");
        } catch (error: any) {
            toast.error(error.message || "Failed to generate password");
        }
    };

    const handleSetCustomPassword = async () => {
        if (!userId) return;
        if (customPassword.length < 8) return toast.error("Password must be at least 8 characters");

        try {
            await setUserPassword.mutateAsync({ userId, newPassword: customPassword });
            toast.success("Password updated");
            setCustomPassword("");
            setShowCustomPassword(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to set password");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <AdminHeader
                    icon={Users}
                    title="EDIT USER"
                    description="Loading · Access · Overrides"
                    actions={
                        <Button variant="outline" onClick={() => router.push("/users")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Users
                        </Button>
                    }
                />
                <div className="px-8 py-10 text-sm text-muted-foreground">Loading user...</div>
            </div>
        );
    }

    if (!existingUser) {
        return (
            <div className="min-h-screen bg-background">
                <AdminHeader
                    icon={Users}
                    title="EDIT USER"
                    description="Missing · Access · Overrides"
                    actions={
                        <Button variant="outline" onClick={() => router.push("/users")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Users
                        </Button>
                    }
                />
                <div className="px-8 py-10 text-sm text-muted-foreground">User not found.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Users}
                title="EDIT USER"
                description="Profile · Access Policy · Overrides"
                stats={{ label: "ROLE", value: existingUser.role }}
                actions={
                    <>
                        <Button variant="outline" onClick={() => router.push("/users")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button onClick={handleSave} disabled={updateUser.isPending}>
                            {updateUser.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </>
                }
            />

            <div className="container mx-auto px-6 py-8 space-y-6">
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
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="words"
                            spellCheck={false}
                            name="managed-user-name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            value={form.email}
                            disabled={!authUser?.is_super_admin}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    email: event.target.value,
                                }))
                            }
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            name="managed-user-email"
                        />
                        {authUser?.is_super_admin ? (
                            <p className="text-xs text-muted-foreground">
                                Super admins can edit user emails. Email will be normalized to
                                lowercase on save.
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Input value={form.role} disabled />
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
                                    onChange={(event) => setOverrideSearchTerm(event.target.value)}
                                    placeholder="Filter permissions or groups"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    name="user-permission-filter"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {OVERRIDE_FILTERS.map((filter) => (
                                        <Button
                                            key={filter}
                                            type="button"
                                            size="sm"
                                            variant={
                                                overrideFilter === filter ? "default" : "outline"
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
                            <div className="max-h-[520px] overflow-y-auto space-y-4 pr-1">
                                {filteredPermissionGroups.length === 0 ? (
                                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                        No matching permissions.
                                    </div>
                                ) : (
                                    filteredPermissionGroups.map(([groupName, permissions]) => (
                                        <div key={groupName} className="space-y-2">
                                            <p className="text-sm font-medium">{groupName}</p>
                                            <div className="space-y-2">
                                                {permissions.map((permission) => {
                                                    const inPolicy =
                                                        permissionIsImpliedByPolicy(permission);
                                                    const granted =
                                                        form.permission_grants.includes(permission);
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
                                                                        checked={granted}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
                                                                            toggleOverride(
                                                                                "grant",
                                                                                permission,
                                                                                checked === true
                                                                            )
                                                                        }
                                                                    />
                                                                    Grant
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs">
                                                                    <Checkbox
                                                                        checked={revoked}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) =>
                                                                            toggleOverride(
                                                                                "revoke",
                                                                                permission,
                                                                                checked === true
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
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
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
                                <div className="max-h-[260px] overflow-y-auto rounded-md bg-muted/30 p-4">
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

                        {canManagePasswords ? (
                            <Card>
                                <CardContent className="pt-6 space-y-6">
                                    <div className="flex items-center gap-2">
                                        <KeyRound className="h-4 w-4" />
                                        <h3 className="font-semibold">Password Management</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-sm font-medium">
                                            Generate temporary password
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleGeneratePassword}
                                                disabled={generatePassword.isPending}
                                            >
                                                {generatePassword.isPending
                                                    ? "Generating..."
                                                    : "Generate"}
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
                                            This temporary password is shown once. Share it
                                            securely.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-sm font-medium">Set custom password</p>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type={showCustomPassword ? "text" : "password"}
                                                value={customPassword}
                                                onChange={(event) =>
                                                    setCustomPassword(event.target.value)
                                                }
                                                placeholder="Minimum 8 characters"
                                                autoComplete="new-password"
                                                autoCorrect="off"
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                name="managed-user-new-password"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setShowCustomPassword((prev) => !prev)
                                                }
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
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
