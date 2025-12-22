/**
 * Phase 10: Pickup Reminder Cron Job
 * POST /api/cron/pickup-reminder
 *
 * Sends pickup reminders 48 hours before scheduled pickup window
 * Run frequency: Every 6 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, notificationLogs } from "@/db/schema";
import { eq, and, or, sql, lte, gte } from "drizzle-orm";
import { sendNotification } from "@/lib/services/notification-service";

export async function POST(request: NextRequest) {
	try {
		// Verify cron secret
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET || "change-me-in-production";

		if (authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const now = new Date();
		const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

		// Find orders where:
		// - status = IN_USE or AWAITING_RETURN
		// - pickupWindowStart is within 48 hours
		// - No PICKUP_REMINDER notification with status='SENT' exists
		const ordersForReminder = await db.query.orders.findMany({
			where: and(
				or(eq(orders.status, "IN_USE"), eq(orders.status, "AWAITING_RETURN")),
				lte(orders.pickupWindowStart, in48Hours),
				gte(orders.pickupWindowStart, now)
			),
		});

		let remindersSent = 0;

		for (const order of ordersForReminder) {
			// Check if reminder already sent
			const existingReminder = await db.query.notificationLogs.findFirst({
				where: and(
					eq(notificationLogs.order, order.id),
					eq(notificationLogs.notificationType, "PICKUP_REMINDER"),
					eq(notificationLogs.status, "SENT")
				),
			});

			if (existingReminder) {
				continue; // Skip if already sent
			}

			// Send reminder
			await sendNotification("PICKUP_REMINDER", order.id);
			remindersSent++;
		}

		console.log(`✅ Pickup reminder cron: Sent ${remindersSent} reminders`);

		return NextResponse.json({
			success: true,
			remindersSent,
			message: `Sent ${remindersSent} pickup reminders`,
		});
	} catch (error: any) {
		console.error("❌ Pickup reminder cron error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
