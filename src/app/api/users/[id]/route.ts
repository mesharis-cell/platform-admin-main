import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import { getUserById, updateUser } from "@/lib/services/user-service";
import { UpdateUserRequest } from "@/types/auth";

/**
 * GET /api/users/:id
 * Get user by ID (PMG Admin and A2 Staff)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	// Check permission
	const authResult = await requirePermission("users:read");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const result = await getUserById(id);

		if ("error" in result) {
			return errorResponse(result.error, 404);
		}

		return successResponse(result, 200);
	} catch (error) {
		console.error("Error in GET /api/users/:id:", error);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * PATCH /api/users/:id
 * Update user (PMG Admin only)
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	// Check permission
	const authResult = await requirePermission("users:update");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const body = await request.json();

		const updateData: UpdateUserRequest = {};

		if (body.name !== undefined) updateData.name = body.name;
		if (body.permissions !== undefined)
			updateData.permissions = body.permissions;
		if (body.companies !== undefined) updateData.companies = body.companies;
		if (body.permissionTemplate !== undefined)
			updateData.permissionTemplate = body.permissionTemplate;

		const result = await updateUser(id, updateData);

		if ("error" in result) {
			return errorResponse(result.error, 400);
		}

		return successResponse(result, 200);
	} catch (error) {
		console.error("Error in PATCH /api/users/:id:", error);
		return errorResponse("Internal server error", 500);
	}
}
