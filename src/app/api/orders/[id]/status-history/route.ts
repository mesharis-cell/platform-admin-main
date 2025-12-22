/**
 * Phase 10: Order Status History API Route
 * GET /api/orders/[id]/status-history
 *
 * Retrieve complete audit trail of status changes for an order
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse, successResponse } from "@/lib/api/auth-middleware";
import { db } from "@/db";
import { orders, orderStatusHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
		// Require authentication
		const authResult = await requireAuth();
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		// Get order
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, id),
			with: {
				company: true,
				statusHistory: {
					orderBy: desc(orderStatusHistory.timestamp),
					with: {
						updatedByUser: {
							columns: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
			},
		});

		if (!order) {
			return errorResponse("Order not found", 404);
		}

		// Check company access (clients can only see own company)
		const hasAccess =
			user.companies.includes("*") || user.companies.includes(order.company.id);

		if (!hasAccess) {
			return errorResponse("You do not have access to this order", 403);
		}

		return successResponse(
			{
				orderId: order.orderId,
				currentStatus: order.status,
				history: order.statusHistory,
			},
			200
		);
	} catch (error: any) {
		console.error("Error fetching status history:", error);
		return errorResponse(error.message || "Failed to fetch status history", 500);
	}
}
