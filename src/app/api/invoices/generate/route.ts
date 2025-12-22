/**
 * POST /api/invoices/generate
 *
 * Generate invoice PDF for order and update database with invoice metadata.
 * Triggered after quote approval or manual regeneration.
 */

import { NextRequest } from 'next/server';
import {
	requireAuth,
	requirePermission,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware';
import { generateInvoice } from '@/lib/services/invoice-service';
import { sendInvoiceToClient } from '@/lib/services/email-service';
import { db } from '@/db';
import { orders, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { GenerateInvoiceRequest, GenerateInvoiceResponse } from '@/types/order';

export async function POST(request: NextRequest) {
	// Authenticate user (system or PMG Admin)
	const authResult = await requireAuth();
	if (authResult instanceof Response) return authResult;

	// Parse request body
	let body: GenerateInvoiceRequest;
	try {
		body = await request.json();
	} catch (error) {
		return errorResponse('Invalid JSON body', 400);
	}

	const { orderId, regenerate = false } = body;

	// Validate required fields
	if (!orderId) {
		return errorResponse('Order ID is required', 400);
	}

	try {
		// Generate invoice
		const invoice = await generateInvoice(orderId, regenerate);

		// Fetch order and company details for email
		const orderResult = await db
			.select({
				orderId: orders.orderId,
				company: orders.company,
				companyName: companies.name,
				contactEmail: orders.contactEmail,
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

		// Send invoice email to client (async, don't block response)
		if (order.contactEmail) {
			const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
			sendInvoiceToClient(order.contactEmail, {
				orderId: order.orderId,
				invoiceNumber: invoice.invoiceNumber,
				companyName: order.companyName || 'Unknown Company',
				finalTotalPrice: order.finalTotalPrice || '0',
				downloadInvoiceUrl: `${baseUrl}/orders/${order.orderId}`,
			}).catch((error) => {
				console.error('Failed to send invoice email:', error);
			});
		}

		const response: GenerateInvoiceResponse = {
			success: true,
			invoice: {
				invoiceNumber: invoice.invoiceNumber,
				invoicePdfUrl: invoice.invoicePdfUrl,
				invoiceGeneratedAt: invoice.invoiceGeneratedAt.toISOString(),
				orderId,
			},
		};

		return successResponse(response, 200);
	} catch (error: any) {
		console.error('Error generating invoice:', error);
		return errorResponse(error.message || 'Failed to generate invoice', 500);
	}
}
