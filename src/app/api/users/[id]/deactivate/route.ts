import { NextRequest } from "next/server";
import {
	requirePermission,
	errorResponse,
	successResponse,
} from "@/lib/api/auth-middleware";
import { deactivateUser } from "@/lib/services/user-service";

/**
 * POST /api/users/:id/deactivate
 * Deactivate user (PMG Admin only)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	// Check permission
	const authResult = await requirePermission("users:deactivate");
	if (authResult instanceof Response) return authResult;

	try {
		const { id } = await params;
		const result = await deactivateUser(id);

		if (!result.success) {
			return errorResponse(result.error || "Failed to deactivate user", 400);
		}

		return successResponse(
			{
				id,
				isActive: false,
				deactivatedAt: new Date().toISOString(),
			},
			200,
		);
	} catch (error) {
		console.error("Error in POST /api/users/:id/deactivate:", error);
		return errorResponse("Internal server error", 500);
	}
}
