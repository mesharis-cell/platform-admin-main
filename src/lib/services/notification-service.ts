/**
 * Phase 10: Notification Service with Comprehensive Logging
 *
 * Handles all lifecycle notifications with proper logging to notificationLogs table.
 * Supports automatic retry mechanisms and failed notification tracking.
 */

import 'server-only'

import { Resend } from 'resend'
import { db } from '@/db'
import { user, orders, notificationLogs } from '@/db/schema'
import { eq, or, sql, and, desc } from 'drizzle-orm'
import { formatDateForEmail } from './email-service'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// ============================================================
// Notification Types & Matrix
// ============================================================

export type NotificationType =
	| 'ORDER_SUBMITTED'
	| 'A2_APPROVED_STANDARD'
	| 'A2_ADJUSTED_PRICING'
	| 'QUOTE_SENT'
	| 'QUOTE_APPROVED'
	| 'QUOTE_DECLINED'
	| 'INVOICE_GENERATED'
	| 'PAYMENT_CONFIRMED'
	| 'ORDER_CONFIRMED'
	| 'READY_FOR_DELIVERY'
	| 'IN_TRANSIT'
	| 'DELIVERED'
	| 'PICKUP_REMINDER'
	| 'ORDER_CLOSED'
	| 'TIME_WINDOWS_UPDATED'

export interface NotificationRecipients {
	to: string[]
	cc?: string[]
	bcc?: string[]
}

export interface NotificationData {
	orderId: string
	orderIdReadable: string
	companyName: string
	contactName: string
	eventStartDate?: string
	eventEndDate?: string
	venueName?: string
	venueCity?: string
	finalTotalPrice?: string
	invoiceNumber?: string
	deliveryWindow?: string
	pickupWindow?: string
	orderUrl: string
	supportEmail: string
	supportPhone: string
	// Additional context fields
	adjustmentReason?: string
	a2AdjustedPrice?: string
	declineReason?: string
}

// ============================================================
// Core Notification Functions
// ============================================================

/**
 * Send notification with automatic logging
 * This is the main entry point for all notifications
 */
export async function sendNotification(
	notificationType: NotificationType,
	orderId: string,
	overrideRecipients?: Partial<NotificationRecipients>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
	try {
		// Get order data
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, orderId),
			with: {
				company: true,
			},
		})

		if (!order) {
			throw new Error(`Order ${orderId} not found`)
		}

		// Determine recipients based on notification type and matrix
		const recipients =
			overrideRecipients ||
			(await getRecipientsForNotification(notificationType, order))

		// Log recipient details for debugging
		console.log(
			`📧 Preparing notification: ${notificationType} for order ${order.orderId}`
		)
		console.log(`   TO: ${recipients.to.join(', ')}`)
		if (recipients.cc && recipients.cc.length > 0) {
			console.log(`   CC: ${recipients.cc.join(', ')}`)
		}

		// Build notification data
		const data = await buildNotificationData(order)

		// Get email template
		const { subject, html } = await getEmailTemplate(notificationType, data)

		// Create notification log entry (QUEUED status)
		const [logEntry] = await db
			.insert(notificationLogs)
			.values({
				order: orderId,
				notificationType,
				recipients: JSON.stringify(recipients),
				status: 'QUEUED',
				attempts: 1,
			})
			.returning()

		// Send email
		try {
			// Send to all primary recipients
			let primaryMessageId = ''
			for (const toEmail of recipients.to) {
				const messageId = await sendEmailWithLogging(
					toEmail,
					subject,
					html
				)
				if (!primaryMessageId) primaryMessageId = messageId
				console.log(
					`   ✓ Sent to: ${toEmail} (Message ID: ${messageId})`
				)
			}

			// Update log entry to SENT
			await db
				.update(notificationLogs)
				.set({
					status: 'SENT',
					sentAt: new Date(),
					messageId: primaryMessageId,
				})
				.where(eq(notificationLogs.id, logEntry.id))

			// Send CC'd emails
			if (recipients.cc && recipients.cc.length > 0) {
				for (const ccEmail of recipients.cc) {
					const ccMessageId = await sendEmailWithLogging(
						ccEmail,
						subject,
						html
					)
					console.log(
						`   ✓ CC sent to: ${ccEmail} (Message ID: ${ccMessageId})`
					)
				}
			}

			console.log(
				`✅ Notification sent: ${notificationType} for order ${order.orderId} (Total: ${recipients.to.length} primary, ${recipients.cc?.length || 0} CC)`
			)
			return { success: true, messageId: primaryMessageId }
		} catch (emailError: any) {
			// Update log entry to FAILED
			await db
				.update(notificationLogs)
				.set({
					status: 'FAILED',
					errorMessage: emailError.message || 'Unknown email error',
				})
				.where(eq(notificationLogs.id, logEntry.id))

			console.error(
				`❌ Notification failed: ${notificationType} for order ${order.orderId}`,
				emailError
			)
			return { success: false, error: emailError.message }
		}
	} catch (error: any) {
		console.error(`❌ Error in sendNotification:`, error)
		return { success: false, error: error.message }
	}
}

/**
 * Retry a failed notification
 */
export async function retryNotification(
	notificationLogId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get notification log entry
		const logEntry = await db.query.notificationLogs.findFirst({
			where: eq(notificationLogs.id, notificationLogId),
			with: {
				order: true,
			},
		})

		if (!logEntry) {
			throw new Error('Notification log entry not found')
		}

		if (logEntry.status !== 'FAILED') {
			throw new Error('Can only retry FAILED notifications')
		}

		// Parse recipients
		const recipients: NotificationRecipients = JSON.parse(
			logEntry.recipients
		)

		// Build notification data
		const data = await buildNotificationData(logEntry.order)

		// Get email template
		const { subject, html } = await getEmailTemplate(
			logEntry.notificationType as NotificationType,
			data
		)

		// Update log entry to RETRYING
		await db
			.update(notificationLogs)
			.set({
				status: 'RETRYING',
				attempts: logEntry.attempts + 1,
				lastAttemptAt: new Date(),
			})
			.where(eq(notificationLogs.id, notificationLogId))

		// Attempt to send
		try {
			const messageId = await sendEmailWithLogging(
				recipients.to[0],
				subject,
				html
			)

			// Update to SENT
			await db
				.update(notificationLogs)
				.set({
					status: 'SENT',
					sentAt: new Date(),
					messageId,
					errorMessage: null,
				})
				.where(eq(notificationLogs.id, notificationLogId))

			// Send CC'd emails
			if (recipients.cc && recipients.cc.length > 0) {
				for (const ccEmail of recipients.cc) {
					await sendEmailWithLogging(ccEmail, subject, html)
				}
			}

			console.log(
				`✅ Notification retry successful: ${logEntry.notificationType}`
			)
			return { success: true }
		} catch (emailError: any) {
			// Update back to FAILED
			await db
				.update(notificationLogs)
				.set({
					status: 'FAILED',
					errorMessage: emailError.message || 'Unknown email error',
				})
				.where(eq(notificationLogs.id, notificationLogId))

			return { success: false, error: emailError.message }
		}
	} catch (error: any) {
		return { success: false, error: error.message }
	}
}

/**
 * Get failed notifications for admin dashboard
 */
export async function getFailedNotifications(filters?: {
	status?: 'FAILED' | 'RETRYING'
	notificationType?: string
	orderId?: string
	limit?: number
	offset?: number
}) {
	const conditions = []

	if (filters?.status) {
		conditions.push(eq(notificationLogs.status, filters.status))
	} else {
		conditions.push(
			or(
				eq(notificationLogs.status, 'FAILED'),
				eq(notificationLogs.status, 'RETRYING')
			)
		)
	}

	if (filters?.notificationType) {
		conditions.push(
			eq(notificationLogs.notificationType, filters.notificationType)
		)
	}

	if (filters?.orderId) {
		conditions.push(eq(notificationLogs.order, filters.orderId))
	}

	const notifications = await db.query.notificationLogs.findMany({
		where: and(...conditions),
		with: {
			order: {
				with: {
					company: true,
				},
			},
		},
		orderBy: desc(notificationLogs.createdAt),
		limit: filters?.limit || 50,
		offset: filters?.offset || 0,
	})

	const total = await db
		.select({ count: sql`count(*)` })
		.from(notificationLogs)
		.where(and(...conditions))

	return {
		notifications,
		total: Number(total[0].count),
	}
}

// ============================================================
// Recipient Determination (Notification Matrix)
// ============================================================

async function getRecipientsForNotification(
	notificationType: NotificationType,
	order: any
): Promise<NotificationRecipients> {
	// Get PMG Admins
	const pmgAdmins = await db
		.select({ email: user.email })
		.from(user)
		.where(
			and(
				eq(user.permissionTemplate, 'PMG_ADMIN'),
				sql`${user.email} NOT LIKE '%@system.internal'`
			)
		)

	const pmgEmails = pmgAdmins.map(a => a.email)
	console.log(
		`   📋 Found ${pmgEmails.length} PMG Admin(s): ${pmgEmails.join(', ') || 'none'}`
	)

	// Get A2 Staff (exclude system users)
	const a2Staff = await db
		.select({ email: user.email })
		.from(user)
		.where(
			and(
				eq(user.permissionTemplate, 'A2_STAFF'),
				sql`${user.email} NOT LIKE '%@system.internal'`
			)
		)

	const a2Emails = a2Staff.map(s => s.email)
	console.log(
		`   📋 Found ${a2Emails.length} A2 Staff: ${a2Emails.join(', ') || 'none'}`
	)

	// Client email
	const clientEmail = order.contactEmail
	console.log(`   📋 Client email: ${clientEmail || 'not set'}`)

	// Notification Matrix (based on req.md Email Notification Matrix)
	const matrix: Record<NotificationType, NotificationRecipients> = {
		ORDER_SUBMITTED: { to: [clientEmail], cc: [...pmgEmails, ...a2Emails] },
		A2_APPROVED_STANDARD: { to: pmgEmails }, // PMG only (FYI) - no CC to A2
		A2_ADJUSTED_PRICING: { to: pmgEmails }, // PMG only (Action Required) - no CC to A2
		QUOTE_SENT: { to: [clientEmail], cc: pmgEmails },
		QUOTE_APPROVED: { to: [...pmgEmails, ...a2Emails] }, // PMG + A2, no CC to client
		QUOTE_DECLINED: { to: [...pmgEmails, ...a2Emails] }, // PMG + A2, no CC to client
		INVOICE_GENERATED: { to: [clientEmail], cc: pmgEmails },
		PAYMENT_CONFIRMED: {
			to: [...pmgEmails, ...a2Emails],
		}, // PMG + A2, no CC to client
		ORDER_CONFIRMED: { to: [...pmgEmails, ...a2Emails, clientEmail] },
		READY_FOR_DELIVERY: { to: pmgEmails }, // PMG only (FYI) - no CC to A2
		IN_TRANSIT: { to: [clientEmail], cc: [...pmgEmails] }, // Client + PMG FYI, no A2
		DELIVERED: { to: [...pmgEmails, ...a2Emails, clientEmail] },
		PICKUP_REMINDER: { to: [...pmgEmails, ...a2Emails, clientEmail] },
		ORDER_CLOSED: { to: pmgEmails }, // PMG only, no CC to A2
		TIME_WINDOWS_UPDATED: { to: [clientEmail, ...pmgEmails] },
	}

	return matrix[notificationType]
}

// ============================================================
// Email Template Generation
// ============================================================

async function getEmailTemplate(
	notificationType: NotificationType,
	data: NotificationData
): Promise<{ subject: string; html: string }> {
	const baseStyle = `
		margin: 0; padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background-color: #f6f9fc;
	`

	const templates: Record<
		NotificationType,
		{ subject: string; html: string }
	> = {
		ORDER_SUBMITTED: {
			subject: `Order Submitted: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Order Submitted Successfully</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Your order has been received and is now being reviewed.</p>
				<div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
					<p style="margin: 8px 0;"><strong>Event:</strong> ${data.eventStartDate} - ${data.eventEndDate}</p>
					<p style="margin: 8px 0;"><strong>Venue:</strong> ${data.venueName}, ${data.venueCity}</p>
				</div>
				<p style="margin: 16px 0;">Next Steps: Our team will review your order and contact you with pricing within 24 hours.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
				<p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">Questions? Contact us at ${data.supportEmail} or ${data.supportPhone}</p>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},

		QUOTE_SENT: {
			subject: `Quote Ready: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Your Quote is Ready</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Your quote for order ${data.orderIdReadable} has been prepared.</p>
				<div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
					<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Total Price: ${data.finalTotalPrice} AED</p>
				</div>
				<p style="margin: 16px 0; color: #dc2626; font-weight: 600;">⚠️ Action Required: Please review and approve or decline the quote.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Quote</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},

		INVOICE_GENERATED: {
			subject: `Invoice Ready: ${data.invoiceNumber}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Invoice Ready for Payment</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Your invoice is ready for payment.</p>
				<div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Amount Due: ${data.finalTotalPrice} AED</p>
				</div>
				<p style="margin: 16px 0; color: #dc2626; font-weight: 600;">⚠️ Payment Required: Please process payment to proceed with fulfillment.</p>
				<a href="${data.orderUrl.replace('/orders/', '/api/client/invoices/download/')}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Download Cost Estimate PDF</a>
				<p style="margin: 16px 0; font-size: 14px; color: #6b7280;">Or view order details: <a href="${data.orderUrl}" style="color: #2563eb; text-decoration: underline;">View Order</a></p>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},

		DELIVERED: {
			subject: `Order Delivered: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #10b981;">✓ Order Delivered Successfully</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Your order has been delivered to the venue.</p>
				<div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Venue:</strong> ${data.venueName}</p>
					${data.pickupWindow ? `<p style="margin: 8px 0;"><strong>Pickup Window:</strong> ${data.pickupWindow}</p>` : ''}
				</div>
				<p style="margin: 16px 0;">Please remember to prepare items for return during the scheduled pickup window.</p>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},

		PICKUP_REMINDER: {
			subject: `Pickup Reminder: ${data.orderIdReadable} in 48 Hours`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #f59e0b;">⏰ Pickup Reminder</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Your order is scheduled for pickup in 48 hours.</p>
				<div style="background: #fef3c7; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #f59e0b;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Pickup Window:</strong> ${data.pickupWindow}</p>
					<p style="margin: 8px 0;"><strong>Venue:</strong> ${data.venueName}</p>
				</div>
				<p style="margin: 16px 0; font-weight: 600;">Please ensure all items are ready for pickup at the scheduled time.</p>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},

		// Enhanced templates for all remaining types
		A2_APPROVED_STANDARD: {
			subject: `FYI: Standard Pricing Approved for ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Standard Pricing Approved</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">A2 Logistics has approved standard pricing for this order. Quote is being sent to client.</p>
				<div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
				</div>
				<p style="margin: 16px 0;">No further action required. The client has been notified and can now approve or decline the quote.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		A2_ADJUSTED_PRICING: {
			subject: `Action Required: Pricing Adjustment for ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #f59e0b;">⚠️ Pricing Adjustment Required</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">A2 Logistics has adjusted pricing for this order and requires PMG approval before sending quote to client.</p>
				<div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
					${data.adjustmentReason ? `<p style="margin: 8px 0;"><strong>Adjustment Reason:</strong> ${data.adjustmentReason}</p>` : ''}
					${data.a2AdjustedPrice ? `<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">A2 Adjusted Price: ${data.a2AdjustedPrice} AED</p>` : ''}
				</div>
				<p style="margin: 16px 0; color: #dc2626; font-weight: 600;">⚠️ Action Required: Please review and approve pricing before it's sent to the client.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #f59e0b; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Review Pricing</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		QUOTE_APPROVED: {
			subject: `Quote Approved: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #10b981;">✓ Quote Approved</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Great news! The client has approved the quote and the order is proceeding to invoicing.</p>
				<div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
					<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Total Amount: ${data.finalTotalPrice} AED</p>
				</div>
				<p style="margin: 16px 0;">Next Steps: Invoice is being generated and will be sent to the client shortly.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #10b981; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		QUOTE_DECLINED: {
			subject: `Quote Declined: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #dc2626;">Quote Declined</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">The client has declined the quote for this order.</p>
				<div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
					${data.declineReason ? `<p style="margin: 16px 0 8px; font-weight: bold;">Reason:</p><p style="margin: 8px 0; padding: 12px; background: #fff; border-radius: 4px; border: 1px solid #fecaca;">${data.declineReason}</p>` : ''}
				</div>
				<p style="margin: 16px 0;">You may want to follow up with the client to understand their concerns and potentially provide a revised quote.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #dc2626; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order Details</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		PAYMENT_CONFIRMED: {
			subject: `Payment Confirmed: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #10b981;">✓ Payment Confirmed</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Payment has been received and confirmed for this order.</p>
				<div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
					<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Amount Paid: ${data.finalTotalPrice} AED</p>
				</div>
				<p style="margin: 16px 0;">Next Steps: Set delivery schedule and confirm order to begin fulfillment.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #10b981; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Proceed with Order</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		ORDER_CONFIRMED: {
			subject: `Order Confirmed: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #2563eb;">Order Confirmed & Proceeding to Fulfillment</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Order has been confirmed and assets have been reserved. Fulfillment process is beginning.</p>
				<div style="background: #eff6ff; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
					<p style="margin: 8px 0;"><strong>Event:</strong> ${data.eventStartDate}</p>
					<p style="margin: 8px 0;"><strong>Venue:</strong> ${data.venueName}, ${data.venueCity}</p>
				</div>
				<p style="margin: 16px 0;">Warehouse team will begin preparing items for delivery.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		READY_FOR_DELIVERY: {
			subject: `Ready for Delivery: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #8b5cf6;">All Items Scanned & Ready for Delivery</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">All items have been scanned out and loaded. Order is ready to be dispatched.</p>
				<div style="background: #f5f3ff; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Venue:</strong> ${data.venueName}</p>
					${data.deliveryWindow ? `<p style="margin: 8px 0;"><strong>Delivery Window:</strong> ${data.deliveryWindow}</p>` : ''}
				</div>
				<p style="margin: 16px 0;">Coordinate with delivery team for dispatch.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #8b5cf6; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		IN_TRANSIT: {
			subject: `Order In Transit: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #0ea5e9;">🚚 Your Order is On The Way</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">Your items are currently in transit to the venue.</p>
				<div style="background: #f0f9ff; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Venue:</strong> ${data.venueName}, ${data.venueCity}</p>
					${data.deliveryWindow ? `<p style="margin: 8px 0;"><strong>Estimated Delivery:</strong> ${data.deliveryWindow}</p>` : ''}
				</div>
				<p style="margin: 16px 0;">Please ensure someone is available to receive the delivery during the scheduled window.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #0ea5e9; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Track Order</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		ORDER_CLOSED: {
			subject: `Order Completed: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #059669;">✓ Order Complete</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">All items have been returned and the order has been completed successfully.</p>
				<div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					<p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
					<p style="margin: 8px 0;"><strong>Event:</strong> ${data.eventStartDate} - ${data.eventEndDate}</p>
				</div>
				<p style="margin: 16px 0;">Thank you for your business! All assets have been returned and are now available for future orders.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #059669; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order Summary</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
		TIME_WINDOWS_UPDATED: {
			subject: `Delivery Schedule Updated: ${data.orderIdReadable}`,
			html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
	<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
		<table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
			<tr><td style="padding: 40px;">
				<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #2563eb;">Delivery Schedule Updated</h1>
				<p style="margin: 0 0 16px; font-size: 16px; color: #374151;">The delivery and pickup windows for your order have been updated.</p>
				<div style="background: #eff6ff; border-radius: 8px; padding: 24px; margin: 24px 0;">
					<p style="margin: 8px 0;"><strong>Order ID:</strong> ${data.orderIdReadable}</p>
					${data.deliveryWindow ? `<p style="margin: 8px 0;"><strong>Delivery Window:</strong> ${data.deliveryWindow}</p>` : ''}
					${data.pickupWindow ? `<p style="margin: 8px 0;"><strong>Pickup Window:</strong> ${data.pickupWindow}</p>` : ''}
				</div>
				<p style="margin: 16px 0;">Please ensure availability during the scheduled time windows.</p>
				<a href="${data.orderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Updated Schedule</a>
			</td></tr>
		</table>
	</td></tr></table>
</body></html>
			`,
		},
	}

	return templates[notificationType]
}

// ============================================================
// Helper Functions
// ============================================================

async function buildNotificationData(order: any): Promise<NotificationData> {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

	return {
		orderId: order.id,
		orderIdReadable: order.orderId,
		companyName: order.company?.name || 'Unknown Company',
		contactName: order.contactName || 'Valued Customer',
		eventStartDate: order.eventStartDate
			? formatDateForEmail(new Date(order.eventStartDate))
			: '',
		eventEndDate: order.eventEndDate
			? formatDateForEmail(new Date(order.eventEndDate))
			: '',
		venueName: order.venueName || '',
		venueCity: order.venueCity || '',
		finalTotalPrice: order.finalTotalPrice
			? Number(order.finalTotalPrice).toFixed(2)
			: '',
		invoiceNumber: order.invoiceNumber || '',
		deliveryWindow: formatTimeWindow(
			order.deliveryWindowStart,
			order.deliveryWindowEnd
		),
		pickupWindow: formatTimeWindow(
			order.pickupWindowStart,
			order.pickupWindowEnd
		),
		orderUrl: `${baseUrl}/orders/${order.orderId}`,
		supportEmail:
			process.env.SUPPORT_EMAIL || 'support@assetfulfillment.com',
		supportPhone: process.env.SUPPORT_PHONE || '+971 XX XXX XXXX',
		// Additional fields for enhanced templates
		adjustmentReason: order.a2AdjustmentReason || undefined,
		a2AdjustedPrice: order.a2AdjustedPrice
			? Number(order.a2AdjustedPrice).toFixed(2)
			: undefined,
		declineReason: order.declineReason || undefined,
	}
}

function formatTimeWindow(start: Date | null, end: Date | null): string {
	if (!start || !end) return ''
	return `${formatDateForEmail(start)} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`
}

async function sendEmailWithLogging(
	to: string,
	subject: string,
	html: string
): Promise<string> {
	// In development, log email instead of sending
	if (process.env.NODE_ENV === 'development') {
		console.log('='.repeat(80))
		console.log('EMAIL (Development Mode - Not Sent)')
		console.log('='.repeat(80))
		console.log('To:', to)
		console.log('Subject:', subject)
		console.log('='.repeat(80))
		return 'dev-message-id-' + Date.now()
	}

	// Check if Resend API key is configured
	if (!process.env.RESEND_API_KEY) {
		console.warn(
			`⚠️  RESEND_API_KEY not configured - email to ${to} not sent`
		)
		return 'no-api-key-' + Date.now()
	}

	// In production, send via Resend
	try {
		const result = await resend.emails.send({
			from:
				process.env.RESEND_FROM_EMAIL ||
				'Asset Fulfillment <noreply@assetfulfillment.com>',
			to,
			subject,
			html,
		})

		if (result.error) {
			console.error(`❌ Resend API error for ${to}:`, result.error)
			throw new Error(result.error.message || 'Resend API error')
		}

		return result.data?.id || 'unknown-message-id'
	} catch (error: any) {
		console.error(`❌ Failed to send email to ${to}:`, error.message)
		throw error
	}
}
