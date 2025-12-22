import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import { reactivateUser } from "@/lib/services/user-service";

/**
 * POST /api/users/:id/reactivate
 * Reactivate user (PMG Admin only)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	// Check permission
	const authResult = await requirePermission("users:update");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const result = await reactivateUser(id);

		if (!result.success) {
			return errorResponse(result.error || "Failed to reactivate user", 400);
		}

		return successResponse(
			{
				id,
				isActive: true,
				reactivatedAt: new Date().toISOString(),
			},
			200,
		);
	} catch (error) {
		console.error("Error in POST /api/users/:id/reactivate:", error);
		return errorResponse("Internal server error", 500);
	}
}
