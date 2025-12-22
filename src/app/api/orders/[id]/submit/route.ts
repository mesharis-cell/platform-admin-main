/**
 * Phase 6: Submit Order API Route
 * POST /api/orders/:draftId/submit - Submit draft order for review
 */

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { hasPermission } from '@/lib/auth/permissions';
import { submitOrder } from '@/lib/services/order-service';
import {
	sendOrderSubmittedNotifications,
	sendOrderSubmittedConfirmationToClient,
	formatDateForEmail,
} from '@/lib/services/email-service';
import type { SubmitOrderRequest } from '@/types/order';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const params = await context.params;
		// Authenticate user
		const authResult = await requireAuth();
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		// Check permission
		if (!hasPermission(user, 'orders:create')) {
			return errorResponse('You do not have permission to submit orders', 403);
		}

		// Get user's company
		const companyId = user.companies[0] === '*' ? null : user.companies[0];
		if (!companyId) {
			return errorResponse('Company ID is required', 400);
		}

		// Parse request body
		const body = (await request.json()) as SubmitOrderRequest;

		// Submit order
		const result = await submitOrder(params.id, user.id, companyId, body);

		// Send email notifications
		// Note: Email failures are logged but don't block order submission
		try {
			// Get order details for email (we need to fetch the full order)
			const { db } = await import('@/db');
			const { orders, companies } = await import('@/db/schema/schema');
			const { eq } = await import('drizzle-orm');

			const [order] = await db
				.select({
					order: orders,
					company: companies,
				})
				.from(orders)
				.leftJoin(companies, eq(orders.company, companies.id))
				.where(eq(orders.id, params.id));

			if (order) {
				const emailData = {
					orderId: result.orderId,
					companyName: order.company?.name || 'Unknown Company',
					eventStartDate: formatDateForEmail(new Date(body.eventStartDate)),
					eventEndDate: formatDateForEmail(new Date(body.eventEndDate)),
					venueCity: body.venueCity,
					totalVolume: order.order.calculatedVolume,
					itemCount: 0, // Will be fetched from orderItems
					viewOrderUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders/${result.orderId}`,
				};

				// Get item count
				const { orderItems } = await import('@/db/schema/schema');
				const items = await db.select().from(orderItems).where(eq(orderItems.order, params.id));
				emailData.itemCount = items.length;

				// Send notifications to PMG and A2
				await sendOrderSubmittedNotifications(emailData);

				// Send confirmation to client
				await sendOrderSubmittedConfirmationToClient(body.contactEmail, body.contactName, emailData);
			}
		} catch (emailError) {
			console.error('Error sending email notifications:', emailError);
			// Don't fail the request if emails fail
		}

		return successResponse(result, 200);
	} catch (error) {
		console.error('Error submitting order:', error);
		const message = error instanceof Error ? error.message : 'Failed to submit order';
		return errorResponse(message, 500);
	}
}
