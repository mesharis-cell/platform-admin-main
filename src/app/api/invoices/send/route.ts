/**
 * POST /api/invoices/send
 *
 * Send invoice email to client with PDF attachment, CC PMG.
 * Used for manual resend if email delivery fails.
 */

import { NextRequest } from 'next/server';
import {
	requireAuth,
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware';
import { sendInvoiceToClient } from '@/lib/services/email-service';
import { db } from '@/db';
import { orders, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SendInvoiceEmailRequest, SendInvoiceEmailResponse } from '@/types/order';

export async function POST(request: NextRequest) {
	// Require PMG Admin permission for manual resend
	const authResult = await requirePermission('invoices:send');
	if (authResult instanceof Response) return authResult;

	// Parse request body
	let body: SendInvoiceEmailRequest;
	try {
		body = await request.json();
	} catch (error) {
		return errorResponse('Invalid JSON body', 400);
	}

	const { orderId, recipientOverride } = body;

	// Validate required fields
	if (!orderId) {
		return errorResponse('Order ID is required', 400);
	}

	try {
		// Fetch order with invoice details
		const orderResult = await db
			.select({
				orderId: orders.orderId,
				company: orders.company,
				companyName: companies.name,
				contactEmail: orders.contactEmail,
				invoiceNumber: orders.invoiceNumber,
				invoicePdfUrl: orders.invoicePdfUrl,
				finalTotalPrice: orders.finalTotalPrice,
			})
			.from(orders)
			.leftJoin(companies, eq(orders.company, companies.id))
			.where(eq(orders.id, orderId))
			.limit(1);

		if (orderResult.length === 0) {
			return errorResponse('Order not found', 404);
		}

		const order = orderResult[0];

		// Verify invoice exists
		if (!order.invoiceNumber || !order.invoicePdfUrl) {
			return errorResponse('Invoice not generated for this order', 400);
		}

		// Determine recipient
		const recipientEmail = recipientOverride || order.contactEmail;
		if (!recipientEmail) {
			return errorResponse('No recipient email available', 400);
		}

		// Send invoice email
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
		await sendInvoiceToClient(recipientEmail, {
			orderId: order.orderId,
			invoiceNumber: order.invoiceNumber,
			companyName: order.companyName || 'Unknown Company',
			finalTotalPrice: order.finalTotalPrice || '0',
			downloadInvoiceUrl: `${baseUrl}/orders/${order.orderId}`,
		});

		const response: SendInvoiceEmailResponse = {
			success: true,
			emailSent: true,
			sentTo: [recipientEmail],
			sentAt: new Date().toISOString(),
		};

		return successResponse(response, 200);
	} catch (error: any) {
		console.error('Error sending invoice email:', error);
		return errorResponse(error.message || 'Failed to send invoice email', 500);
	}
}
