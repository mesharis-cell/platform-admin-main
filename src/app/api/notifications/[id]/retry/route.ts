/**
 * Phase 10: Retry Failed Notification API Route
 * POST /api/notifications/[id]/retry
 *
 * Manually retry a failed email notification
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, errorResponse, successResponse } from "@/lib/api/auth-middleware";
import { retryNotification } from "@/lib/services/notification-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
		// Require PMG Admin permission
		const permissionCheck = await requirePermission("notifications:retry");
		if (permissionCheck instanceof Response) return permissionCheck;

		const result = await retryNotification(id);

		if (!result.success) {
			return errorResponse(result.error || "Failed to retry notification", 400);
		}

		return successResponse(
			{
				message: "Notification retry successful",
			},
			200
		);
	} catch (error: any) {
		console.error("Error retrying notification:", error);
		return errorResponse(error.message || "Failed to retry notification", 500);
	}
}
