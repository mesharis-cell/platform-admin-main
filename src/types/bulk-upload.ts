/**
 * Bulk Asset Upload Types
 * Types for CSV-based mass asset import
 */

export interface CSVAssetRow {
    id?: string;
    company: string;
    warehouse: string;
    zone: string;
    name: string;
    category: string;
    tracking_method: string;
    weight: string;
    dimensions: {
        length: string;
        width: string;
        height: string;
    };
    qr_code?: string;
    volume: string;
    packaging?: string;
    total_quantity: string;
    brand?: string;
    description?: string;
    handling_tags?: string;
    images?: string;
    condition?: string;
}

export interface ParsedCSVRow extends CSVAssetRow {
    rowNumber: number;
}

export interface RowValidationError {
    row: number;
    errors: string[];
}

export interface ValidationResult {
    isValid: boolean;
    fileErrors: string[];
    rowErrors: RowValidationError[];
    validRows: ParsedCSVRow[];
    totalErrors: number;
    totalRows: number;
}

export interface BulkUploadResponse {
    success: boolean;
    data?: {
        created: number;
        assets: Array<{ id: string; name: string; qrCode: string }>;
    };
    error?: string;
    details?: {
        fileErrors: string[];
        rowErrors: RowValidationError[];
        totalErrors: number;
        totalRows: number;
    };
}

export interface ForeignKeyCache {
    companies: Map<string, { exists: boolean; archived: boolean }>;
    warehouses: Map<string, { exists: boolean; archived: boolean }>;
    zones: Map<string, { exists: boolean; company: string; deleted: boolean }>;
    brands: Map<string, { exists: boolean; company: string; deleted: boolean }>;
}

export interface ValidatedAssetData {
    company: string;
    warehouse: string;
    zone: string;
    name: string;
    category: string;
    trackingMethod: "INDIVIDUAL" | "BATCH";
    weight: number;
    dimensionLength: number;
    dimensionWidth: number;
    dimensionHeight: number;
    volume: number;
    packaging: string | null;
    totalQuantity: number;
    brand: string | null;
    description: string | null;
    handlingTags: string[];
    images: string[];
    condition: "GREEN" | "ORANGE" | "RED";
}
