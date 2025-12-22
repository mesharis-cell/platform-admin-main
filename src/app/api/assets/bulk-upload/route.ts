/**
 * Bulk Asset Upload API Route
 *
 * POST /api/assets/bulk-upload - Upload assets via CSV file
 */

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { parseCSVFile, validateCSVStructure } from '@/lib/utils/csv-utils';
import { validateBulkAssetRows, transformCSVRowToAssetData } from '@/lib/services/bulk-asset-validation-service';
import { createBulkAssets } from '@/lib/services/bulk-asset-creation-service';
import type { BulkUploadResponse } from '@/types/bulk-upload';

/**
 * POST /api/assets/bulk-upload - Upload assets in bulk via CSV
 * Permission: assets:create (A2 Staff only)
 */
export async function POST(request: NextRequest) {
  // Require assets:create permission
  const authResult = await requirePermission('assets:create');
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('File is required', 400);
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return errorResponse('File must be a CSV (.csv)', 400);
    }

    if (file.size === 0) {
      return errorResponse('File is empty', 400);
    }

    // Parse CSV
    const parseResult = await parseCSVFile(file);

    if (parseResult.errors.length > 0) {
      const response: BulkUploadResponse = {
        success: false,
        error: 'CSV parsing failed',
        details: {
          fileErrors: parseResult.errors,
          rowErrors: [],
          totalErrors: parseResult.errors.length,
          totalRows: 0,
        },
      };
      return Response.json(response, { status: 422 });
    }

    const rows = parseResult.data;

    // Validate CSV structure
    const structureValidation = validateCSVStructure(rows);
    if (!structureValidation.valid) {
      const response: BulkUploadResponse = {
        success: false,
        error: 'Invalid CSV structure',
        details: {
          fileErrors: structureValidation.errors,
          rowErrors: [],
          totalErrors: structureValidation.errors.length,
          totalRows: rows.length,
        },
      };
      return Response.json(response, { status: 422 });
    }

    // Validate all rows
    const validationResult = await validateBulkAssetRows(rows);

    if (!validationResult.isValid) {
      const response: BulkUploadResponse = {
        success: false,
        error: 'Validation failed',
        details: {
          fileErrors: validationResult.fileErrors,
          rowErrors: validationResult.rowErrors,
          totalErrors: validationResult.totalErrors,
          totalRows: validationResult.totalRows,
        },
      };
      return Response.json(response, { status: 422 });
    }

    // Transform validated rows to asset data
    const assetDataArray = validationResult.validRows.map(transformCSVRowToAssetData);

    // Create assets in bulk with transaction
    const createdAssets = await createBulkAssets(assetDataArray);

    // Prepare response
    const response: BulkUploadResponse = {
      success: true,
      data: {
        created: createdAssets.length,
        assets: createdAssets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          qrCode: asset.qrCode,
        })),
      },
    };

    return successResponse(response.data, 201);
  } catch (error) {
    console.error('Error in bulk asset upload:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to upload assets',
      500
    );
  }
}
