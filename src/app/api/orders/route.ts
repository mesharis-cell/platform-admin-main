/**
 * Phase 7: Admin Order List API Route
 *
 * GET /api/orders - Retrieve paginated list of orders with filtering and search
 */

import { NextRequest } from 'next/server';
import { requireAuth, requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { listOrdersForAdmin } from '@/lib/services/order-service';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
	// Require authentication and orders:read permission
	const authResult = await requirePermission('orders:read');
	if (authResult instanceof Response) return authResult;
	const { user } = authResult;

	try {
		// Parse query parameters
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100
		const company = searchParams.get('company') || undefined;
		const brand = searchParams.get('brand') || undefined;
		const status = searchParams.get('status') || undefined;
		const dateFrom = searchParams.get('dateFrom') || undefined;
		const dateTo = searchParams.get('dateTo') || undefined;
		const search = searchParams.get('search') || undefined;
		const sortBy = searchParams.get('sortBy') || 'createdAt';
		const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

		// Validate pagination parameters
		if (page < 1) {
			return errorResponse('Page must be greater than 0', 400);
		}
		if (limit < 1) {
			return errorResponse('Limit must be greater than 0', 400);
		}

		// Validate date parameters
		if (dateFrom && isNaN(Date.parse(dateFrom))) {
			return errorResponse('Invalid dateFrom format (use ISO 8601)', 400);
		}
		if (dateTo && isNaN(Date.parse(dateTo))) {
			return errorResponse('Invalid dateTo format (use ISO 8601)', 400);
		}

		// Validate sortBy parameter
		const validSortFields = ['createdAt', 'eventStartDate', 'orderId', 'status'];
		if (!validSortFields.includes(sortBy)) {
			return errorResponse(`Invalid sortBy field. Valid options: ${validSortFields.join(', ')}`, 400);
		}

		// Check if user can see job numbers (PMG Admin only)
		const includeJobNumbers = hasPermission(user, 'orders:add_job_number');

		// Fetch orders
		const result = await listOrdersForAdmin({
			user,
			page,
			limit,
			company,
			brand,
			status,
			dateFrom,
			dateTo,
			search,
			sortBy,
			sortOrder,
			includeJobNumbers,
		});

		return successResponse(result, 200);
	} catch (error) {
		console.error('Error fetching orders:', error);
		return errorResponse('Failed to fetch orders', 500);
	}
}
