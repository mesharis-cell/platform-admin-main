/**
 * Damage Photos Upload API Route (Phase 12)
 * POST /api/uploads/damage-photos
 */

import { NextRequest } from "next/server";
import { requirePermission, successResponse, errorResponse } from "@/lib/api/auth-middleware";
import { uploadBufferToS3, generateUniqueFilenameWithExt } from "@/lib/storage";

export async function POST(request: NextRequest) {
	try {
		// Require conditions:capture_damage_photos permission (A2 Staff only)
		const authResult = await requirePermission(
			"conditions:capture_damage_photos"
		);
		if (authResult instanceof Response) return authResult;

		const formData = await request.formData();
		const assetId = formData.get("assetId") as string;

		if (!assetId) {
			return errorResponse("assetId is required", 400);
		}

		const files = formData.getAll("files") as File[];

		if (!files || files.length === 0) {
			return errorResponse("At least one file is required", 400);
		}

		// Upload all files
		const photoUrls: string[] = [];

		for (const file of files) {
			// Validate file type
			if (!file.type.startsWith("image/")) {
				return errorResponse(
					`Invalid file type: ${file.type}. Only images are allowed.`,
					400
				);
			}

			// Generate unique filename
			const extension = file.name.split(".").pop() || "jpg";
			const filename = generateUniqueFilenameWithExt("damage", extension);

			// Construct S3 key: damage-photos/{assetId}/{filename}
			const key = `damage-photos/${assetId}/${filename}`;

			// Convert file to buffer
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Upload to S3
			const publicUrl = await uploadBufferToS3(buffer, key, file.type);
			photoUrls.push(publicUrl);
		}

		return successResponse(
			{
				success: true,
				photoUrls,
			},
			200
		);
	} catch (error) {
		console.error("[POST /api/uploads/damage-photos] Error:", error);
		const message =
			error instanceof Error
				? error.message
				: "Failed to upload damage photos";
		return errorResponse(message, 500);
	}
}
