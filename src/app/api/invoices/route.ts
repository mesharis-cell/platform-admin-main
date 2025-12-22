/**
 * GET /api/invoices
 *
 * List all invoices with filtering and payment status tracking.
 * Enforces company scoping based on user permissions.
 */

import { NextRequest } from 'next/server';
import {
	requireAuth,
	successResponse,
	errorResponse,
} from '@/lib/api/auth-middleware';
import { listInvoices } from '@/lib/services/invoice-service';
import { hasPermission, getUserCompanyScope } from '@/lib/auth/permissions';
import { InvoiceListParams } from '@/types/order';

export async function GET(request: NextRequest) {
	// Authenticate user
	const authResult = await requireAuth();
	if (authResult instanceof Response) return authResult;
	const { user } = authResult;

	// Verify user has invoices:read or invoices:track_payment_status permission
	if (
		!hasPermission(user, 'invoices:read') &&
		!hasPermission(user, 'invoices:track_payment_status')
	) {
		return errorResponse('Permission denied', 403);
	}

	// Parse query parameters
	const searchParams = request.nextUrl.searchParams;

	const params: InvoiceListParams = {
		company: searchParams.get('company') || undefined,
		isPaid:
			searchParams.get('isPaid') === 'true'
				? true
				: searchParams.get('isPaid') === 'false'
				? false
				: undefined,
		dateFrom: searchParams.get('dateFrom') || undefined,
		dateTo: searchParams.get('dateTo') || undefined,
		page: parseInt(searchParams.get('page') || '1'),
		limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
		sortBy: (searchParams.get('sortBy') as any) || 'invoiceGeneratedAt',
		sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
	};

	try {
		// Get user's company scope
		const userCompanies = getUserCompanyScope(user);

		// List invoices with company scoping
		const result = await listInvoices(params, userCompanies);

		return successResponse(result, 200);
	} catch (error: any) {
		console.error('Error listing invoices:', error);
		return errorResponse(error.message || 'Failed to list invoices', 500);
	}
}
