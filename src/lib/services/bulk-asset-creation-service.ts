/**
 * Bulk Asset Creation Service
 * Transaction-wrapped batch asset creation with QR code generation
 */

import { db } from '@/db';
import { assets, companies } from '@/db/schema';
import { eq, ilike, inArray } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { ValidatedAssetData } from '@/types/bulk-upload';
import type { Asset } from '@/types/asset';

/**
 * Generate unique QR codes in bulk
 */
export async function generateBulkQRCodes(
  companyId: string,
  count: number
): Promise<string[]> {
  // Fetch company for code generation
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { name: true },
  });

  const companyCode =
    company?.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase() || 'UNK';

  // Fetch existing QR codes with same prefix to avoid collisions
  const existingAssets = await db.query.assets.findMany({
    where: ilike(assets.qrCode, `ASSET-${companyCode}-%`),
    columns: { qrCode: true },
  });

  const existingCodes = new Set(existingAssets.map((a) => a.qrCode));
  const qrCodes: string[] = [];

  // Generate unique codes
  let attempts = 0;
  const maxAttempts = count * 10; // Prevent infinite loop

  while (qrCodes.length < count && attempts < maxAttempts) {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex').toUpperCase();
    const qrCode = `ASSET-${companyCode}-${timestamp}-${random}`;

    // Check uniqueness against existing + generated batch
    if (!existingCodes.has(qrCode) && !qrCodes.includes(qrCode)) {
      qrCodes.push(qrCode);
      existingCodes.add(qrCode);
    }

    attempts++;
  }

  if (qrCodes.length < count) {
    throw new Error('Failed to generate unique QR codes');
  }

  return qrCodes;
}

/**
 * Create assets in bulk with transaction
 */
export async function createBulkAssets(
  validatedRows: ValidatedAssetData[]
): Promise<Asset[]> {
  // Group by company for QR code generation
  const assetsByCompany = validatedRows.reduce((acc, row) => {
    if (!acc[row.company]) {
      acc[row.company] = [];
    }
    acc[row.company].push(row);
    return acc;
  }, {} as Record<string, ValidatedAssetData[]>);

  // Use transaction for all-or-nothing guarantee
  return await db.transaction(async (tx) => {
    const allCreatedAssets: Asset[] = [];

    // Process each company's assets
    for (const [companyId, companyAssets] of Object.entries(assetsByCompany)) {
      // Generate QR codes for this company's assets
      const qrCodes = await generateBulkQRCodes(companyId, companyAssets.length);

      // Prepare insert data
      const insertData = companyAssets.map((row, index) => ({
        company: row.company,
        brand: row.brand,
        warehouse: row.warehouse,
        zone: row.zone,
        name: row.name,
        description: row.description,
        category: row.category,
        images: row.images,
        trackingMethod: row.trackingMethod,
        totalQuantity: row.totalQuantity,
        availableQuantity: row.totalQuantity, // Initially all available
        bookedQuantity: 0,
        outQuantity: 0,
        inMaintenanceQuantity: 0,
        qrCode: qrCodes[index],
        packaging: row.packaging,
        weight: row.weight.toString(),
        dimensionLength: row.dimensionLength.toString(),
        dimensionWidth: row.dimensionWidth.toString(),
        dimensionHeight: row.dimensionHeight.toString(),
        volume: row.volume.toString(),
        condition: row.condition,
        status: 'AVAILABLE' as const,
        handlingTags: row.handlingTags,
      }));

      // Insert in batches of 100 for performance
      const batchSize = 100;
      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        const batchAssets = await tx.insert(assets).values(batch).returning();
        allCreatedAssets.push(...batchAssets);
      }
    }

    return allCreatedAssets;
  });
}

/**
 * Map database asset to API Asset type
 */
export function mapDbAssetToAsset(dbAsset: typeof assets.$inferSelect): Asset {
  return {
    id: dbAsset.id,
    company: dbAsset.company,
    brand: dbAsset.brand,
    warehouse: dbAsset.warehouse,
    zone: dbAsset.zone,
    name: dbAsset.name,
    description: dbAsset.description,
    category: dbAsset.category,
    images: dbAsset.images,
    trackingMethod: dbAsset.trackingMethod,
    totalQuantity: dbAsset.totalQuantity,
    availableQuantity: dbAsset.availableQuantity,
    bookedQuantity: dbAsset.bookedQuantity,
    outQuantity: dbAsset.outQuantity,
    inMaintenanceQuantity: dbAsset.inMaintenanceQuantity,
    qrCode: dbAsset.qrCode,
    packaging: dbAsset.packaging,
    weight: dbAsset.weight,
    dimensionLength: dbAsset.dimensionLength,
    dimensionWidth: dbAsset.dimensionWidth,
    dimensionHeight: dbAsset.dimensionHeight,
    volume: dbAsset.volume,
    condition: dbAsset.condition,
    status: dbAsset.status,
    handlingTags: dbAsset.handlingTags,
    lastScannedAt: dbAsset.lastScannedAt,
    lastScannedBy: dbAsset.lastScannedBy,
    deletedAt: dbAsset.deletedAt,
    createdAt: dbAsset.createdAt,
    updatedAt: dbAsset.updatedAt,
  };
}
