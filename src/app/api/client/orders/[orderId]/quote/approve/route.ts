import { NextRequest } from 'next/server'
import {
	requireAuth,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { hasCompanyAccess } from '@/lib/auth/permissions'
import { clientApproveQuote } from '@/lib/services/pricing-service'
import { sendNotification } from '@/lib/services/notification-service'
import { generateInvoice } from '@/lib/services/invoice-service'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/client/orders/:orderId/quote/approve
 * Client approves the quote and proceeds with order
 * Phase 8: Pricing & Quoting System
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	const authResult = await requireAuth()
	if (authResult instanceof Response) return authResult
	const { user } = authResult

	try {
		const { orderId } = await params
		const body = await request.json()
		const { notes } = body

		// Verify order exists and user has access (using readable orderId, not UUID)
		const order = await db.query.orders.findFirst({
			where: eq(orders.orderId, orderId),
		})

		if (!order) {
			return errorResponse('Order not found', 404)
		}

		if (!hasCompanyAccess(user, order.company)) {
			return errorResponse('You do not have access to this order', 403)
		}

		// Approve quote (use UUID id for service function)
		await clientApproveQuote(order.id, user.id, notes)

		// Send approval notification using new notification service
		const approvalNotification = await sendNotification(
			'QUOTE_APPROVED',
			order.id
		)
		if (!approvalNotification.success) {
			console.error(
				'Failed to send quote approval notification:',
				approvalNotification.error
			)
			// Don't block - notification failure is non-critical
		}

		// Phase 9: Automatically generate and send invoice after quote approval
		try {
			const invoice = await generateInvoice(order.id, false, user.id)
			console.log(`✅ Invoice generated: ${invoice.invoiceNumber}`)

			// Send invoice notification using new notification service
			const invoiceNotification = await sendNotification(
				'INVOICE_GENERATED',
				order.id
			)
			if (!invoiceNotification.success) {
				console.error(
					'❌ Failed to send invoice notification:',
					invoiceNotification.error
				)
				console.error(
					'   Invoice was generated but email failed. Client can download from order page.'
				)
				// Don't block - invoice is generated, notification can be resent
			} else {
				console.log(
					`✅ Invoice email sent successfully (Message ID: ${invoiceNotification.messageId})`
				)
			}
		} catch (invoiceError) {
			console.error(
				'❌ Failed to generate invoice after quote approval:',
				invoiceError
			)
			// Don't block response - invoice generation can be retried
		}

		// Fetch updated order for response
		const updatedOrder = await db.query.orders.findFirst({
			where: eq(orders.id, order.id),
		})

		return successResponse({
			success: true,
			order: {
				id: updatedOrder!.id,
				status: updatedOrder!.status,
				updatedAt: updatedOrder!.updatedAt,
			},
		})
	} catch (error) {
		console.error('Error approving quote:', error)
		if (error instanceof Error) {
			return errorResponse(error.message, 400)
		}
		return errorResponse('Failed to approve quote', 500)
	}
}
