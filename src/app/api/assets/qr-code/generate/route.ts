/**
 * QR Code Generation API Route
 * Phase 3: Asset Management & QR Code Generation
 *
 * POST /api/assets/qr-code/generate - Generate QR code image from string
 */

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import QRCode from 'qrcode';
import type { GenerateQRCodeRequest } from '@/types/asset';

/**
 * POST /api/assets/qr-code/generate - Generate QR code image
 * Permission: assets:generate_qr (A2 Staff only)
 */
export async function POST(request: NextRequest) {
  // Require assets:generate_qr permission
  const authResult = await requirePermission('assets:generate_qr');
  if (authResult instanceof Response) return authResult;

  try {
    const body = (await request.json()) as GenerateQRCodeRequest;

    if (!body.qrCode) {
      return errorResponse('QR code string is required', 400);
    }

    // Generate QR code as base64 PNG
    const qrCodeImage = await QRCode.toDataURL(body.qrCode, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    return successResponse(
      {
        qrCodeImage,
      },
      200
    );
  } catch (error) {
    console.error('Error generating QR code:', error);
    return errorResponse(error instanceof Error ? error.message : 'Failed to generate QR code', 500);
  }
}
