/**
 * Phase 9: Invoice Service
 *
 * Business logic for invoice generation, PDF creation, and payment tracking.
 */

import 'server-only'
import { db } from '@/db'
import {
	orders,
	orderItems,
	companies,
	brands,
	assets,
	orderStatusHistory,
	user,
} from '@/db/schema'
import {
	eq,
	and,
	gte,
	lte,
	desc,
	asc,
	isNull,
	isNotNull,
	or,
	ilike,
} from 'drizzle-orm'
import {
	InvoiceMetadata,
	InvoiceListParams,
	InvoiceListResponse,
	InvoiceListItem,
} from '@/types/order'
import { deleteFileFromS3 } from '@/lib/storage'
import { sql } from 'drizzle-orm'

/**
 * Generate unique invoice number with format: INV-YYYYMMDD-###
 */
export async function generateInvoiceNumber(): Promise<string> {
	const today = new Date()
	const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD

	// Find highest invoice number for today
	const result = await db
		.select({ invoiceNumber: orders.invoiceNumber })
		.from(orders)
		.where(
			and(
				isNotNull(orders.invoiceNumber),
				sql`${orders.invoiceNumber} LIKE ${`INV-${dateStr}-%`}`
			)
		)
		.orderBy(desc(orders.invoiceNumber))
		.limit(1)

	if (result.length === 0) {
		return `INV-${dateStr}-001`
	}

	const lastNumber = result[0].invoiceNumber!
	const sequence = parseInt(lastNumber.split('-')[2]) + 1
	const paddedSequence = sequence.toString().padStart(3, '0')

	return `INV-${dateStr}-${paddedSequence}`
}

/**
 * Generate invoice PDF for order
 */
export async function generateInvoice(
	orderId: string,
	regenerate: boolean = false,
	updatedBy?: string
): Promise<{
	invoiceNumber: string
	invoicePdfUrl: string
	invoiceGeneratedAt: Date
}> {
	// Fetch order with all details
	const orderResult = await db
		.select({
			id: orders.id,
			orderId: orders.orderId,
			company: orders.company,
			companyName: companies.name,
			companyContactEmail: companies.contactEmail,
			contactName: orders.contactName,
			contactEmail: orders.contactEmail,
			contactPhone: orders.contactPhone,
			eventStartDate: orders.eventStartDate,
			eventEndDate: orders.eventEndDate,
			venueName: orders.venueName,
			venueCountry: orders.venueCountry,
			venueCity: orders.venueCity,
			venueAddress: orders.venueAddress,
			calculatedVolume: orders.calculatedVolume,
			calculatedWeight: orders.calculatedWeight,
			a2BasePrice: orders.a2BasePrice,
			a2AdjustedPrice: orders.a2AdjustedPrice,
			pmgMarginPercent: orders.pmgMarginPercent,
			pmgMarginAmount: orders.pmgMarginAmount,
			finalTotalPrice: orders.finalTotalPrice,
			invoiceNumber: orders.invoiceNumber,
			invoicePdfUrl: orders.invoicePdfUrl,
			invoiceGeneratedAt: orders.invoiceGeneratedAt,
			invoicePaidAt: orders.invoicePaidAt,
			status: orders.status,
		})
		.from(orders)
		.leftJoin(companies, eq(orders.company, companies.id))
		.where(eq(orders.id, orderId))
		.limit(1)

	if (orderResult.length === 0) {
		throw new Error('Order not found')
	}

	const order = orderResult[0]

	// Verify order is in CONFIRMED status (Feedback #1: Updated from APPROVED)
	// if (order.status !== 'CONFIRMED') {
	// 	throw new Error(
	// 		`Cannot generate invoice for order in ${order.status} status. Order must be in CONFIRMED status.`
	// 	)
	// }

	// Check if invoice already exists
	if (order.invoiceNumber && !regenerate) {
		throw new Error(
			'Invoice already exists for this order. Use regenerate flag to create new invoice.'
		)
	}

	// Prevent regeneration after payment confirmed
	if (regenerate && order.invoicePaidAt) {
		throw new Error(
			'Cannot regenerate invoice after payment has been confirmed'
		)
	}

	// Fetch order items
	const items = await db
		.select({
			id: orderItems.id,
			assetName: orderItems.assetName,
			quantity: orderItems.quantity,
			volume: orderItems.volume,
			weight: orderItems.weight,
			totalVolume: orderItems.totalVolume,
			totalWeight: orderItems.totalWeight,
			condition: orderItems.condition,
			handlingTags: orderItems.handlingTags,
			fromCollectionName: orderItems.fromCollectionName,
		})
		.from(orderItems)
		.where(eq(orderItems.order, orderId))

	// Generate or reuse invoice number
	let invoiceNumber: string
	if (regenerate && order.invoiceNumber) {
		// Archive old PDF if exists
		if (order.invoicePdfUrl) {
			try {
				await deleteFileFromS3(order.invoicePdfUrl)
			} catch (error) {
				console.error('Failed to delete old invoice PDF:', error)
				// Continue anyway, non-blocking
			}
		}
		invoiceNumber = order.invoiceNumber
	} else {
		invoiceNumber = await generateInvoiceNumber()
	}

	// Generate PDF (dynamic import to avoid client bundle)
	const { renderInvoicePDF } = await import('./invoice-pdf')
	const pdfBuffer = await renderInvoicePDF({
		invoiceNumber,
		invoiceDate: new Date(),
		order: {
			orderId: order.orderId,
			contactName: order.contactName || 'N/A',
			contactEmail: order.contactEmail || 'N/A',
			contactPhone: order.contactPhone || 'N/A',
			companyName: order.companyName || 'Unknown Company',
			eventStartDate: order.eventStartDate,
			eventEndDate: order.eventEndDate,
			venueName: order.venueName || 'N/A',
			venueCountry: order.venueCountry || 'N/A',
			venueCity: order.venueCity || 'N/A',
			venueAddress: order.venueAddress || 'N/A',
		},
		items: items.map(item => ({
			assetName: item.assetName,
			quantity: item.quantity,
			handlingTags: item.handlingTags as any, // Type assertion - db returns string[] but we need HandlingTag[]
			fromCollectionName: item.fromCollectionName || undefined,
		})),
		pricing: {
			a2BasePrice: order.a2AdjustedPrice || order.a2BasePrice || '0',
			pmgMarginPercent: order.pmgMarginPercent || '0',
			pmgMarginAmount: order.pmgMarginAmount || '0',
			finalTotalPrice: order.finalTotalPrice || '0',
			showBreakdown: false, // Default: show total only
		},
	})

	// Upload PDF to storage
	const fileName = `${invoiceNumber}.pdf`

	// Note: Using uploadFile helper since uploadFileToS3 is for images only
	// Create custom upload for PDF since validateFile only allows images
	const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
	const s3Client = new S3Client({
		region: process.env.AWS_REGION!,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
		},
	})

	const key = `invoices/${order.company}/${fileName}`
	const command = new PutObjectCommand({
		Bucket: process.env.AWS_S3_BUCKET!,
		Key: key,
		Body: pdfBuffer,
		ContentType: 'application/pdf',
	})

	await s3Client.send(command)

	const pdfUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

	// Update order with invoice metadata (Feedback #1: Don't change fulfillment status)
	const invoiceGeneratedAt = new Date()
	await db
		.update(orders)
		.set({
			invoiceNumber,
			invoiceGeneratedAt,
			invoicePdfUrl: pdfUrl,
			financialStatus: 'INVOICED', // Feedback #1: Update financial status only
			updatedAt: new Date(),
		})
		.where(eq(orders.id, orderId))

	// Note: No status history entry for financial status changes
	// Financial status is tracked separately from fulfillment status

	return {
		invoiceNumber,
		invoicePdfUrl: pdfUrl,
		invoiceGeneratedAt,
	}
}

/**
 * Get invoice metadata by order ID
 */
export async function getInvoiceByOrderId(
	orderId: string
): Promise<InvoiceMetadata> {
	const result = await db
		.select({
			invoiceNumber: orders.invoiceNumber,
			invoiceGeneratedAt: orders.invoiceGeneratedAt,
			invoicePdfUrl: orders.invoicePdfUrl,
			invoicePaidAt: orders.invoicePaidAt,
			paymentMethod: orders.paymentMethod,
			paymentReference: orders.paymentReference,
			orderId: orders.id,
			finalTotalPrice: orders.finalTotalPrice,
		})
		.from(orders)
		.where(eq(orders.id, orderId))
		.limit(1)

	if (result.length === 0) {
		throw new Error('Order not found')
	}

	const invoice = result[0]

	if (!invoice.invoiceNumber) {
		throw new Error('Invoice not generated for this order')
	}

	return {
		invoiceNumber: invoice.invoiceNumber,
		invoiceGeneratedAt: invoice.invoiceGeneratedAt!.toISOString(),
		invoicePdfUrl: invoice.invoicePdfUrl!,
		invoicePaidAt: invoice.invoicePaidAt?.toISOString() || null,
		paymentMethod: invoice.paymentMethod,
		paymentReference: invoice.paymentReference,
		isPaid: !!invoice.invoicePaidAt,
		orderId: invoice.orderId,
		finalTotalPrice: invoice.finalTotalPrice || '0',
	}
}

/**
 * Get invoice metadata by invoice number
 */
export async function getInvoiceByInvoiceNumber(
	invoiceNumber: string
): Promise<InvoiceMetadata> {
	const result = await db
		.select({
			invoiceNumber: orders.invoiceNumber,
			invoiceGeneratedAt: orders.invoiceGeneratedAt,
			invoicePdfUrl: orders.invoicePdfUrl,
			invoicePaidAt: orders.invoicePaidAt,
			paymentMethod: orders.paymentMethod,
			paymentReference: orders.paymentReference,
			orderId: orders.id,
			finalTotalPrice: orders.finalTotalPrice,
		})
		.from(orders)
		.where(eq(orders.invoiceNumber, invoiceNumber))
		.limit(1)

	if (result.length === 0) {
		throw new Error('Invoice not found')
	}

	const invoice = result[0]

	return {
		invoiceNumber: invoice.invoiceNumber!,
		invoiceGeneratedAt: invoice.invoiceGeneratedAt!.toISOString(),
		invoicePdfUrl: invoice.invoicePdfUrl!,
		invoicePaidAt: invoice.invoicePaidAt?.toISOString() || null,
		paymentMethod: invoice.paymentMethod,
		paymentReference: invoice.paymentReference,
		isPaid: !!invoice.invoicePaidAt,
		orderId: invoice.orderId,
		finalTotalPrice: invoice.finalTotalPrice || '0',
	}
}

/**
 * Confirm payment for invoice
 */
export async function confirmPayment(
	orderId: string,
	paymentData: {
		paymentMethod: string
		paymentReference: string
		paymentDate: string
		notes?: string
	},
	updatedBy: string
): Promise<{
	invoiceNumber: string
	invoicePaidAt: string
	paymentMethod: string
	paymentReference: string
}> {
	// Fetch order
	const orderResult = await db
		.select({
			id: orders.id,
			invoiceNumber: orders.invoiceNumber,
			invoicePaidAt: orders.invoicePaidAt,
			status: orders.status,
		})
		.from(orders)
		.where(eq(orders.id, orderId))
		.limit(1)

	if (orderResult.length === 0) {
		throw new Error('Order not found')
	}

	const order = orderResult[0]

	// Verify invoice exists
	if (!order.invoiceNumber) {
		throw new Error('Invoice not generated for this order')
	}

	// Verify not already paid
	if (order.invoicePaidAt) {
		throw new Error('Payment already confirmed for this invoice')
	}

	// Validate payment date
	const paymentDate = new Date(paymentData.paymentDate)
	const now = new Date()
	if (paymentDate > now) {
		throw new Error('Payment date cannot be in the future')
	}

	// Update order with payment details (Feedback #1: Update financial status only)
	await db
		.update(orders)
		.set({
			invoicePaidAt: paymentDate,
			paymentMethod: paymentData.paymentMethod,
			paymentReference: paymentData.paymentReference,
			financialStatus: 'PAID', // Feedback #1: Update financial status only
			updatedAt: new Date(),
		})
		.where(eq(orders.id, orderId))

	// Note: No status history entry for financial status changes
	// Financial status is tracked separately from fulfillment status

	return {
		invoiceNumber: order.invoiceNumber,
		invoicePaidAt: paymentDate.toISOString(),
		paymentMethod: paymentData.paymentMethod,
		paymentReference: paymentData.paymentReference,
	}
}

/**
 * List invoices with filtering and pagination
 */
export async function listInvoices(
	params: InvoiceListParams,
	userCompanies: string[] | null
): Promise<InvoiceListResponse> {
	const {
		company,
		isPaid,
		dateFrom,
		dateTo,
		page = 1,
		limit = 20,
		sortBy = 'invoiceGeneratedAt',
		sortOrder = 'desc',
	} = params

	// Build where conditions
	const conditions = [isNotNull(orders.invoiceNumber)]

	// Company scope filtering
	if (userCompanies !== null) {
		// User has specific company access
		if (company) {
			// Requested company filter - verify user has access
			if (!userCompanies.includes(company)) {
				throw new Error(
					'Access denied: You do not have access to this company'
				)
			}
			conditions.push(eq(orders.company, company))
		} else {
			// No company filter - show all user's companies
			if (userCompanies.length === 1) {
				conditions.push(eq(orders.company, userCompanies[0]))
			} else {
				conditions.push(
					or(
						...userCompanies.map(companyId =>
							eq(orders.company, companyId)
						)
					)!
				)
			}
		}
	} else {
		// User has wildcard access (PMG Admin)
		if (company) {
			conditions.push(eq(orders.company, company))
		}
	}

	// Payment status filter
	if (isPaid !== undefined) {
		if (isPaid) {
			conditions.push(isNotNull(orders.invoicePaidAt))
		} else {
			conditions.push(isNull(orders.invoicePaidAt))
		}
	}

	// Date range filters
	if (dateFrom) {
		conditions.push(gte(orders.invoiceGeneratedAt, new Date(dateFrom)))
	}
	if (dateTo) {
		conditions.push(lte(orders.invoiceGeneratedAt, new Date(dateTo)))
	}

	// Count total
	const countResult = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(orders)
		.leftJoin(companies, eq(orders.company, companies.id))
		.where(and(...conditions))

	const total = countResult[0]?.count || 0

	// Fetch invoices
	const sortColumn =
		sortBy === 'invoiceGeneratedAt'
			? orders.invoiceGeneratedAt
			: sortBy === 'invoicePaidAt'
				? orders.invoicePaidAt
				: orders.finalTotalPrice
	const sortDirection =
		sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

	const offset = (page - 1) * limit

	const invoices = await db
		.select({
			invoiceNumber: orders.invoiceNumber,
			orderId: orders.id,
			orderIdReadable: orders.orderId,
			companyId: orders.company,
			companyName: companies.name,
			contactName: orders.contactName,
			invoiceGeneratedAt: orders.invoiceGeneratedAt,
			invoicePaidAt: orders.invoicePaidAt,
			paymentMethod: orders.paymentMethod,
			finalTotalPrice: orders.finalTotalPrice,
		})
		.from(orders)
		.leftJoin(companies, eq(orders.company, companies.id))
		.where(and(...conditions))
		.orderBy(sortDirection)
		.limit(limit)
		.offset(offset)

	const invoiceList: InvoiceListItem[] = invoices.map(invoice => ({
		invoiceNumber: invoice.invoiceNumber!,
		orderId: invoice.orderId,
		orderIdReadable: invoice.orderIdReadable,
		company: {
			id: invoice.companyId,
			name: invoice.companyName || 'Unknown Company',
		},
		contactName: invoice.contactName || 'N/A',
		invoiceGeneratedAt: invoice.invoiceGeneratedAt!.toISOString(),
		invoicePaidAt: invoice.invoicePaidAt?.toISOString() || null,
		paymentMethod: invoice.paymentMethod,
		finalTotalPrice: invoice.finalTotalPrice || '0',
		isPaid: !!invoice.invoicePaidAt,
	}))

	return {
		invoices: invoiceList,
		pagination: {
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		},
	}
}
