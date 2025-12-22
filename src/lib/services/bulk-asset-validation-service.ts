/**
 * Bulk Asset Validation Service
 * Validates CSV rows with foreign key caching for performance
 */

import { db } from '@/db';
import { companies, warehouses, zones, brands } from '@/db/schema';
import { inArray, eq, isNull } from 'drizzle-orm';
import type {
  ParsedCSVRow,
  ForeignKeyCache,
  ValidationResult,
  RowValidationError,
  ValidatedAssetData,
} from '@/types/bulk-upload';
import { isValidUUID, parseArrayField, isValidURL } from '@/lib/utils/csv-utils';

/**
 * Build foreign key cache for fast validation
 */
export async function buildForeignKeyCache(
  rows: ParsedCSVRow[]
): Promise<ForeignKeyCache> {
  // Extract unique IDs
  const companyIds = [...new Set(rows.map((r) => r.company).filter(Boolean))];
  const warehouseIds = [...new Set(rows.map((r) => r.warehouse).filter(Boolean))];
  const zoneIds = [...new Set(rows.map((r) => r.zone).filter(Boolean))];
  const brandIds = [
    ...new Set(rows.map((r) => r.brand).filter(Boolean) as string[]),
  ];

  // Parallel queries for all entity types
  const [companiesData, warehousesData, zonesData, brandsData] =
    await Promise.all([
      companyIds.length > 0
        ? db.query.companies.findMany({
            where: inArray(companies.id, companyIds),
            columns: { id: true, archivedAt: true },
          })
        : Promise.resolve([]),
      warehouseIds.length > 0
        ? db.query.warehouses.findMany({
            where: inArray(warehouses.id, warehouseIds),
            columns: { id: true, archivedAt: true },
          })
        : Promise.resolve([]),
      zoneIds.length > 0
        ? db.query.zones.findMany({
            where: inArray(zones.id, zoneIds),
            columns: { id: true, company: true, deletedAt: true },
          })
        : Promise.resolve([]),
      brandIds.length > 0
        ? db.query.brands.findMany({
            where: inArray(brands.id, brandIds),
            columns: { id: true, company: true, deletedAt: true },
          })
        : Promise.resolve([]),
    ]);

  // Build lookup maps
  return {
    companies: new Map(
      companyIds.map((id) => {
        const company = companiesData.find((c) => c.id === id);
        return [
          id,
          {
            exists: !!company,
            archived: company?.archivedAt !== null,
          },
        ];
      })
    ),
    warehouses: new Map(
      warehouseIds.map((id) => {
        const warehouse = warehousesData.find((w) => w.id === id);
        return [
          id,
          {
            exists: !!warehouse,
            archived: warehouse?.archivedAt !== null,
          },
        ];
      })
    ),
    zones: new Map(
      zoneIds.map((id) => {
        const zone = zonesData.find((z) => z.id === id);
        return [
          id,
          {
            exists: !!zone,
            company: zone?.company || '',
            deleted: zone?.deletedAt !== null,
          },
        ];
      })
    ),
    brands: new Map(
      brandIds.map((id) => {
        const brand = brandsData.find((b) => b.id === id);
        return [
          id,
          {
            exists: !!brand,
            company: brand?.company || '',
            deleted: brand?.deletedAt !== null,
          },
        ];
      })
    ),
  };
}

/**
 * Validate a single asset row
 */
export function validateAssetRow(
  row: ParsedCSVRow,
  cache: ForeignKeyCache
): string[] {
  const errors: string[] = [];

  // 1. Required field validation
  if (!row.company || row.company.trim() === '') {
    errors.push('Company is required');
  }
  if (!row.warehouse || row.warehouse.trim() === '') {
    errors.push('Warehouse is required');
  }
  if (!row.zone || row.zone.trim() === '') {
    errors.push('Zone is required');
  }
  if (!row.name || row.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!row.category || row.category.trim() === '') {
    errors.push('Category is required');
  }
  if (!row.trackingMethod || row.trackingMethod.trim() === '') {
    errors.push('Tracking method is required');
  }

  // 2. UUID format validation
  if (row.company && !isValidUUID(row.company)) {
    errors.push(`Invalid company UUID format: ${row.company}`);
  }
  if (row.warehouse && !isValidUUID(row.warehouse)) {
    errors.push(`Invalid warehouse UUID format: ${row.warehouse}`);
  }
  if (row.zone && !isValidUUID(row.zone)) {
    errors.push(`Invalid zone UUID format: ${row.zone}`);
  }
  if (row.brand && row.brand.trim() !== '' && !isValidUUID(row.brand)) {
    errors.push(`Invalid brand UUID format: ${row.brand}`);
  }

  // Stop here if basic validation fails
  if (errors.length > 0) return errors;

  // 3. Foreign key existence validation
  const companyCached = cache.companies.get(row.company);
  if (!companyCached || !companyCached.exists) {
    errors.push(`Company '${row.company}' not found`);
  } else if (companyCached.archived) {
    errors.push(`Company '${row.company}' is archived`);
  }

  const warehouseCached = cache.warehouses.get(row.warehouse);
  if (!warehouseCached || !warehouseCached.exists) {
    errors.push(`Warehouse '${row.warehouse}' not found`);
  } else if (warehouseCached.archived) {
    errors.push(`Warehouse '${row.warehouse}' is archived`);
  }

  const zoneCached = cache.zones.get(row.zone);
  if (!zoneCached || !zoneCached.exists) {
    errors.push(`Zone '${row.zone}' not found`);
  } else if (zoneCached.deleted) {
    errors.push(`Zone '${row.zone}' is deleted`);
  } else if (zoneCached.company !== row.company) {
    errors.push(
      `Zone '${row.zone}' does not belong to company '${row.company}'`
    );
  }

  if (row.brand && row.brand.trim() !== '') {
    const brandCached = cache.brands.get(row.brand);
    if (!brandCached || !brandCached.exists) {
      errors.push(`Brand '${row.brand}' not found`);
    } else if (brandCached.deleted) {
      errors.push(`Brand '${row.brand}' is deleted`);
    } else if (brandCached.company !== row.company) {
      errors.push(
        `Brand '${row.brand}' does not belong to company '${row.company}'`
      );
    }
  }

  // 4. Tracking method validation
  if (!['INDIVIDUAL', 'BATCH'].includes(row.trackingMethod.toUpperCase())) {
    errors.push(
      `Tracking method must be 'INDIVIDUAL' or 'BATCH', got '${row.trackingMethod}'`
    );
  }

  // 5. Numeric field validation
  const weight = parseFloat(row.weight);
  if (isNaN(weight) || weight <= 0) {
    errors.push(`Weight must be a positive number, got '${row.weight}'`);
  }

  const dimensionLength = parseFloat(row.dimensionLength);
  if (isNaN(dimensionLength) || dimensionLength <= 0) {
    errors.push(
      `Dimension length must be a positive number, got '${row.dimensionLength}'`
    );
  }

  const dimensionWidth = parseFloat(row.dimensionWidth);
  if (isNaN(dimensionWidth) || dimensionWidth <= 0) {
    errors.push(
      `Dimension width must be a positive number, got '${row.dimensionWidth}'`
    );
  }

  const dimensionHeight = parseFloat(row.dimensionHeight);
  if (isNaN(dimensionHeight) || dimensionHeight <= 0) {
    errors.push(
      `Dimension height must be a positive number, got '${row.dimensionHeight}'`
    );
  }

  const volume = parseFloat(row.volume);
  if (isNaN(volume) || volume <= 0) {
    errors.push(`Volume must be a positive number, got '${row.volume}'`);
  }

  const totalQuantity = parseInt(row.totalQuantity);
  if (isNaN(totalQuantity) || totalQuantity < 1) {
    errors.push(
      `Total quantity must be a positive integer, got '${row.totalQuantity}'`
    );
  }

  // 6. Business rule validation
  if (row.trackingMethod.toUpperCase() === 'BATCH') {
    if (!row.packaging || row.packaging.trim() === '') {
      errors.push('Packaging description is required for BATCH tracking method');
    }
  }

  if (row.trackingMethod.toUpperCase() === 'INDIVIDUAL') {
    if (totalQuantity !== 1) {
      errors.push(
        `Total quantity must be 1 for INDIVIDUAL tracking method, got ${totalQuantity}`
      );
    }
  }

  // 7. Condition validation (optional field)
  if (row.condition && row.condition.trim() !== '') {
    if (!['GREEN', 'ORANGE', 'RED'].includes(row.condition.toUpperCase())) {
      errors.push(
        `Condition must be 'GREEN', 'ORANGE', or 'RED', got '${row.condition}'`
      );
    }
  }

  // 8. Image URLs validation (optional field)
  if (row.images && row.images.trim() !== '') {
    const imageUrls = parseArrayField(row.images);
    imageUrls.forEach((url) => {
      if (!isValidURL(url)) {
        errors.push(`Invalid image URL: ${url}`);
      }
    });
  }

  return errors;
}

/**
 * Validate all rows and return aggregated results
 */
export async function validateBulkAssetRows(
  rows: ParsedCSVRow[]
): Promise<ValidationResult> {
  const fileErrors: string[] = [];
  const rowErrors: RowValidationError[] = [];

  // Build foreign key cache
  const cache = await buildForeignKeyCache(rows);

  // Validate each row
  rows.forEach((row) => {
    const errors = validateAssetRow(row, cache);
    if (errors.length > 0) {
      rowErrors.push({
        row: row.rowNumber,
        errors,
      });
    }
  });

  const totalErrors = fileErrors.length + rowErrors.length;
  const isValid = totalErrors === 0;
  const validRows = isValid ? rows : [];

  return {
    isValid,
    fileErrors,
    rowErrors,
    validRows,
    totalErrors,
    totalRows: rows.length,
  };
}

/**
 * Transform validated CSV row to asset data format
 */
export function transformCSVRowToAssetData(
  row: ParsedCSVRow
): ValidatedAssetData {
  return {
    company: row.company,
    warehouse: row.warehouse,
    zone: row.zone,
    name: row.name.trim(),
    category: row.category.trim(),
    trackingMethod: row.trackingMethod.toUpperCase() as 'INDIVIDUAL' | 'BATCH',
    weight: parseFloat(row.weight),
    dimensionLength: parseFloat(row.dimensionLength),
    dimensionWidth: parseFloat(row.dimensionWidth),
    dimensionHeight: parseFloat(row.dimensionHeight),
    volume: parseFloat(row.volume),
    packaging:
      row.packaging && row.packaging.trim() !== ''
        ? row.packaging.trim()
        : null,
    totalQuantity: parseInt(row.totalQuantity),
    brand: row.brand && row.brand.trim() !== '' ? row.brand.trim() : null,
    description:
      row.description && row.description.trim() !== ''
        ? row.description.trim()
        : null,
    handlingTags: parseArrayField(row.handlingTags),
    images: parseArrayField(row.images),
    condition: row.condition && row.condition.trim() !== ''
      ? (row.condition.toUpperCase() as 'GREEN' | 'ORANGE' | 'RED')
      : 'GREEN',
  };
}
