import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { a2ApproveStandardPricing } from '@/lib/services/pricing-service';
import { sendNotification } from '@/lib/services/notification-service';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/admin/orders/:id/pricing/approve-standard
 * A2 approves standard tier pricing (skips PMG review, goes directly to client)
 * Phase 8: Pricing & Quoting System
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePermission('pricing:approve_standard');
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    // Approve standard pricing (transitions to QUOTED status)
    const standardPricing = await a2ApproveStandardPricing(id, user.id, notes);

    // Send A2 standard approval notification to PMG (FYI)
    sendNotification('A2_APPROVED_STANDARD', id).catch((error) => {
      console.error('Failed to send A2 standard approval notification:', error);
      // Don't block - notification failure is non-critical
    });

    // Send quote to client
    sendNotification('QUOTE_SENT', id).catch((error) => {
      console.error('Failed to send quote notification:', error);
      // Don't block - notification failure is non-critical
    });

    // Fetch updated order for response
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    return successResponse({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        a2BasePrice: order.a2BasePrice,
        pmgMarginPercent: order.pmgMarginPercent,
        pmgMarginAmount: order.pmgMarginAmount,
        finalTotalPrice: order.finalTotalPrice,
        quoteSentAt: order.quoteSentAt,
      },
    });
  } catch (error) {
    console.error('Error approving standard pricing:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to approve standard pricing', 500);
  }
}
