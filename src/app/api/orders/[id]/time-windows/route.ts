/**
 * Phase 10: Time Windows Management API Route
 * PUT /api/orders/[id]/time-windows
 *
 * Add or update delivery and pickup time windows for an order
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, errorResponse, successResponse } from "@/lib/api/auth-middleware";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendNotification } from "@/lib/services/notification-service";

interface TimeWindowsRequest {
	deliveryWindowStart: string;
	deliveryWindowEnd: string;
	pickupWindowStart: string;
	pickupWindowEnd: string;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
		// Require A2 Staff permission
		const permissionCheck = await requirePermission("orders:add_time_windows");
		if (permissionCheck instanceof Response) return permissionCheck;
		const { user } = permissionCheck;

		// Get request body
		const body: TimeWindowsRequest = await request.json();
		const { deliveryWindowStart, deliveryWindowEnd, pickupWindowStart, pickupWindowEnd } = body;

		// Validate all fields are provided
		if (!deliveryWindowStart || !deliveryWindowEnd || !pickupWindowStart || !pickupWindowEnd) {
			return errorResponse("All time window fields are required", 400);
		}

		// Parse dates
		const deliveryStart = new Date(deliveryWindowStart);
		const deliveryEnd = new Date(deliveryWindowEnd);
		const pickupStart = new Date(pickupWindowStart);
		const pickupEnd = new Date(pickupWindowEnd);

		// Validate dates
		if (isNaN(deliveryStart.getTime()) || isNaN(deliveryEnd.getTime()) ||
		    isNaN(pickupStart.getTime()) || isNaN(pickupEnd.getTime())) {
			return errorResponse("Invalid date format. Use ISO 8601 format.", 400);
		}

		// Business rule validations
		if (deliveryEnd <= deliveryStart) {
			return errorResponse("Delivery window end must be after start", 400);
		}

		if (pickupEnd <= pickupStart) {
			return errorResponse("Pickup window end must be after start", 400);
		}

		// Get order
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, id),
			with: {
				company: true,
			},
		});

		if (!order) {
			return errorResponse("Order not found", 404);
		}

		// Validate order status (cannot change after IN_TRANSIT)
		const immutableStatuses = ["IN_TRANSIT", "DELIVERED", "IN_USE", "AWAITING_RETURN", "CLOSED"];
		if (immutableStatuses.includes(order.status)) {
			return errorResponse("Cannot update time windows after order is in transit", 400);
		}

		// Validate time windows are reasonable (relaxed constraints)
		// Delivery should generally be before event, pickup after event
		// But we allow flexibility for edge cases

		// Update order
		await db
			.update(orders)
			.set({
				deliveryWindowStart: deliveryStart,
				deliveryWindowEnd: deliveryEnd,
				pickupWindowStart: pickupStart,
				pickupWindowEnd: pickupEnd,
				updatedAt: new Date(),
			})
			.where(eq(orders.id, id));

		// Get updated order
		const updatedOrder = await db.query.orders.findFirst({
			where: eq(orders.id, id),
		});

		// Send TIME_WINDOWS_UPDATED notification
		sendNotification("TIME_WINDOWS_UPDATED", id).catch((error) => {
			console.error("Failed to send time windows updated notification:", error);
		});

		return successResponse(
			{
				order: updatedOrder,
				message: "Time windows updated successfully",
			},
			200
		);
	} catch (error: any) {
		console.error("Error updating time windows:", error);
		return errorResponse(error.message || "Failed to update time windows", 500);
	}
}
