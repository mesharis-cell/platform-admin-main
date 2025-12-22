/**
 * GET /api/inventory/availability
 * Monitor real-time inventory availability across all assets
 *
 * Auth: PMG Admin, A2 Staff (inventory:monitor_availability permission)
 * Phase 11: Inventory Tracking
 */

import { NextRequest } from 'next/server';
import { requirePermission, errorResponse, successResponse } from '@/lib/api/auth-middleware';
import { getInventoryAvailability } from '@/lib/services/inventory-service';
import type { InventoryAvailabilityParams } from '@/types/scanning';

export async function GET(request: NextRequest) {
  // Validate authentication and permission
  const authResult = await requirePermission('inventory:monitor_availability');
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params: InventoryAvailabilityParams = {
      company: searchParams.get('company') || undefined,
      warehouse: searchParams.get('warehouse') || undefined,
      zone: searchParams.get('zone') || undefined,
      status: (searchParams.get('status') as any) || undefined,
    };

    // Get inventory availability
    const result = await getInventoryAvailability(params, user.companies);

    return successResponse(result, 200);
  } catch (error) {
    console.error('Error getting inventory availability:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get inventory availability',
      400
    );
  }
}
