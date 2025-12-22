/**
 * Phase 6: Email Service
 *
 * Utility for sending emails via Resend.
 *
 * Uses simple HTML string templates to avoid Next.js build issues with @react-email/components
 */

import 'server-only'

import { Resend } from 'resend'
import { db } from '@/db'
import { user } from '@/db/schema/schema'
import { eq, or, sql } from 'drizzle-orm'
import {
	renderOrderSubmittedEmail,
	type OrderSubmittedEmailData,
} from './email-templates'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// ============================================================
// Email Sending Functions
// ============================================================

export type { OrderSubmittedEmailData }

/**
 * Send order submission notification to all stakeholders
 */
export async function sendOrderSubmittedNotifications(
	data: OrderSubmittedEmailData
): Promise<void> {
	try {
		// Find PMG Admins (permissionTemplate = 'PMG_ADMIN' OR 'orders:receive_notifications' in permissions)
		const pmgAdmins = await db
			.select({ email: user.email, name: user.name })
			.from(user)
			.where(
				sql`(
					${user.permissionTemplate} = 'PMG_ADMIN'
					OR 'orders:receive_notifications' = ANY(${user.permissions})
				) AND ${user.email} NOT LIKE '%@system.internal'`
			)

		// Find A2 Staff (permissionTemplate = 'A2_STAFF' OR 'orders:receive_notifications' in permissions)
		const a2Staff = await db
			.select({ email: user.email, name: user.name })
			.from(user)
			.where(
				sql`(
					${user.permissionTemplate} = 'A2_STAFF'
					OR 'orders:receive_notifications' = ANY(${user.permissions})
				) AND ${user.email} NOT LIKE '%@system.internal'`
			)

		// Send emails to PMG Admins
		const pmgAdminPromises = pmgAdmins.map(async admin => {
			const html = renderOrderSubmittedEmail('PMG_ADMIN', data)
			return sendEmail({
				to: admin.email,
				subject: `New Order Submitted: ${data.orderId}`,
				html,
			})
		})

		// Send emails to A2 Staff
		const a2StaffPromises = a2Staff.map(async staff => {
			const html = renderOrderSubmittedEmail('A2_STAFF', data)
			return sendEmail({
				to: staff.email,
				subject: `New Order Submitted: ${data.orderId}`,
				html,
			})
		})

		// Send all emails concurrently
		await Promise.all([...pmgAdminPromises, ...a2StaffPromises])

		console.log(
			`Order submission notifications sent for order ${data.orderId}`
		)
	} catch (error) {
		// Log error but don't throw - email failures shouldn't block order submission
		console.error('Error sending order submission notifications:', error)
	}
}

/**
 * Send order submission confirmation to client
 */
export async function sendOrderSubmittedConfirmationToClient(
	clientEmail: string,
	clientName: string,
	data: OrderSubmittedEmailData
): Promise<void> {
	try {
		const html = renderOrderSubmittedEmail('CLIENT_USER', data)

		await sendEmail({
			to: clientEmail,
			subject: `Order Confirmation: ${data.orderId}`,
			html,
		})

		console.log(`Order confirmation sent to client: ${clientEmail}`)
	} catch (error) {
		// Log error but don't throw - email failures shouldn't block order submission
		console.error('Error sending order confirmation to client:', error)
	}
}

/**
 * Send email via Resend
 */
async function sendEmail(params: {
	to: string
	subject: string
	html: string
}): Promise<void> {
	// Send via Resend (development mode check removed - emails will be sent in all environments)
	try {
		console.log('='.repeat(80))
		console.log('SENDING EMAIL via Resend')
		console.log('='.repeat(80))
		console.log('To:', params.to)
		console.log('Subject:', params.subject)
		console.log('HTML Body Length:', params.html.length, 'characters')
		console.log('='.repeat(80))

		await resend.emails.send({
			from:
				process.env.RESEND_FROM_EMAIL ||
				'Asset Fulfillment <noreply@assetfulfillment.com>',
			to: params.to,
			subject: params.subject,
			html: params.html,
		})

		console.log('✓ Email sent successfully to:', params.to)
	} catch (error) {
		console.error('✗ Resend API error:', error)
		throw error
	}
}

/**
 * Format date for email display
 */
export function formatDateForEmail(date: Date): string {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

// ============================================================
// Phase 8: Quote Notification Functions
// ============================================================

export interface QuoteReadyEmailData {
	orderId: string
	companyName: string
	finalTotalPrice: string
	viewQuoteUrl: string
}

export interface A2StandardApprovalEmailData {
	orderId: string
	companyName: string
	a2BasePrice: string
	pmgMarginPercent: string
	finalTotalPrice: string
	viewOrderUrl: string
}

export interface A2AdjustmentEmailData {
	orderId: string
	companyName: string
	a2AdjustedPrice: string
	adjustmentReason: string
	viewOrderUrl: string
}

export interface QuoteDecisionEmailData {
	orderId: string
	companyName: string
	decision: 'approved' | 'declined'
	finalTotalPrice?: string
	declineReason?: string
	viewOrderUrl: string
}

/**
 * Send quote ready notification to client (CC: PMG)
 */
export async function sendQuoteReadyToClient(
	clientEmail: string,
	data: QuoteReadyEmailData
): Promise<void> {
	try {
		// Find PMG Admins for CC
		const pmgAdmins = await db
			.select({ email: user.email })
			.from(user)
			.where(
				sql`${user.permissionTemplate} = 'PMG_ADMIN' AND ${user.email} NOT LIKE '%@system.internal'`
			)

		const pmgEmails = pmgAdmins.map(admin => admin.email)

		// Send email to client with PMG CC'd
		// Note: Resend doesn't support CC in the same way, so we'll send separately
		await sendEmail({
			to: clientEmail,
			subject: `Quote Ready for Order ${data.orderId}`,
			html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Quote Ready: ${data.orderId}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Your Quote is Ready</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">Your quote for order <strong>${data.orderId}</strong> has been prepared.</p>
							<div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Order ID:</strong> ${data.orderId}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Company:</strong> ${data.companyName}</p>
								<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Total Price: ${data.finalTotalPrice} AED</p>
							</div>
							<p style="margin: 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">Please review the quote and approve or decline it in your dashboard.</p>
							<a href="${data.viewQuoteUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Quote</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
			`,
		})

		// Send FYI to PMG Admins
		for (const pmgEmail of pmgEmails) {
			await sendEmail({
				to: pmgEmail,
				subject: `Quote Sent: ${data.orderId}`,
				html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Quote Sent to Client</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">A quote has been sent to the client for order <strong>${data.orderId}</strong>.</p>
							<div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Order ID:</strong> ${data.orderId}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Company:</strong> ${data.companyName}</p>
								<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Total Price: ${data.finalTotalPrice} AED</p>
							</div>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
				`,
			})
		}

		console.log(`Quote ready email sent for order ${data.orderId}`)
	} catch (error) {
		console.error('Error sending quote ready email:', error)
	}
}

/**
 * Send FYI notification to PMG when A2 approves standard pricing
 */
export async function sendA2StandardApprovalNotification(
	data: A2StandardApprovalEmailData
): Promise<void> {
	try {
		const pmgAdmins = await db
			.select({ email: user.email })
			.from(user)
			.where(
				sql`${user.permissionTemplate} = 'PMG_ADMIN' AND ${user.email} NOT LIKE '%@system.internal'`
			)

		for (const admin of pmgAdmins) {
			await sendEmail({
				to: admin.email,
				subject: `FYI: Order ${data.orderId} - Standard Pricing Approved by A2`,
				html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Standard Pricing Approved</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">A2 Logistics has approved standard pricing for order <strong>${data.orderId}</strong>. The quote has been sent directly to the client.</p>
							<div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Order ID:</strong> ${data.orderId}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Company:</strong> ${data.companyName}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>A2 Base Price:</strong> ${data.a2BasePrice} AED</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>PMG Margin:</strong> ${data.pmgMarginPercent}%</p>
								<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Total Price: ${data.finalTotalPrice} AED</p>
							</div>
							<a href="${data.viewOrderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
				`,
			})
		}

		console.log(
			`A2 standard approval notification sent for order ${data.orderId}`
		)
	} catch (error) {
		console.error('Error sending A2 standard approval notification:', error)
	}
}

/**
 * Send action required notification to PMG when A2 adjusts pricing
 */
export async function sendA2AdjustmentNotification(
	data: A2AdjustmentEmailData
): Promise<void> {
	try {
		const pmgAdmins = await db
			.select({ email: user.email })
			.from(user)
			.where(
				sql`${user.permissionTemplate} = 'PMG_ADMIN' AND ${user.email} NOT LIKE '%@system.internal'`
			)

		for (const admin of pmgAdmins) {
			await sendEmail({
				to: admin.email,
				subject: `Action Required: Order ${data.orderId} - A2 Pricing Adjustment`,
				html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
								<p style="margin: 0; font-size: 14px; font-weight: 600; color: #92400e;">ACTION REQUIRED</p>
							</div>
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">A2 Pricing Adjustment Requires Review</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">A2 Logistics has adjusted the pricing for order <strong>${data.orderId}</strong> and requires your approval before the quote can be sent to the client.</p>
							<div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Order ID:</strong> ${data.orderId}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Company:</strong> ${data.companyName}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Adjusted Price:</strong> ${data.a2AdjustedPrice} AED</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Reason:</strong> ${data.adjustmentReason}</p>
							</div>
							<a href="${data.viewOrderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Review and Approve</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
				`,
			})
		}

		console.log(`A2 adjustment notification sent for order ${data.orderId}`)
	} catch (error) {
		console.error('Error sending A2 adjustment notification:', error)
	}
}

/**
 * Send quote decision notification (approve/decline) to PMG and A2
 */
export async function sendQuoteDecisionNotification(
	data: QuoteDecisionEmailData
): Promise<void> {
	try {
		const pmgAdmins = await db
			.select({ email: user.email })
			.from(user)
			.where(
				sql`${user.permissionTemplate} = 'PMG_ADMIN' AND ${user.email} NOT LIKE '%@system.internal'`
			)

		const a2Staff = await db
			.select({ email: user.email })
			.from(user)
			.where(
				sql`${user.permissionTemplate} = 'A2_STAFF' AND ${user.email} NOT LIKE '%@system.internal'`
			)

		const recipients = [...pmgAdmins, ...a2Staff]

		const subject =
			data.decision === 'approved'
				? `Order ${data.orderId} - Client Approved Quote`
				: `Order ${data.orderId} - Client Declined Quote`

		const statusColor = data.decision === 'approved' ? '#10b981' : '#ef4444'
		const statusText =
			data.decision === 'approved' ? 'Approved' : 'Declined'
		const nextSteps =
			data.decision === 'approved'
				? 'Please proceed with invoicing and fulfillment.'
				: 'The order has been declined and no further action is required.'

		for (const recipient of recipients) {
			await sendEmail({
				to: recipient.email,
				subject,
				html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<div style="background-color: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
								<p style="margin: 0; font-size: 14px; font-weight: 600; color: ${statusColor};">Quote ${statusText.toUpperCase()}</p>
							</div>
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Client ${statusText} Quote</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">The client has ${data.decision === 'approved' ? 'approved' : 'declined'} the quote for order <strong>${data.orderId}</strong>.</p>
							<div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Order ID:</strong> ${data.orderId}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Company:</strong> ${data.companyName}</p>
								${data.finalTotalPrice ? `<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Total Price:</strong> ${data.finalTotalPrice} AED</p>` : ''}
								${data.declineReason ? `<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Decline Reason:</strong> ${data.declineReason}</p>` : ''}
							</div>
							<p style="margin: 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">${nextSteps}</p>
							<a href="${data.viewOrderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
				`,
			})
		}

		console.log(
			`Quote decision notification sent for order ${data.orderId}`
		)
	} catch (error) {
		console.error('Error sending quote decision notification:', error)
	}
}

// ============================================================
// Phase 9: Invoice Email Functions
// ============================================================

export interface InvoiceReadyEmailData {
	orderId: string
	invoiceNumber: string
	companyName: string
	finalTotalPrice: string
	downloadInvoiceUrl: string
}

export interface PaymentConfirmedEmailData {
	orderId: string
	invoiceNumber: string
	companyName: string
	finalTotalPrice: string
	paymentMethod: string
	viewOrderUrl: string
}

/**
 * Send invoice email to client with PDF (CC: PMG)
 */
export async function sendInvoiceToClient(
	clientEmail: string,
	data: InvoiceReadyEmailData,
	pdfBuffer?: Buffer
): Promise<void> {
	try {
		// Find PMG Admins for CC
		const pmgAdmins = await db
			.select({ email: user.email })
			.from(user)
			.where(
				sql`${user.permissionTemplate} = 'PMG_ADMIN' AND ${user.email} NOT LIKE '%@system.internal'`
			)

		const pmgEmails = pmgAdmins.map(admin => admin.email)

		// Send email to client
		await sendEmailWithAttachment({
			to: clientEmail,
			subject: `Invoice ${data.invoiceNumber} for Order ${data.orderId}`,
			html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Invoice: ${data.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Invoice Ready</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">Your invoice for order <strong>${data.orderId}</strong> is ready.</p>
							<div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Order ID:</strong> ${data.orderId}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Company:</strong> ${data.companyName}</p>
								<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Total Amount: ${data.finalTotalPrice} AED</p>
							</div>
							<p style="margin: 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">Please find your invoice attached to this email. You can also download it from your dashboard.</p>
							<div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin: 24px 0;">
								<p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1e40af;">Payment Instructions</p>
								<p style="margin: 4px 0; font-size: 13px; color: #374151;">Payment Method: Bank Transfer or Check</p>
								<p style="margin: 4px 0; font-size: 13px; color: #374151;">Payment Terms: Net 30 Days</p>
								<p style="margin: 4px 0; font-size: 13px; color: #374151;">Payment Reference: ${data.invoiceNumber}</p>
							</div>
							<a href="${data.downloadInvoiceUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Download Cost Estimate</a>
							<p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">Thank you for your business. For questions about this invoice, please contact your account manager.</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
			`,
			attachments: pdfBuffer
				? [
					{
						filename: `${data.invoiceNumber}.pdf`,
						content: pdfBuffer,
					},
				]
				: undefined,
		})

		// Send FYI to PMG Admins
		for (const pmgEmail of pmgEmails) {
			await sendEmail({
				to: pmgEmail,
				subject: `Invoice Sent: ${data.invoiceNumber} for Order ${data.orderId}`,
				html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Invoice Sent to Client</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">An invoice has been sent to the client for order <strong>${data.orderId}</strong>.</p>
							<div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Order ID:</strong> ${data.orderId}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Company:</strong> ${data.companyName}</p>
								<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Total Amount: ${data.finalTotalPrice} AED</p>
							</div>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
				`,
			})
		}

		console.log(`Invoice email sent for order ${data.orderId}`)
	} catch (error) {
		console.error('Error sending invoice email:', error)
		throw error
	}
}

/**
 * Send payment confirmed notification to PMG and A2
 */
export async function sendPaymentConfirmedNotification(
	data: PaymentConfirmedEmailData
): Promise<void> {
	try {
		const pmgAdmins = await db
			.select({ email: user.email })
			.from(user)
			.where(
				sql`${user.permissionTemplate} = 'PMG_ADMIN' AND ${user.email} NOT LIKE '%@system.internal'`
			)

		const a2Staff = await db
			.select({ email: user.email })
			.from(user)
			.where(
				sql`${user.permissionTemplate} = 'A2_STAFF' AND ${user.email} NOT LIKE '%@system.internal'`
			)

		const recipients = [...pmgAdmins, ...a2Staff]

		for (const recipient of recipients) {
			await sendEmail({
				to: recipient.email,
				subject: `Payment Confirmed: ${data.invoiceNumber}`,
				html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc;">
	<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f6f9fc;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
					<tr>
						<td style="padding: 40px;">
							<div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
								<p style="margin: 0; font-size: 14px; font-weight: 600; color: #065f46;">PAYMENT CONFIRMED</p>
							</div>
							<h1 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #1f2937;">Payment Received</h1>
							<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">Payment has been confirmed for invoice <strong>${data.invoiceNumber}</strong>. The order is now ready to proceed with fulfillment.</p>
							<div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Order ID:</strong> ${data.orderId}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Company:</strong> ${data.companyName}</p>
								<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
								<p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Amount Paid: ${data.finalTotalPrice} AED</p>
							</div>
							<p style="margin: 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">Please proceed with order fulfillment.</p>
							<a href="${data.viewOrderUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
				`,
			})
		}

		console.log(
			`Payment confirmed notification sent for invoice ${data.invoiceNumber}`
		)
	} catch (error) {
		console.error('Error sending payment confirmed notification:', error)
	}
}

/**
 * Send email with attachment via Resend
 */
async function sendEmailWithAttachment(params: {
	to: string
	subject: string
	html: string
	attachments?: Array<{
		filename: string
		content: Buffer
	}>
}): Promise<void> {
	// Send via Resend (development mode check removed - emails will be sent in all environments)
	try {
		console.log('='.repeat(80))
		console.log('SENDING EMAIL WITH ATTACHMENT via Resend')
		console.log('='.repeat(80))
		console.log('To:', params.to)
		console.log('Subject:', params.subject)
		console.log('HTML Body Length:', params.html.length, 'characters')
		if (params.attachments) {
			console.log('Attachments:', params.attachments.length)
			params.attachments.forEach(att => {
				console.log(`  - ${att.filename} (${att.content.length} bytes)`)
			})
		}
		console.log('='.repeat(80))

		await resend.emails.send({
			from:
				process.env.RESEND_FROM_EMAIL ||
				'Asset Fulfillment <noreply@assetfulfillment.com>',
			to: params.to,
			subject: params.subject,
			html: params.html,
			attachments: params.attachments,
		})

		console.log('✓ Email with attachment sent successfully to:', params.to)
	} catch (error) {
		console.error('✗ Resend API error:', error)
		throw error
	}
}
