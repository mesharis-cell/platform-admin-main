/**
 * GET /api/orders/:orderId/scan-events
 * Retrieve all scan events for an order (admin view)
 *
 * Auth: PMG Admin, A2 Staff (orders:view_scanning_activity permission)
 * Phase 11: QR Code Tracking System
 */

import { NextRequest } from 'next/server';
import { requirePermission, errorResponse, successResponse } from '@/lib/api/auth-middleware';
import { getOrderScanEvents } from '@/lib/services/scanning-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate authentication and permission
  const authResult = await requirePermission('orders:read');
  if (authResult instanceof Response) return authResult;

  try {
    // Await params for Next.js 15 compatibility
    const { id: orderId } = await params;

    if (!orderId) {
      return errorResponse('orderId is required', 400);
    }

    // Get scan events for order
    const scanEvents = await getOrderScanEvents(orderId);

    return successResponse(
      {
        orderId,
        scanEvents,
      },
      200
    );
  } catch (error) {
    console.error('Error getting order scan events:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get order scan events',
      400
    );
  }
}
