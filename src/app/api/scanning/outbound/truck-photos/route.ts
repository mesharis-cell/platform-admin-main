/**
 * POST /api/scanning/outbound/truck-photos
 * Upload photos of loaded truck before delivery
 *
 * Auth: A2 Staff only (scanning:capture_truck_photos permission)
 * Phase 11: QR Code Tracking System
 */

import { NextRequest } from 'next/server'
import {
	requirePermission,
	errorResponse,
	successResponse,
} from '@/lib/api/auth-middleware'
import { uploadBufferToS3, generateUniqueFilenameWithExt } from '@/lib/storage'
import { db } from '@/db'
import { orders } from '@/db/schema/schema'
import { eq } from 'drizzle-orm'
import type { UploadTruckPhotosRequest } from '@/types/scanning'

export async function POST(request: NextRequest) {
	// Validate authentication and permission
	const authResult = await requirePermission('scanning:capture_truck_photos')
	if (authResult instanceof Response) return authResult

	try {
		// Parse request body
		const body: { orderId: string; photos: string[] } = await request.json()
		const { photos, orderId } = body

		if (!photos || photos.length === 0 || !orderId) {
			return errorResponse('orderId and photos are required', 400)
		}

		// Upload photos to S3
		const uploadedPhotoUrls: string[] = []

		for (let i = 0; i < photos.length; i++) {
			const photoBase64 = photos[i]

			// Convert base64 to buffer (handle both with and without data URI prefix)
			const base64Data = photoBase64.includes(',')
				? photoBase64.split(',')[1]
				: photoBase64
			const buffer = Buffer.from(base64Data, 'base64')

			// Generate filename
			const filename = generateUniqueFilenameWithExt('truck-photo', 'jpg')

			// Upload to S3
			const url = await uploadBufferToS3(
				buffer,
				`trucks/${orderId}/${filename}`,
				'image/jpeg'
			)

			uploadedPhotoUrls.push(url)
		}

		// Update order with truck photos
		await db
			.update(orders)
			.set({
				truckPhotos: uploadedPhotoUrls,
			})
			.where(eq(orders.id, orderId))

		return successResponse(
			{
				success: true,
				uploadedPhotos: uploadedPhotoUrls,
			},
			200
		)
	} catch (error) {
		console.error('Error uploading truck photos:', error)
		return errorResponse(
			error instanceof Error
				? error.message
				: 'Failed to upload truck photos',
			400
		)
	}
}
