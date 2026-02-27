// Inbound Request Types
// API endpoint: /client/v1/inbound-request

// Tracking method enum values
export type TrackingMethod = "INDIVIDUAL" | "BATCH";

// Inbound Request Status
export type InboundRequestStatus =
    | "PRICING_REVIEW"
    | "PENDING_APPROVAL"
    | "QUOTED"
    | "CONFIRMED"
    | "DECLINED"
    | "COMPLETED"
    | "CANCELLED";

// Inbound Request Item
export interface InboundRequestItem {
    id: string;
    asset?: {
        id: string;
        name: string;
        images: string[];
        qr_code: string;
        tracking_method: TrackingMethod;
        category: string;
        status: string;
        total_quantity: number;
        available_quantity: number;
    };
    asset_id: string | null;
    item_id?: string | null;
    inbound_request_id: string;
    brand_id: string | null;
    name: string;
    description: string | null;
    category: string;
    tracking_method: TrackingMethod;
    quantity: number;
    packaging: string | null;
    weight_per_unit: number;
    dimensions: {
        width: number;
        height: number;
        length: number;
    };
    volume_per_unit: number;
    handling_tags: string[];
    images: string[];
    created_asset_id: string | null;
    created_at: string;
    updated_at: string;
}

// Create Inbound Request Item (client-provided fields only)
export type CreateInboundRequestItem = Omit<
    InboundRequestItem,
    "id" | "inbound_request_id" | "created_asset_id" | "created_at" | "updated_at"
>;

// Create Inbound Request Payload
export interface CreateInboundRequestPayload {
    company_id?: string;
    note?: string;
    incoming_at: string;
    items: CreateInboundRequestItem[];
}

// Update Inbound Request Payload (partial update with PATCH)
export interface UpdateInboundRequestPayload {
    company_id?: string;
    note?: string;
    incoming_at?: string;
    items?: CreateInboundRequestItem[];
    status?: InboundRequestStatus;
}

// Complete Inbound Request Payload
export interface CompleteInboundRequestPayload {
    warehouse_id: string;
    zone_id: string;
}

// List Response
export interface InboundRequestListResponse {
    success: true;
    data: InboundRequestDetails[];
    total: number;
    limit: number;
    offset: number;
}

// Single Response
export interface InboundRequestResponse {
    success: true;
    data: InboundRequestDetails;
}

export interface InboundRequestDetailsResponse {
    success: true;
    data: InboundRequestDetails;
}

export interface InboundRequestDetails {
    id: string;
    inbound_request_id: string;
    platform_id: string;
    incoming_at: string;
    note: string | null;
    request_status: string;
    financial_status: string;
    company: {
        id: string;
        name: string;
    };
    requester: {
        id: string;
        name: string;
        email: string;
    };
    request_pricing: {
        breakdown_lines?: Array<{
            line_id: string;
            line_kind?: "BASE_OPS" | "RATE_CARD" | "CUSTOM";
            label: string;
            quantity: number;
            unit: string;
            buy_unit_price?: number;
            buy_total?: number;
            sell_unit_price?: number;
            sell_total?: number;
            billing_mode?: string;
            is_voided?: boolean;
        }>;
        base_ops_total?: string | number;
        logistics_sub_total?: string | number;
        service_fee?: string | number;
        final_total: string | number;
        line_items?: {
            custom_total: number;
            catalog_total: number;
        };
        margin?: {
            amount: number;
            percent: string | number;
            is_override: boolean;
            override_reason: string | null;
        };
        margin_policy?: {
            percent: number;
            is_override: boolean;
            override_reason: string | null;
        };
        totals?: Record<string, number>;
        calculated_by: string;
        calculated_at: string;
    };
    items: InboundRequestItem[];
    created_at: string;
    updated_at: string;
}
