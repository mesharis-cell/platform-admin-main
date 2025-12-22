/**
 * Phase 2: Multi-Tenancy & Core Configuration Types
 * TypeScript types for companies, warehouses, zones, and brands
 */

// ============================================================
// Company Types
// ============================================================

export interface Company {
	id: string;
	name: string;
	description?: string | null;
	logoUrl?: string | null;
	pmgMarginPercent: string; // Decimal stored as string
	contactEmail?: string | null;
	contactPhone?: string | null;
	archivedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateCompanyRequest {
	name: string;
	description?: string;
	logoUrl?: string;
	pmgMarginPercent?: number; // Accepts number, will be formatted to 2 decimals
	contactEmail?: string;
	contactPhone?: string;
}

export interface UpdateCompanyRequest {
	name?: string;
	description?: string;
	logoUrl?: string;
	pmgMarginPercent?: number; // Accepts number, will be formatted to 2 decimals
	contactEmail?: string;
	contactPhone?: string;
}

export interface CompanyListParams {
	includeArchived?: boolean;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface CompanyListResponse {
	companies: Company[];
	total: number;
	limit: number;
	offset: number;
}

// ============================================================
// Warehouse Types
// ============================================================

export interface Warehouse {
	id: string;
	name: string;
	country: string;
	city: string;
	address: string;
	archivedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateWarehouseRequest {
	name: string;
	country: string;
	city: string;
	address: string;
}

export interface UpdateWarehouseRequest {
	name?: string;
	country?: string;
	city?: string;
	address?: string;
}

export interface WarehouseListParams {
	includeArchived?: boolean;
	country?: string;
	city?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface WarehouseListResponse {
	warehouses: Warehouse[];
	total: number;
	limit: number;
	offset: number;
}

// ============================================================
// Zone Types
// ============================================================

export interface Zone {
	id: string;
	warehouse: string; // UUID reference
	company: string; // UUID reference
	name: string;
	description?: string | null;
	deletedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
	// Populated from joins
	warehouseName?: string;
	companyName?: string;
}

export interface CreateZoneRequest {
	warehouse: string;
	company: string;
	name: string;
	description?: string;
}

export interface UpdateZoneRequest {
	warehouse?: string;
	company?: string;
	name?: string;
	description?: string;
}

export interface ZoneListParams {
	warehouse?: string;
	company?: string;
	includeDeleted?: boolean;
	limit?: number;
	offset?: number;
}

export interface ZoneListResponse {
	zones: Zone[];
	total: number;
	limit: number;
	offset: number;
}

// ============================================================
// Brand Types
// ============================================================

export interface Brand {
	id: string;
	company: string; // UUID reference
	name: string;
	description?: string | null;
	logoUrl?: string | null;
	deletedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
	// Populated from joins
	companyName?: string;
}

export interface CreateBrandRequest {
	company: string;
	name: string;
	description?: string;
	logoUrl?: string;
}

export interface UpdateBrandRequest {
	name?: string;
	description?: string;
	logoUrl?: string;
	// company cannot be changed
}

export interface BrandListParams {
	company?: string;
	includeDeleted?: boolean;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface BrandListResponse {
	brands: Brand[];
	total: number;
	limit: number;
	offset: number;
}

// ============================================================
// Validation Error Types
// ============================================================

export interface ValidationError {
	field: string;
	message: string;
}

export interface ApiError {
	error: string;
	details?: ValidationError[];
}
