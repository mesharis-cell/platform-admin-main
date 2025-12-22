/**
 * POST /api/invoices/:orderId/confirm-payment
 *
 * PMG manually confirms external payment received.
 * Updates financial status to PAID (Feedback #1: Separate financial tracking).
 */

import { NextRequest } from 'next/server'
import {
	requireAuth,
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware'
import { confirmPayment } from '@/lib/services/invoice-service'
import { sendPaymentConfirmedNotification } from '@/lib/services/email-service'
import { db } from '@/db'
import { orders, companies } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ConfirmPaymentRequest, ConfirmPaymentResponse } from '@/types/order'

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	// Require PMG Admin permission
	const authResult = await requirePermission('invoices:confirm_payment')
	if (authResult instanceof Response) return authResult
	const { user } = authResult

	// Get order ID from params
	const { orderId } = await params

	// Parse request body
	let body: ConfirmPaymentRequest
	try {
		body = await request.json()
	} catch (error) {
		return errorResponse('Invalid JSON body', 400)
	}

	const { paymentMethod, paymentReference, paymentDate, notes } = body

	// Validate required fields
	if (!paymentMethod || !paymentReference || !paymentDate) {
		return errorResponse(
			'Payment method, payment reference, and payment date are required',
			400
		)
	}

	// Validate payment date format
	const parsedDate = new Date(paymentDate)
	if (isNaN(parsedDate.getTime())) {
		return errorResponse('Invalid payment date format', 400)
	}

	try {
		// Confirm payment
		const result = await confirmPayment(
			orderId,
			{
				paymentMethod,
				paymentReference,
				paymentDate,
				notes,
			},
			user.id
		)

		// Fetch order and company details for notification
		const orderResult = await db
			.select({
				orderId: orders.orderId,
				company: orders.company,
				companyName: companies.name,
				finalTotalPrice: orders.finalTotalPrice,
			})
			.from(orders)
			.leftJoin(companies, eq(orders.company, companies.id))
			.where(eq(orders.id, orderId))
			.limit(1)

		if (orderResult.length > 0) {
			const order = orderResult[0]

			// Send notification to PMG and A2 (async, don't block response)
			const baseUrl =
				process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
			sendPaymentConfirmedNotification({
				orderId: order.orderId,
				invoiceNumber: result.invoiceNumber,
				companyName: order.companyName || 'Unknown Company',
				finalTotalPrice: order.finalTotalPrice || '0',
				paymentMethod: result.paymentMethod,
				viewOrderUrl: `${baseUrl}/admin/orders/${order.orderId}`,
			}).catch(error => {
				console.error(
					'Failed to send payment confirmation notification:',
					error
				)
			})
		}

		const response: ConfirmPaymentResponse = {
			success: true,
			invoice: {
				invoiceNumber: result.invoiceNumber,
				invoicePaidAt: result.invoicePaidAt,
				paymentMethod: result.paymentMethod,
				paymentReference: result.paymentReference,
			},
		}

		return successResponse(response, 200)
	} catch (error: any) {
		console.error('Error confirming payment:', error)
		return errorResponse(error.message || 'Failed to confirm payment', 500)
	}
}
