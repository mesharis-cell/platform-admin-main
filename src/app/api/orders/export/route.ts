/**
 * Phase 7: Order Export API Route
 * GET /api/orders/export - Export filtered orders as CSV
 */

import { NextRequest } from 'next/server';
import { requirePermission, errorResponse } from '@/lib/api/auth-middleware';
import { hasPermission } from '@/lib/auth/permissions';
import { listOrdersForAdmin } from '@/lib/services/order-service';

export async function GET(request: NextRequest) {
	// Require authentication and orders:export permission
	const authResult = await requirePermission('orders:export');
	if (authResult instanceof Response) return authResult;
	const { user } = authResult;

	try {
		// Parse query parameters (same as list endpoint)
		const { searchParams } = new URL(request.url);
		const company = searchParams.get('company') || undefined;
		const brand = searchParams.get('brand') || undefined;
		const status = searchParams.get('status') || undefined;
		const dateFrom = searchParams.get('dateFrom') || undefined;
		const dateTo = searchParams.get('dateTo') || undefined;
		const search = searchParams.get('search') || undefined;

		// Check if user can see job numbers (PMG Admin only)
		const includeJobNumbers = hasPermission(user, 'orders:add_job_number');

		// Fetch all matching orders (no pagination, max 10,000 records)
		const result = await listOrdersForAdmin({
			user,
			page: 1,
			limit: 10000, // Max export limit
			company,
			brand,
			status,
			dateFrom,
			dateTo,
			search,
			sortBy: 'createdAt',
			sortOrder: 'desc',
			includeJobNumbers,
		});

		// Build CSV content
		const headers = [
			'Order ID',
			'Company',
			'Brand',
			'Contact Name',
			'Contact Email',
			'Event Start',
			'Event End',
			'Venue',
			'City',
			'Country',
			'Volume (m³)',
			'Weight (kg)',
			'Status',
			'Created At',
			...(includeJobNumbers ? ['Job Number'] : []),
		];

		const rows = result.orders.map((order) => {
			const baseRow = [
				order.orderId,
				order.company.name,
				order.brand?.name || '',
				order.contactName,
				order.contactEmail,
				order.eventStartDate,
				order.eventEndDate,
				order.venueName,
				order.venueCity,
				order.venueCountry,
				order.calculatedVolume,
				order.calculatedWeight,
				order.status,
				order.createdAt,
			];

			if (includeJobNumbers && 'jobNumber' in order) {
				baseRow.push((order as any).jobNumber || '');
			}

			return baseRow;
		});

		// Convert to CSV
		const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

		// Generate filename with timestamp
		const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
		const filename = `orders-export-${timestamp}.csv`;

		// Return CSV response
		return new Response(csvContent, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error('Error exporting orders:', error);
		return errorResponse('Failed to export orders', 500);
	}
}
