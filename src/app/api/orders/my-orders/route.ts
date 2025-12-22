/**
 * Phase 6: My Orders List API Route
 * GET /api/orders/my-orders - List user's submitted orders
 */

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { hasPermission } from '@/lib/auth/permissions';
import { listMyOrders } from '@/lib/services/order-service';
import type { OrderStatus } from '@/types/order';

export async function GET(request: NextRequest) {
	try {
		// Authenticate user
		const authResult = await requireAuth();
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		// Check permission
		if (!hasPermission(user, 'orders:read')) {
			return errorResponse('You do not have permission to view orders', 403);
		}

		// Get user's company
		const companyId = user.companies[0] === '*' ? null : user.companies[0];
		if (!companyId) {
			return errorResponse('Company ID is required', 400);
		}

		// Get query params
		const { searchParams } = new URL(request.url);
		const status = searchParams.get('status') as OrderStatus | null;
		const limit = parseInt(searchParams.get('limit') || '20', 10);
		const offset = parseInt(searchParams.get('offset') || '0', 10);
		const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'eventStartDate' | 'orderId';
		const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

		// List orders
		const result = await listMyOrders(user.id, companyId, {
			status: status || undefined,
			limit,
			offset,
			sortBy,
			sortOrder,
		});

		return successResponse(result, 200);
	} catch (error) {
		console.error('Error listing orders:', error);
		const message = error instanceof Error ? error.message : 'Failed to list orders';
		return errorResponse(message, 500);
	}
}
