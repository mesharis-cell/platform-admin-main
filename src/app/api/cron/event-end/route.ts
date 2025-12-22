/**
 * Phase 10: Event End Cron Job
 * POST /api/cron/event-end
 *
 * Automatically transitions orders from IN_USE to AWAITING_RETURN on event end date
 * Run frequency: Every hour
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSystemUserId, createStatusHistoryEntry } from "@/lib/services/lifecycle-service";

export async function POST(request: NextRequest) {
	try {
		// Verify cron secret
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET || "change-me-in-production";

		if (authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const systemUserId = await getSystemUserId();
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Find orders where status = IN_USE and eventEndDate = today
		const ordersToUpdate = await db.query.orders.findMany({
			where: and(
				eq(orders.status, "IN_USE"),
				sql`DATE(${orders.eventEndDate}) = ${today.toISOString().split('T')[0]}`
			),
		});

		let updatedCount = 0;

		for (const order of ordersToUpdate) {
			// Update status to AWAITING_RETURN
			await db
				.update(orders)
				.set({
					status: "AWAITING_RETURN",
					updatedAt: new Date(),
				})
				.where(eq(orders.id, order.id));

			// Create status history entry
			await createStatusHistoryEntry(
				order.id,
				"AWAITING_RETURN",
				systemUserId,
				"Automatic transition on event end date"
			);

			updatedCount++;
		}

		console.log(`✅ Event end cron: Updated ${updatedCount} orders to AWAITING_RETURN`);

		return NextResponse.json({
			success: true,
			updatedCount,
			message: `Transitioned ${updatedCount} orders to AWAITING_RETURN`,
		});
	} catch (error: any) {
		console.error("❌ Event end cron error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
