import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { a2AdjustPricing } from '@/lib/services/pricing-service';
import { sendA2AdjustmentNotification } from '@/lib/services/email-service';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/admin/orders/:id/pricing/adjust
 * A2 adjusts pricing from standard tier (triggers PMG review)
 * Phase 8: Pricing & Quoting System
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePermission('pricing:adjust');
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { adjustedPrice, adjustmentReason } = body;

    if (!adjustedPrice || typeof adjustedPrice !== 'number') {
      return errorResponse('Adjusted price is required and must be a number', 400);
    }

    if (!adjustmentReason || typeof adjustmentReason !== 'string') {
      return errorResponse('Adjustment reason is required', 400);
    }

    // Adjust pricing
    await a2AdjustPricing(id, user.id, adjustedPrice, adjustmentReason);

    // Fetch updated order with company for email
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        company: true,
        a2AdjustedByUser: true,
      },
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    // Send notification to PMG
    await sendA2AdjustmentNotification({
      orderId: order.orderId,
      companyName: order.company.name,
      a2AdjustedPrice: adjustedPrice.toFixed(2),
      adjustmentReason,
      viewOrderUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${id}`,
    });

    return successResponse({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        a2AdjustedPrice: order.a2AdjustedPrice,
        a2AdjustmentReason: order.a2AdjustmentReason,
        a2AdjustedAt: order.a2AdjustedAt,
        a2AdjustedBy: order.a2AdjustedByUser
          ? { id: order.a2AdjustedByUser.id, name: order.a2AdjustedByUser.name }
          : null,
      },
    });
  } catch (error) {
    console.error('Error adjusting pricing:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to adjust pricing', 500);
  }
}
