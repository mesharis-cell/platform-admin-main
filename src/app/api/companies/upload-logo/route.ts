/**
 * Company Logo Upload API Route
 *
 * POST /api/companies/upload-logo - Upload company logo to S3
 */

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { uploadFile, isS3Configured } from '@/lib/storage';

/**
 * POST /api/companies/upload-logo - Upload company logo
 * Permission: companies:create or companies:update (PMG Admin only)
 */
export async function POST(request: NextRequest) {
  // Require companies:update permission
  const authResult = await requirePermission('companies:update');
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

    if (!file) {
      return errorResponse('File is required', 400);
    }

    // Validate file type (allow PNG, JPG, WebP, SVG for logos)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse(
        `Invalid file type. Allowed types: PNG, JPG, WebP, SVG`,
        400
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return errorResponse(
        `File size exceeds maximum of 5MB`,
        400
      );
    }

    // Upload to S3 under company-logos path
    const logoUrl = await uploadFile(file, 'company-logos');

    return successResponse(
      {
        logoUrl,
      },
      200
    );
  } catch (error) {
    console.error('Error uploading company logo:', error);
    return errorResponse(error instanceof Error ? error.message : 'Failed to upload logo', 500);
  }
}
