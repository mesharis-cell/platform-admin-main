/**
 * Phase 10: Event Start Cron Job
 * POST /api/cron/event-start
 *
 * Automatically transitions orders from DELIVERED to IN_USE on event start date
 * Run frequency: Every hour
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSystemUserId, createStatusHistoryEntry } from "@/lib/services/lifecycle-service";

export async function POST(request: NextRequest) {
	try {
		// Verify cron secret (basic auth for cron jobs)
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET || "change-me-in-production";

		if (authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const systemUserId = await getSystemUserId();
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Start of day

		// Find orders where status = DELIVERED and eventStartDate = today
		const ordersToUpdate = await db.query.orders.findMany({
			where: and(
				eq(orders.status, "DELIVERED"),
				sql`DATE(${orders.eventStartDate}) = ${today.toISOString().split('T')[0]}`
			),
		});

		let updatedCount = 0;

		for (const order of ordersToUpdate) {
			// Update status to IN_USE
			await db
				.update(orders)
				.set({
					status: "IN_USE",
					updatedAt: new Date(),
				})
				.where(eq(orders.id, order.id));

			// Create status history entry
			await createStatusHistoryEntry(
				order.id,
				"IN_USE",
				systemUserId,
				"Automatic transition on event start date"
			);

			updatedCount++;
		}

		console.log(`✅ Event start cron: Updated ${updatedCount} orders to IN_USE`);

		return NextResponse.json({
			success: true,
			updatedCount,
			message: `Transitioned ${updatedCount} orders to IN_USE`,
		});
	} catch (error: any) {
		console.error("❌ Event start cron error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
