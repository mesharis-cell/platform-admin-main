"use client";

import { useToken } from "@/lib/auth/use-token";
import { hasAnyPermission, hasAllPermissions } from "@/lib/auth/permissions";

interface PermissionGateProps {
    children: React.ReactNode;
    /** Show children if the user has ANY of these permissions */
    anyOf?: string[];
    /** Show children if the user has ALL of these permissions */
    allOf?: string[];
    /** Rendered when the permission check fails. Defaults to null. */
    fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on the current user's permissions.
 *
 * Usage:
 *   <PermissionGate anyOf={["orders:update", "orders:cancel"]}>
 *     <Button>Cancel Order</Button>
 *   </PermissionGate>
 *
 *   <PermissionGate allOf={["assets:create", "assets:bulk_upload"]} fallback={<p>No access</p>}>
 *     <BulkUploadPanel />
 *   </PermissionGate>
 */
export function PermissionGate({ children, anyOf, allOf, fallback = null }: PermissionGateProps) {
    const { user } = useToken();
    if (anyOf && !hasAnyPermission(user, anyOf)) return <>{fallback}</>;
    if (allOf && !hasAllPermissions(user, allOf)) return <>{fallback}</>;
    return <>{children}</>;
}
