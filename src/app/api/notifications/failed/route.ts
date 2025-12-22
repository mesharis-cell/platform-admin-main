/**
 * Phase 10: Failed Notifications API Route
 * GET /api/notifications/failed
 *
 * Retrieve all failed email notifications for PMG Admin review
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, errorResponse, successResponse } from "@/lib/api/auth-middleware";
import { getFailedNotifications } from "@/lib/services/notification-service";

export async function GET(request: NextRequest) {
	try {
		// Require PMG Admin permission
		const permissionCheck = await requirePermission("notifications:view_failed");
		if (permissionCheck instanceof Response) return permissionCheck;

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") as "FAILED" | "RETRYING" | undefined;
		const notificationType = searchParams.get("notificationType") || undefined;
		const orderId = searchParams.get("orderId") || undefined;
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = parseInt(searchParams.get("offset") || "0");

		const result = await getFailedNotifications({
			status,
			notificationType,
			orderId,
			limit,
			offset,
		});

		return successResponse(
			{
				total: result.total,
				notifications: result.notifications.map((n) => ({
					id: n.id,
					order: {
						id: n.order.id,
						orderId: n.order.orderId,
						companyName: n.order.company?.name || "Unknown",
					},
					notificationType: n.notificationType,
					recipients: JSON.parse(n.recipients),
					status: n.status,
					attempts: n.attempts,
					lastAttemptAt: n.lastAttemptAt,
					errorMessage: n.errorMessage,
					createdAt: n.createdAt,
				})),
			},
			200
		);
	} catch (error: any) {
		console.error("Error fetching failed notifications:", error);
		return errorResponse(error.message || "Failed to fetch notifications", 500);
	}
}
