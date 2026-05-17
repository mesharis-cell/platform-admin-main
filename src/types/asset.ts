// Asset Management types (post-squash)
// Family entity replaced by an opaque group_id correlation key on every asset.
// Display label denormalized as group_name. stock_mode (SERIALIZED|POOLED) replaces tracking_method.

export interface AssetImage {
    url: string;
    note?: string;
}

// Tracking Method legacy alias kept for incremental cleanup; new code should use StockMode.
export type StockMode = "SERIALIZED" | "POOLED";

// Condition
export type Condition = "GREEN" | "ORANGE" | "RED";

// Asset Status
export type AssetStatus = "AVAILABLE" | "BOOKED" | "OUT" | "MAINTENANCE" | "TRANSFORMED";

// Handling Tags
export type HandlingTag = "Fragile" | "HighValue" | "HeavyLift" | "AssemblyRequired";

// Asset Categories
export type AssetCategory = "Furniture" | "Glassware" | "Installation" | "Decor";

// Asset entity
export interface Asset {
    id: string;
    // group identity (post-squash)
    group_id?: string | null;
    groupId?: string | null;
    group_name?: string | null;
    groupName?: string | null;
    group_images?: AssetImage[];
    group_on_display_image?: string | null;
    /** @deprecated post-squash shim — always null. Use group_id/group_name. */
    family?: null;
    /** @deprecated post-squash shim — kept on Asset type so old UI compiles. Always null. */
    family_id?: string | null;
    /** @deprecated post-squash shim — always null. */
    familyId?: string | null;
    company: {
        id: string;
        name: string;
    };
    brand?: {
        id: string;
        name: string;
    };
    warehouse: {
        id: string;
        name: string;
        city: string;
        country: string;
    };
    zone: {
        id: string;
        name: string;
    };
    condition_history: {
        notes: string;
        condition: Condition;
        updated_by: string;
        timestamp: string;
        photos?: string[];
        damage_report_entries?: Array<{
            url: string;
            description?: string;
        }>;
    }[];
    brand_id: string | null;
    name: string;
    weight_per_unit: number;
    description?: string;
    category: AssetCategory;
    images: AssetImage[];
    stock_mode: StockMode;
    low_stock_threshold?: number | null;
    total_quantity: number;
    available_quantity: number;
    qr_code: string;
    packaging?: string;
    weight: number; // kg
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    volume_per_unit: number; // m³
    condition: Condition;
    status: AssetStatus;
    refurb_days_estimate?: number | null;
    handling_tags: string[];
    last_scanned_at?: string;
    last_scanned_by?: string;
    deleted_at?: string;
    created_at: string;
    updated_at: string;
}

// Asset with related entity details (for detail view)
export interface AssetWithDetails extends Asset {
    latestConditionNotes?: string;
    companyDetails: {
        id: string;
        name: string;
    };
    brandDetails?: {
        id: string;
        name: string;
    };
    warehouseDetails: {
        id: string;
        name: string;
        city: string;
    };
    zoneDetails: {
        id: string;
        name: string;
    };
    conditionHistory: AssetConditionHistoryEntry[];
}

// Asset Condition History Entry
export interface AssetConditionHistoryEntry {
    id: string;
    asset: string;
    condition: Condition;
    notes?: string;
    photos: string[];
    damage_report_entries?: Array<{
        url: string;
        description?: string;
    }>;
    updatedBy: string;
    timestamp: string;
}

// Create Asset Request
export interface CreateAssetRequest {
    company_id: string;
    brand_id?: string;
    group_id?: string | null;
    is_part_of_group?: boolean;
    group_name?: string | null;
    group_images?: AssetImage[];
    group_on_display_image?: string | null;
    warehouse_id: string;
    zone_id: string;
    name: string;
    description?: string;
    category: AssetCategory;
    images: AssetImage[];
    stock_mode: StockMode;
    low_stock_threshold?: number | null;
    total_quantity: number;
    available_quantity: number;
    packaging?: string; // required if POOLED
    weight_per_unit: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    };
    volume_per_unit: number;
    condition?: Condition;
    condition_notes?: string;
    team_id?: string | null;
    handling_tags?: string[];
    refurb_days_estimate?: number;
    status?: AssetStatus;
}

// Update Asset Request
export interface UpdateAssetRequest {
    brand_id?: string;
    group_id?: string | null;
    group_name?: string | null;
    warehouse_id?: string;
    zone_id?: string;
    name?: string;
    description?: string;
    category?: AssetCategory;
    images?: AssetImage[];
    totalQuantity?: number;
    packaging?: string;
    stock_mode?: StockMode;
    low_stock_threshold?: number | null;
    weight?: number;
    dimensionLength?: number;
    dimensionWidth?: number;
    dimensionHeight?: number;
    volume?: number;
    condition?: Condition;
    refurbDaysEstimate?: number | null;
    conditionNotes?: string;
    handlingTags?: string[];
}

// Bulk-group request
export interface BulkGroupAssetsRequest {
    asset_ids: string[]; // min 2
    target_group_id?: string;
    group_name: string;
}

// Asset List Query Parameters
export interface AssetListParams {
    company?: string;
    brand?: string;
    warehouse?: string;
    zone?: string;
    category?: AssetCategory;
    condition?: Condition;
    status?: AssetStatus;
    stock_mode?: StockMode;
    group_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

// Asset List Response
export interface AssetListResponse {
    success: true;
    assets: Asset[];
    total: number;
    limit: number;
    offset: number;
}

// Generate QR Code Request
export interface GenerateQRCodeRequest {
    qrCode: string;
}

// Generate QR Code Response
export interface GenerateQRCodeResponse {
    success: true;
    qrCodeImage: string;
}

// Upload Image Response
export interface UploadImageResponse {
    success: true;
    imageUrl: string;
}

// API Success Response
export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data?: T;
    message?: string;
}

// API Error Response
export interface ApiErrorResponse {
    success: false;
    error: string;
    details?: unknown;
}

export interface AssetsDetails {
    id: string;
    platform_id: string;
    company_id: string;
    warehouse_id: string;
    zone_id: string;
    brand_id: string | null;
    group_id?: string | null;
    groupId?: string | null;
    group_name?: string | null;
    groupName?: string | null;

    name: string;
    description: string | null;
    category: string;

    images: AssetImage[];
    on_display_image: string | null;
    group_images?: AssetImage[];
    group_on_display_image?: string | null;

    stock_mode: StockMode;
    low_stock_threshold: number | null;

    total_quantity: number;
    available_quantity: number;

    qr_code: string;
    packaging: string | null;

    weight_per_unit: number;
    volume_per_unit: number;

    dimensions: {
        length: number;
        width: number;
        height: number;
    };

    condition: Condition;
    condition_notes: string | null;
    refurb_days_estimate: number | null;

    condition_history: {
        notes: string;
        condition: Condition;
        updated_by: string;
        timestamp: string;
        photos?: string[];
        damage_report_entries?: Array<{
            url: string;
            description?: string;
        }>;
    }[];
    handling_tags: string[];

    status: AssetStatus;

    last_scanned_at: string | null;
    last_scanned_by: string | null;

    created_at: string;
    updated_at: string;
    deleted_at: string | null;

    company: {
        id: string;
        name: string;
        domain: string;
    };
    warehouse: {
        id: string;
        name: string;
        city: string;
        country: string;
    };
    zone: {
        id: string;
        name: string;
    };
    brand: {
        id: string;
        name: string;
        logo_url: string;
    };
}
