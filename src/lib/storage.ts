/**
 * File Storage Utility - AWS S3 Integration
 * Phase 3: Asset Management & QR Code Generation
 *
 * Handles file uploads to AWS S3 for asset photos and other media.
 * Uses pre-configured environment variables from .env:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION
 * - AWS_S3_BUCKET (bucket name)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'asset-fulfillment-storage';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'];

/**
 * Generate unique filename with timestamp and random suffix
 */
function generateUniqueFilename(originalName: string): string {
  const extension = originalName.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const random = randomBytes(6).toString('hex');
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Generate unique filename with given extension
 * (Exported for use in scanning routes)
 */
export function generateUniqueFilenameWithExt(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const random = randomBytes(6).toString('hex');
  return `${prefix}-${timestamp}-${random}.${extension}`;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Upload file to S3 with organized path structure
 *
 * @param file - File object from form data
 * @param companyId - Company UUID for organizing files
 * @param assetId - Optional asset UUID for asset-specific organization
 * @returns Public URL of uploaded file
 */
export async function uploadFileToS3(
  file: File,
  companyId: string,
  assetId?: string
): Promise<string> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate unique filename
  const filename = generateUniqueFilename(file.name);

  // Construct S3 key (path structure: assets/{companyId}/{assetId}/{filename})
  const key = assetId
    ? `assets/${companyId}/${assetId}/${filename}`
    : `assets/${companyId}/temp/${filename}`;

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    // Make file publicly accessible (or use signed URLs if bucket is private)
    // ACL: 'public-read',
  });

  await s3Client.send(command);

  // Return public URL
  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  return publicUrl;
}

/**
 * Delete file from S3
 *
 * @param fileUrl - Full URL of file to delete
 */
export async function deleteFileFromS3(fileUrl: string): Promise<void> {
  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    // Don't throw error - file might already be deleted
  }
}

/**
 * Delete multiple files from S3
 *
 * @param fileUrls - Array of file URLs to delete
 */
export async function deleteFilesFromS3(fileUrls: string[]): Promise<void> {
  await Promise.all(fileUrls.map((url) => deleteFileFromS3(url)));
}

/**
 * Upload file with simple path structure (for collections, etc.)
 *
 * @param file - File object from form data
 * @param pathPrefix - Path prefix (e.g., 'collections', 'assets')
 * @returns Public URL of uploaded file
 */
export async function uploadFile(file: File, pathPrefix: string = 'uploads'): Promise<string> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate unique filename
  const filename = generateUniqueFilename(file.name);

  // Construct S3 key
  const key = `${pathPrefix}/${filename}`;

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    // ACL: 'public-read',
  });

  await s3Client.send(command);

  // Return public URL
  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  return publicUrl;
}

/**
 * Upload buffer directly to S3 (for Phase 11 scanning photos)
 *
 * @param buffer - Buffer data
 * @param key - S3 key (path)
 * @param contentType - MIME type
 * @returns Public URL of uploaded file
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // ACL: 'public-read',
  });

  await s3Client.send(command);

  // Return public URL
  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  return publicUrl;
}

/**
 * Get file from S3 storage
 *
 * @param fileUrl - Full URL or S3 key of file to retrieve
 * @returns Buffer of file contents
 */
export async function getFileFromStorage(fileUrl: string): Promise<Buffer | null> {
  try {
    // Extract key from URL if full URL provided
    let key = fileUrl;
    if (fileUrl.startsWith('http')) {
      const url = new URL(fileUrl);
      key = url.pathname.substring(1); // Remove leading slash
    }

    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    // Convert stream to buffer
    if (response.Body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    return null;
  } catch (error) {
    console.error('Error getting file from S3:', error);
    return null;
  }
}

/**
 * Check if S3 is properly configured
 */
export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET
  );
}
