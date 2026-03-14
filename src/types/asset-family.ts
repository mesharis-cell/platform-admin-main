import type { AssetImage, StockMode } from "./asset";

export interface AssetFamilySummary {
    available: number;
    booked: number;
    out: number;
    maintenance: number;
    transformed: number;
}

export interface AssetFamilyConditionSummary {
    green: number;
    orange: number;
    red: number;
}

export interface AssetFamily {
    id: string;
    platform_id: string;
    company_id: string;
    brand_id: string | null;
    team_id: string | null;
    name: string;
    description: string | null;
    category: string;
    images: AssetImage[];
    on_display_image: string | null;
    stock_mode: StockMode;
    packaging: string | null;
    weight_per_unit: number | string | null;
    dimensions: {
        length?: number;
        width?: number;
        height?: number;
    };
    volume_per_unit: number | string | null;
    handling_tags: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    company?: {
        id: string | null;
        name: string | null;
    } | null;
    brand?: {
        id: string | null;
        name: string | null;
    } | null;
    team?: {
        id: string | null;
        name: string | null;
    } | null;
    asset_count?: number;
    stock_record_count?: number;
    total_quantity?: number;
    available_quantity?: number;
    status_summary?: AssetFamilySummary;
    condition_summary?: AssetFamilyConditionSummary;
}
