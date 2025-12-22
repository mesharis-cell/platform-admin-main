/**
 * Asset Image Upload API Route
 * Phase 3: Asset Management & QR Code Generation
 *
 * POST /api/assets/upload-image - Upload single asset photo to S3
 */

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { uploadFileToS3, isS3Configured } from '@/lib/storage';

/**
 * POST /api/assets/upload-image - Upload asset photo
 * Permission: assets:upload_photos (A2 Staff only)
 */
export async function POST(request: NextRequest) {
  // Require assets:upload_photos permission
  const authResult = await requirePermission('assets:upload_photos');
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  try {
    // Check if S3 is configured
    if (!isS3Configured()) {
      return errorResponse(
        'File storage is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET environment variables.',
        500
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const companyId = formData.get('companyId') as string | null;
    const assetId = formData.get('assetId') as string | null;

    if (!file) {
      return errorResponse('File is required', 400);
    }

    if (!companyId) {
      return errorResponse('Company ID is required', 400);
    }

    // Upload to S3
    const imageUrl = await uploadFileToS3(file, companyId, assetId || undefined);

    return successResponse(
      {
        imageUrl,
      },
      200
    );
  } catch (error) {
    console.error('Error uploading image:', error);
    return errorResponse(error instanceof Error ? error.message : 'Failed to upload image', 500);
  }
}
