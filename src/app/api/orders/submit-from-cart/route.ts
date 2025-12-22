/**
 * Submit Order from Cart API
 * Creates SUBMITTED order directly from cart items (no draft)
 */

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { hasPermission } from '@/lib/auth/permissions';
import { submitOrderFromCart } from '@/lib/services/order-service';
import { sendOrderSubmittedNotifications, sendOrderSubmittedConfirmationToClient } from '@/lib/services/email-service';

export async function POST(request: NextRequest) {
	try {
		const authResult = await requireAuth();
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		if (!hasPermission(user, 'orders:create')) {
			return errorResponse('You do not have permission to submit orders', 403);
		}

		const companyId = user.companies[0] === '*' ? null : user.companies[0];
		if (!companyId) {
			return errorResponse('Company ID is required', 400);
		}

		const body = await request.json();

		// Validate request
		if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
			return errorResponse('At least one item is required', 400);
		}

		// Submit order
		const result = await submitOrderFromCart(user.id, companyId, body);

		// Send email notifications (don't block on errors)
		try {
			const emailData = {
				orderId: result.orderId,
				companyName: result.companyName,
				eventStartDate: body.eventStartDate,
				eventEndDate: body.eventEndDate,
				venueCity: body.venueCity,
				totalVolume: result.calculatedVolume,
				itemCount: result.itemCount,
				viewOrderUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${result.orderId}`,
			};

			await sendOrderSubmittedNotifications(emailData);
			await sendOrderSubmittedConfirmationToClient(body.contactEmail, body.contactName, emailData);
		} catch (emailError) {
			console.error('Error sending email notifications:', emailError);
		}

		return successResponse(
			{
				orderId: result.orderId,
				status: result.status,
				message: 'Order submitted successfully. You will receive a quote via email within 24-48 hours.',
			},
			200
		);
	} catch (error) {
		console.error('Error submitting order:', error);
		const message = error instanceof Error ? error.message : 'Failed to submit order';
		return errorResponse(message, 500);
	}
}
