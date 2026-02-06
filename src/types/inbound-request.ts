// Inbound Request Types
// API endpoint: /client/v1/inbound-request

// Tracking method enum values
export type TrackingMethod = "INDIVIDUAL" | "BATCH";

// Inbound Request Status
export type InboundRequestStatus = "PENDING" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

// Inbound Request Item
export interface InboundRequestItem {
    id: string;
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

// Full Inbound Request Entity (from API response)
export interface InboundRequestList {
    id: string;
    platform_id: string;
    incoming_at: string;
    note: string | null;
    request_status: string;
    financial_status: string;
    company: {
        id: string;
        name: string;
    },
    requester: {
        id: string;
        name: string;
        email: string;
    },
    request_pricing: {
        final_total: string;
    },
    created_at: string;
    updated_at: string;
}

// Create Inbound Request Item (client-provided fields only)
export type CreateInboundRequestItem = Omit<InboundRequestItem, "id" | "inbound_request_id" | "created_asset_id" | "created_at" | "updated_at">;

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

// List Response
export interface InboundRequestListResponse {
    success: true;
    data: InboundRequestList[];
    total: number;
    limit: number;
    offset: number;
}

// Single Response
export interface InboundRequestResponse {
    success: true;
    data: InboundRequestList;
}

export interface InboundRequestDetailsResponse {
    success: true;
    data: InboundRequestDetails;
}

export interface InboundRequestDetails {
    id: string;
    platform_id: string;
    incoming_at: string;
    note: string | null;
    request_status: string;
    financial_status: string;
    company: {
        id: string;
        name: string;
    },
    requester: {
        id: string;
        name: string;
        email: string;
    },
    request_pricing: {
        final_total: string;
    },
    items: InboundRequestItem[];
    created_at: string;
    updated_at: string;
}