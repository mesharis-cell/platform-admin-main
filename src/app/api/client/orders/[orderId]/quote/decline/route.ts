import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { hasCompanyAccess } from '@/lib/auth/permissions';
import { clientDeclineQuote } from '@/lib/services/pricing-service';
import { sendNotification } from '@/lib/services/notification-service';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/client/orders/:orderId/quote/decline
 * Client declines the quote (order ends here)
 * Phase 8: Pricing & Quoting System
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const { orderId } = await params;
    const body = await request.json();
    const { declineReason } = body;

    if (!declineReason || typeof declineReason !== 'string') {
      return errorResponse('Decline reason is required', 400);
    }

    // Verify order exists and user has access (using readable orderId)
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    if (!hasCompanyAccess(user, order.company)) {
      return errorResponse('You do not have access to this order', 403);
    }

    // Decline quote (use UUID id for service function)
    await clientDeclineQuote(order.id, user.id, declineReason);

    // Send decline notification using new notification service
    sendNotification('QUOTE_DECLINED', order.id).catch((error) => {
      console.error('Failed to send quote decline notification:', error);
      // Don't block - notification failure is non-critical
    });

    // Fetch updated order for response
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, order.id),
    });

    return successResponse({
      success: true,
      order: {
        id: updatedOrder!.id,
        status: updatedOrder!.status,
        updatedAt: updatedOrder!.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error declining quote:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to decline quote', 500);
  }
}
