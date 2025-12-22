/**
 * GET /api/assets/:assetId/scan-history
 * Retrieve scan history for a specific asset
 *
 * Auth: PMG Admin, A2 Staff (assets:read permission)
 * Phase 11: QR Code Tracking System
 */

import { NextRequest } from 'next/server';
import { requirePermission, errorResponse, successResponse } from '@/lib/api/auth-middleware';
import { getAssetScanHistory } from '@/lib/services/scanning-service';
import { db } from '@/db';
import { assets } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate authentication and permission
  const authResult = await requirePermission('assets:read');
  if (authResult instanceof Response) return authResult;

  try {
    // Await params for Next.js 15 compatibility
    const { id: assetId } = await params;

    if (!assetId) {
      return errorResponse('assetId is required', 400);
    }

    // Verify asset exists
    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });

    if (!asset) {
      return errorResponse('Asset not found', 404);
    }

    // Get scan history for asset
    const scanHistory = await getAssetScanHistory(assetId);

    return successResponse(
      {
        assetId,
        assetName: asset.name,
        qrCode: asset.qrCode,
        scanHistory,
      },
      200
    );
  } catch (error) {
    console.error('Error getting asset scan history:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get asset scan history',
      400
    );
  }
}
