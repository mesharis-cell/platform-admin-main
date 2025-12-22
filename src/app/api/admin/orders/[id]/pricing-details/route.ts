import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { getOrderPricingDetails } from '@/lib/services/pricing-service';

/**
 * GET /api/admin/orders/:id/pricing-details
 * Get detailed pricing breakdown for order review (A2 or PMG)
 * Phase 8: Pricing & Quoting System
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePermission('pricing:review');
  if (authResult instanceof Response) return authResult;

  try {
    const { id } = await context.params;
    const pricingDetails = await getOrderPricingDetails(id);

    return successResponse(pricingDetails);
  } catch (error) {
    console.error('Error fetching order pricing details:', error);
    if (error instanceof Error && error.message === 'Order not found') {
      return errorResponse('Order not found', 404);
    }
    return errorResponse('Failed to fetch order pricing details', 500);
  }
}
