import { User } from "@/types/auth";

/**
 * Check if user has a specific permission
 * Supports wildcard permissions (e.g., "users:*" matches "users:create", "users:read", etc.)
 */
export function hasPermission(
	user: User | null,
	requiredPermission: string,
): boolean {
	if (!user || !user.isActive) return false;

	// Check for exact permission match
	if (user.permissions.includes(requiredPermission)) return true;

	// Check for wildcard permissions
	const [resource, action] = requiredPermission.split(":");
	if (action && user.permissions.includes(`${resource}:*`)) return true;

	return false;
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(
	user: User | null,
	requiredPermissions: string[],
): boolean {
	if (!user || !user.isActive) return false;
	return requiredPermissions.every((permission) =>
		hasPermission(user, permission),
	);
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(
	user: User | null,
	requiredPermissions: string[],
): boolean {
	if (!user || !user.isActive) return false;
	return requiredPermissions.some((permission) =>
		hasPermission(user, permission),
	);
}

/**
 * Check if user has access to a specific company
 */
export function hasCompanyAccess(
	user: User | null,
	companyId: string,
): boolean {
	if (!user || !user.isActive) return false;

	// Check for wildcard access (all companies)
	if (user.companies.includes("*")) return true;

	// Check for specific company access
	return user.companies.includes(companyId);
}

/**
 * Get list of company IDs user has access to
 * Returns null if user has access to all companies (wildcard)
 */
export function getUserCompanyScope(user: User | null): string[] | null {
	if (!user || !user.isActive) return [];

	// Wildcard access
	if (user.companies.includes("*")) return null;

	return user.companies;
}

/**
 * Filter query by user's company scope
 * Returns company filter for SQL WHERE clause
 */
export function getCompanyScopeFilter(
	user: User | null,
): { type: "all" | "specific" | "none"; companyIds?: string[] } {
	if (!user || !user.isActive) {
		return { type: "none" };
	}

	if (user.companies.includes("*")) {
		return { type: "all" };
	}

	return {
		type: "specific",
		companyIds: user.companies,
	};
}
