// Phase 4: Collection Image Upload API Route

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { uploadFile, validateFile } from '@/lib/storage';

// POST /api/uploads/collection-images - Upload collection images to S3
export async function POST(request: NextRequest) {
	const authResult = await requirePermission('collections:create');
	if (authResult instanceof Response) return authResult;

	try {
		const formData = await request.formData();
		const files = formData.getAll('images');

		if (!files || files.length === 0) {
			return errorResponse('No images provided', 400);
		}

		const uploadedUrls: string[] = [];

		for (const file of files) {
			if (!(file instanceof File)) {
				continue;
			}

			// Validate file
			const validation = validateFile(file);
			if (!validation.valid) {
				return errorResponse(validation.error || 'Invalid file', 400);
			}

			// Upload to S3 (collections path)
			const url = await uploadFile(file, 'collections');
			uploadedUrls.push(url);
		}

		return successResponse({ urls: uploadedUrls }, 200);
	} catch (error) {
		console.error('Error uploading collection images:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to upload collection images',
			500
		);
	}
}
