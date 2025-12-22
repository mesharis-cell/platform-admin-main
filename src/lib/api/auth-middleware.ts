import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { hasPermission, hasCompanyAccess } from "@/lib/auth/permissions";
import { User } from "@/types/auth";

/**
 * Get current authenticated user from session
 */
export async function getAuthUser(): Promise<User | null> {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session?.user) return null;

		// Map better-auth user to our User type
		const user: User = {
			id: session.user.id,
			email: session.user.email,
			name: session.user.name,
			permissions: (session.user as any).permissions || [],
			companies: (session.user as any).companies || [],
			permissionTemplate: (session.user as any).permissionTemplate || null,
			isActive: (session.user as any).isActive ?? true,
			lastLoginAt: (session.user as any).lastLoginAt || null,
			createdAt: new Date(session.user.createdAt),
			updatedAt: new Date(session.user.updatedAt),
			deletedAt: (session.user as any).deletedAt || null,
		};

		return user;
	} catch (error) {
		console.error("Error getting auth user:", error);
		return null;
	}
}

/**
 * Require authentication for API routes
 * Returns 401 if not authenticated
 */
export async function requireAuth(): Promise<
	{ user: User } | NextResponse
> {
	const user = await getAuthUser();

	if (!user) {
		return NextResponse.json(
			{ error: "Unauthorized - authentication required" },
			{ status: 401 },
		);
	}

	if (!user.isActive) {
		return NextResponse.json(
			{ error: "Account is deactivated" },
			{ status: 403 },
		);
	}

	return { user };
}

/**
 * Require specific permission for API routes
 * Returns 403 if user lacks permission
 */
export async function requirePermission(
	permission: string,
): Promise<{ user: User } | NextResponse> {
	const authResult = await requireAuth();

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	const { user } = authResult;

	if (!hasPermission(user, permission)) {
		return NextResponse.json(
			{
				error: `Forbidden - missing permission: ${permission}`,
			},
			{ status: 403 },
		);
	}

	return { user };
}

/**
 * Require company access for API routes
 * Returns 403 if user lacks access to specified company
 */
export async function requireCompanyAccess(
	companyId: string,
): Promise<{ user: User } | NextResponse> {
	const authResult = await requireAuth();

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	const { user } = authResult;

	if (!hasCompanyAccess(user, companyId)) {
		return NextResponse.json(
			{
				error: `Forbidden - no access to company: ${companyId}`,
			},
			{ status: 403 },
		);
	}

	return { user };
}

/**
 * Create standardized error response
 */
export function errorResponse(message: string, status: number = 400) {
	return NextResponse.json({ error: message }, { status });
}

/**
 * Create standardized success response
 */
export function successResponse<T>(data: T, status: number = 200) {
	return NextResponse.json(data, { status });
}
