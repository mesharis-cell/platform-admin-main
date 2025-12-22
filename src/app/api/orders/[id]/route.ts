/**
 * Phase 7: Admin Order Detail API Route
 * GET /api/orders/:id - Get complete order details with status history
 */

import { NextRequest } from 'next/server';
import { requireAuth, requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { hasPermission } from '@/lib/auth/permissions';
import { getOrderDetailsForAdmin } from '@/lib/services/order-service';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const params = await context.params;
		// Require authentication and orders:read permission
		const authResult = await requirePermission('orders:read');
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		// Check if user can see job numbers (PMG Admin only)
		const includeJobNumbers = hasPermission(user, 'orders:add_job_number');

		// Fetch order details
		const order = await getOrderDetailsForAdmin(params.id, user, includeJobNumbers);

		if (!order) {
			return errorResponse('Order not found or access denied', 404);
		}

		return successResponse(order, 200);
	} catch (error) {
		console.error('Error fetching order details:', error);
		const message = error instanceof Error ? error.message : 'Failed to fetch order details';
		return errorResponse(message, 500);
	}
}
