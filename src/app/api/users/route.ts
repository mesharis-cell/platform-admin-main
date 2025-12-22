import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import { createUser, listUsers } from "@/lib/services/user-service";
import { CreateUserRequest, UserListParams } from "@/types/auth";

/**
 * POST /api/users
 * Create new user (PMG Admin only)
 */
export async function POST(request: NextRequest) {
	// Check permission
	const authResult = await requirePermission("users:create");
	if (authResult instanceof Response) return authResult;

	try {
		const body = await request.json();

		// Validate required fields
		if (!body.email || !body.name || !body.password) {
			return errorResponse(
				"Missing required fields: email, name, password",
				400,
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(body.email)) {
			return errorResponse("Invalid email format", 400);
		}

		// Validate password strength
		if (body.password.length < 8) {
			return errorResponse("Password must be at least 8 characters", 400);
		}

		const userData: CreateUserRequest = {
			email: body.email,
			name: body.name,
			password: body.password,
			permissionTemplate: body.permissionTemplate || null,
			permissions: body.permissions || [],
			companies: body.companies || [],
		};

		const result = await createUser(userData);

		if ("error" in result) {
			return errorResponse(result.error, 400);
		}

		return successResponse(result, 201);
	} catch (error) {
		console.error("Error in POST /api/users:", error);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * GET /api/users
 * List users with filtering (PMG Admin and A2 Staff)
 */
export async function GET(request: NextRequest) {
	// Check permission
	const authResult = await requirePermission("users:read");
	if (authResult instanceof Response) return authResult;

	try {
		const { searchParams } = new URL(request.url);

		const params: UserListParams = {
			company: searchParams.get("company") || undefined,
			permissionTemplate:
				(searchParams.get("permissionTemplate") as any) || undefined,
			isActive:
				searchParams.get("isActive") === "true"
					? true
					: searchParams.get("isActive") === "false"
						? false
						: undefined,
			search: searchParams.get("search") || undefined,
			limit: searchParams.get("limit")
				? parseInt(searchParams.get("limit")!)
				: 50,
			offset: searchParams.get("offset")
				? parseInt(searchParams.get("offset")!)
				: 0,
		};

		const result = await listUsers(params);

		if ("error" in result) {
			return errorResponse(result.error, 500);
		}

		return successResponse(result, 200);
	} catch (error) {
		console.error("Error in GET /api/users:", error);
		return errorResponse("Internal server error", 500);
	}
}
