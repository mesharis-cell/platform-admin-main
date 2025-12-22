/**
 * GET /api/invoices/download/:invoiceNumber
 *
 * Download invoice PDF by invoice number.
 * Enforces company scoping for client users.
 */

import { NextRequest } from 'next/server';
import {
	requireAuth,
	errorResponse,
} from '@/lib/api/auth-middleware';
import { getInvoiceByInvoiceNumber } from '@/lib/services/invoice-service';
import { hasPermission, hasCompanyAccess } from '@/lib/auth/permissions';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ invoiceNumber: string }> }
) {
	// Authenticate user
	const authResult = await requireAuth();
	if (authResult instanceof Response) return authResult;
	const { user } = authResult;

	// Get invoice number from params
	const { invoiceNumber } = await params;

	try {
		// Fetch invoice metadata
		const invoice = await getInvoiceByInvoiceNumber(invoiceNumber);

		// Fetch order to check company access
		const orderResult = await db
			.select({
				company: orders.company,
			})
			.from(orders)
			.where(eq(orders.id, invoice.orderId))
			.limit(1);

		if (orderResult.length === 0) {
			return errorResponse('Order not found', 404);
		}

		const order = orderResult[0];

		// Verify user has access to this company
		if (!hasPermission(user, 'invoices:read')) {
			return errorResponse('Permission denied', 403);
		}

		// Check company access for client users
		if (!hasCompanyAccess(user, order.company)) {
			return errorResponse(
				'Access denied: You do not have access to this invoice',
				403
			);
		}

		// Extract S3 key from PDF URL
		const pdfUrl = invoice.invoicePdfUrl;
		const urlParts = pdfUrl.split('/');
		const bucketName = process.env.AWS_S3_BUCKET!;

		// Get S3 key (everything after bucket name in URL)
		const s3Key = pdfUrl.includes('amazonaws.com')
			? pdfUrl.split('.com/')[1]
			: urlParts.slice(3).join('/');

		// Fetch PDF from S3
		const command = new GetObjectCommand({
			Bucket: bucketName,
			Key: s3Key,
		});

		const s3Response = await s3Client.send(command);

		if (!s3Response.Body) {
			return errorResponse('PDF file not found in storage', 404);
		}

		// Stream PDF to client
		const pdfBuffer = await s3Response.Body.transformToByteArray();

		return new Response(pdfBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
				'Cache-Control': 'private, max-age=3600',
			},
		});
	} catch (error: any) {
		console.error('Error downloading invoice:', error);
		return errorResponse(error.message || 'Failed to Cost Estimate', 500);
	}
}
