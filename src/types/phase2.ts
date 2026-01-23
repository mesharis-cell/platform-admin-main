/**
 * Phase 2: Multi-Tenancy & Core Configuration Types
 * TypeScript types for companies, warehouses, zones, and brands
 */

// ============================================================
// Company Types
// ============================================================

// eslint-disable-next-line import/export
export interface Company {
    id: string;
    platform_id: string;
    name: string;
    domain: string;
    platform_margin_percent: number;
    contact_email: string;
    contact_phone: string;
    settings: {
        branding: {
            title: string;
            primary_color: string;
            secondary_color: string;
            logo_url: string;
        };
    };
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    domains: [
        {
            id: string;
            platform_id: string;
            company_id: string;
            hostname: string;
            type: string;
            is_verified: boolean;
            is_active: boolean;
            created_at: Date;
            updated_at: Date;
        },
    ];
}

export interface CreateCompanyRequest {
    name: string;
    domain: string;
    platform_margin_percent?: number;
    contact_email?: string;
    contact_phone?: string;
    settings?: {
        branding: {
            title?: string;
            primary_color?: string;
            secondary_color?: string;
            logo_url?: string;
        };
    };
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
    data: Company[];
    meta: {
        total: number;
        limit: number;
        page: number;
    };
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
    coordinates?: {
        lat: number;
        lng: number;
    };
    createdAt: Date;
    updatedAt: Date;
    is_active?: boolean;
}

export interface CreateWarehouseRequest {
    name: string;
    country: string;
    city: string;
    address: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}

export interface UpdateWarehouseRequest {
    name?: string;
    country?: string;
    city?: string;
    address?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
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
    data: Warehouse[];
    meta: {
        total: number;
        limit: number;
        page: number;
    };
}

// ============================================================
// Zone Types
// ============================================================

export interface Zone {
    id: string;
    warehouse: Warehouse; // UUID reference
    company: Company; // UUID reference
    name: string;
    capacity?: number;
    description?: string | null;
    is_active?: boolean;
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
    data: Zone[];
    meta: {
        total: number;
        limit: number;
        page: number;
    };
}

// ============================================================
// Brand Types
// ============================================================

export interface Brand {
    id: string;
    company_id: string; // UUID reference
    company: Company;
    name: string;
    description?: string | null;
    logoUrl?: string | null;
    is_active?: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Populated from joins
    companyName?: string;
}

export interface CreateBrandRequest {
    company_id: string;
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
    data: Brand[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
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
