import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { pmgApprovePricing } from '@/lib/services/pricing-service';
import { sendNotification } from '@/lib/services/notification-service';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/admin/orders/:id/pricing/pmg-approve
 * PMG reviews and approves final pricing (after A2 adjustment)
 * Phase 8: Pricing & Quoting System
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePermission('pricing:pmg_approve');
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { a2BasePrice, pmgMarginPercent, pmgReviewNotes } = body;

    if (!a2BasePrice || typeof a2BasePrice !== 'number') {
      return errorResponse('A2 base price is required and must be a number', 400);
    }

    if (pmgMarginPercent === undefined || typeof pmgMarginPercent !== 'number') {
      return errorResponse('PMG margin percent is required and must be a number', 400);
    }

    // Approve pricing (transitions from PENDING_APPROVAL to QUOTED)
    await pmgApprovePricing(id, user.id, a2BasePrice, pmgMarginPercent, pmgReviewNotes);

    // Send quote to client using new notification service
    sendNotification('QUOTE_SENT', id).catch((error) => {
      console.error('Failed to send quote notification:', error);
      // Don't block - notification failure is non-critical
    });

    // Fetch updated order for response
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        pmgReviewedByUser: true,
      },
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
        pmgReviewedAt: order.pmgReviewedAt,
        pmgReviewedBy: order.pmgReviewedByUser
          ? { id: order.pmgReviewedByUser.id, name: order.pmgReviewedByUser.name }
          : null,
        pmgReviewNotes: order.pmgReviewNotes,
        quoteSentAt: order.quoteSentAt,
      },
    });
  } catch (error) {
    console.error('Error approving pricing:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to approve pricing', 500);
  }
}
