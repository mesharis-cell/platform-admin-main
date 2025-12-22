import { NextRequest } from 'next/server'
import { requirePermission, errorResponse } from '@/lib/api/auth-middleware'
import { db } from '@/db'
import { orders } from '@/db/schema/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getFileFromStorage } from '@/lib/storage'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	// Require authentication and invoices:download permission
	const authResult = await requirePermission('invoices:download')
	if (authResult instanceof Response) return authResult
	const { user } = authResult

	const { orderId } = await params

	try {
		// Get user's company (Client Users have single company in array)
		const userCompanyId = user.companies?.[0]
		if (!userCompanyId || userCompanyId === '*') {
			return errorResponse('Invalid company access', 403)
		}

		// Query order by invoice number (not order ID)
		// The orderId param is actually the invoice number (e.g., INV-20251209-001)
		const orderData = await db
			.select({
				id: orders.id,
				company: orders.company,
				invoiceNumber: orders.invoiceNumber,
				invoicePdfUrl: orders.invoicePdfUrl,
			})
			.from(orders)
			.where(
				and(
					eq(orders.invoiceNumber, orderId),
					eq(orders.company, userCompanyId),
					isNull(orders.deletedAt)
				)
			)
			.limit(1)

		if (!orderData.length) {
			return errorResponse('Order not found', 404)
		}

		const order = orderData[0]

		// Validate invoice exists
		if (!order.invoiceNumber || !order.invoicePdfUrl) {
			return errorResponse('Invoice not generated yet', 404)
		}

		// Fetch PDF from storage
		const pdfBuffer = await getFileFromStorage(order.invoicePdfUrl)

		if (!pdfBuffer) {
			return errorResponse('Invoice file not found in storage', 404)
		}

		// Return PDF with download headers
		// Convert Buffer to Uint8Array for Response
		return new Response(new Uint8Array(pdfBuffer), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${order.invoiceNumber}.pdf"`,
			},
		})
	} catch (error) {
		console.error('Error downloading invoice:', error)
		return errorResponse('Failed to Cost Estimate', 500)
	}
}
