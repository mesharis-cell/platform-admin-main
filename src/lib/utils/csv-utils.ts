/**
 * CSV Utilities for Bulk Asset Upload
 * Parsing, template generation, and error export
 */

import Papa from 'papaparse';
import type { CSVAssetRow, ParsedCSVRow, RowValidationError } from '@/types/bulk-upload';

const REQUIRED_COLUMNS = [
  'company',
  'warehouse',
  'zone',
  'name',
  'category',
  'trackingMethod',
  'weight',
  'dimensionLength',
  'dimensionWidth',
  'dimensionHeight',
  'volume',
  'totalQuantity',
];

const OPTIONAL_COLUMNS = [
  'packaging',
  'brand',
  'description',
  'handlingTags',
  'images',
  'condition',
];

const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

/**
 * Parse CSV file and return rows with row numbers
 */
export async function parseCSVFile(file: File): Promise<{
  data: ParsedCSVRow[];
  errors: string[];
}> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        const errors: string[] = [];

        // Check for parsing errors
        if (results.errors.length > 0) {
          errors.push(
            ...results.errors.map((e) => `Parse error at row ${e.row}: ${e.message}`)
          );
        }

        // Check for required columns
        const headers = results.meta.fields || [];
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !headers.includes(col)
        );

        if (missingColumns.length > 0) {
          errors.push(
            `Missing required columns: ${missingColumns.join(', ')}`
          );
        }

        // Add row numbers to data
        const parsedData: ParsedCSVRow[] = (results.data as CSVAssetRow[]).map(
          (row, index) => ({
            ...row,
            rowNumber: index + 2, // +2 because index is 0-based and CSV has header row
          })
        );

        resolve({
          data: parsedData,
          errors,
        });
      },
      error: (error) => {
        resolve({
          data: [],
          errors: [error.message],
        });
      },
    });
  });
}

/**
 * Validate CSV structure (columns present)
 */
export function validateCSVStructure(
  rows: ParsedCSVRow[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rows.length === 0) {
    errors.push('CSV file is empty');
    return { valid: false, errors };
  }

  // Check if first row has all required fields
  const firstRow = rows[0];
  const missingFields: string[] = [];

  REQUIRED_COLUMNS.forEach((col) => {
    if (!(col in firstRow)) {
      missingFields.push(col);
    }
  });

  if (missingFields.length > 0) {
    errors.push(`Missing required columns: ${missingFields.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate CSV template with example data
 */
export function generateCSVTemplate(
  exampleCompanyId?: string,
  exampleWarehouseId?: string,
  exampleZoneId?: string,
  exampleBrandId?: string
): string {
  const headers = ALL_COLUMNS;

  // Example row 1: INDIVIDUAL tracking
  const example1 = [
    exampleCompanyId || '550e8400-e29b-41d4-a716-446655440000',
    exampleWarehouseId || '650e8400-e29b-41d4-a716-446655440001',
    exampleZoneId || '750e8400-e29b-41d4-a716-446655440002',
    'Premium Bar Counter',
    'Furniture',
    'INDIVIDUAL',
    '45.5',
    '120.0',
    '60.0',
    '90.0',
    '0.648',
    '', // packaging (empty for INDIVIDUAL)
    '1',
    exampleBrandId || '', // brand (optional)
    'High-quality wooden bar counter with LED lighting',
    'Fragile;HeavyLift',
    'https://example.com/img1.jpg;https://example.com/img2.jpg',
    'GREEN',
  ];

  // Example row 2: BATCH tracking
  const example2 = [
    exampleCompanyId || '550e8400-e29b-41d4-a716-446655440000',
    exampleWarehouseId || '650e8400-e29b-41d4-a716-446655440001',
    exampleZoneId || '750e8400-e29b-41d4-a716-446655440002',
    'Champagne Glasses Set',
    'Glassware',
    'BATCH',
    '12.0',
    '40.0',
    '40.0',
    '30.0',
    '0.048',
    'Box of 24 glasses', // packaging (required for BATCH)
    '24',
    exampleBrandId || '', // brand (optional)
    'Crystal champagne flutes',
    'Fragile',
    'https://example.com/glasses.jpg',
    'GREEN',
  ];

  // Generate CSV
  const csvData = Papa.unparse({
    fields: headers,
    data: [example1, example2],
  });

  return csvData;
}

/**
 * Download CSV template as file
 */
export function downloadCSVTemplate(
  exampleCompanyId?: string,
  exampleWarehouseId?: string,
  exampleZoneId?: string,
  exampleBrandId?: string
): void {
  const csv = generateCSVTemplate(
    exampleCompanyId,
    exampleWarehouseId,
    exampleZoneId,
    exampleBrandId
  );

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `asset-upload-template-${date}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export validation errors to CSV for offline fixing
 */
export function exportErrorsToCSV(
  errors: RowValidationError[],
  fileName: string = 'asset-upload-errors.csv'
): void {
  const csvData = errors.map((error) => ({
    row: error.row,
    errors: error.errors.join(' | '),
    count: error.errors.length,
  }));

  const csv = Papa.unparse(csvData);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Parse semicolon-separated array from CSV cell
 */
export function parseArrayField(value: string | undefined): string[] {
  if (!value || value.trim() === '') return [];
  return value
    .split(';')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
