/**
 * GET /api/invoices/:orderId
 *
 * Retrieve invoice metadata for specific order.
 * Enforces company scoping for client users.
 */

import { NextRequest } from 'next/server';
import {
	requireAuth,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware';
import { getInvoiceByOrderId } from '@/lib/services/invoice-service';
import { hasPermission, hasCompanyAccess } from '@/lib/auth/permissions';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	// Authenticate user
	const authResult = await requireAuth();
	if (authResult instanceof Response) return authResult;
	const { user } = authResult;

	// Get order ID from params
	const { orderId } = await params;

	// Verify user has invoices:read permission
	if (!hasPermission(user, 'invoices:read')) {
		return errorResponse('Permission denied', 403);
	}

	try {
		// Fetch invoice metadata
		const invoice = await getInvoiceByOrderId(orderId);

		// Fetch order to check company access
		const orderResult = await db
			.select({
				company: orders.company,
			})
			.from(orders)
			.where(eq(orders.id, orderId))
			.limit(1);

		if (orderResult.length === 0) {
			return errorResponse('Order not found', 404);
		}

		const order = orderResult[0];

		// Check company access for client users
		if (!hasCompanyAccess(user, order.company)) {
			return errorResponse(
				'Access denied: You do not have access to this invoice',
				403
			);
		}

		return successResponse({ invoice }, 200);
	} catch (error: any) {
		console.error('Error fetching invoice:', error);
		return errorResponse(error.message || 'Failed to fetch invoice', 500);
	}
}
