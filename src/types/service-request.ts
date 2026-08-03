// RL-011 — `UPLIFT` is a legal `service_request_type` from migration 0076 on, but
// it is NOT creatable here: the generic create routes reject it with 409 and
// `POST /client/v1/order/:id/uplift` is the only writer that may create one.
// Keep it out of any "creatable types" list; it belongs only in filters and
// read surfaces.
export type ServiceRequestType = "MAINTENANCE" | "RESKIN" | "REFURBISHMENT" | "CUSTOM" | "UPLIFT";

export type ServiceRequestStatus =
    | "DRAFT"
    | "SUBMITTED"
    | "IN_REVIEW"
    | "APPROVED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";

export type ServiceRequestCommercialStatus =
    | "INTERNAL"
    | "PENDING_QUOTE"
    | "QUOTED"
    | "QUOTE_APPROVED"
    | "INVOICED"
    | "PAID"
    | "CANCELLED";

export type ServiceRequestBillingMode = "INTERNAL_ONLY" | "CLIENT_BILLABLE";
export type ServiceRequestLinkMode =
    | "STANDALONE"
    | "BUNDLED_WITH_ORDER"
    | "SEPARATE_CHANGE_REQUEST";

export interface ServiceRequestItem {
    id: string;
    service_request_id: string;
    asset_id: string | null;
    asset_name: string;
    quantity: number;
    notes: string | null;
    refurb_days_estimate: number | null;
    created_at: string;
    updated_at: string;
}

export interface ServiceRequestStatusHistoryEntry {
    id: string;
    from_status: ServiceRequestStatus | null;
    to_status: ServiceRequestStatus;
    note: string | null;
    changed_at: string;
    changed_by: string;
    changed_by_user: {
        id: string;
        name: string;
    } | null;
}

export interface ServiceRequest {
    id: string;
    service_request_id: string;
    platform_id: string;
    company_id: string;
    request_type: ServiceRequestType;
    billing_mode: ServiceRequestBillingMode;
    link_mode: ServiceRequestLinkMode;
    blocks_fulfillment: boolean;
    request_status: ServiceRequestStatus;
    commercial_status: ServiceRequestCommercialStatus;
    title: string;
    description: string | null;
    related_asset_id: string | null;
    related_order_id: string | null;
    related_order_item_id: string | null;
    request_pricing_id: string | null;
    fulfillment_override_reason: string | null;
    fulfillment_override_approved_by: string | null;
    fulfillment_override_applied_at: string | null;
    requested_start_at: string | null;
    requested_due_at: string | null;
    // Uplift lifecycle timestamps (migration 0078, RL-010). Only ever set on
    // `request_type = "UPLIFT"`; null on every other request.
    uplift_requested_at?: string | null;
    uplift_approved_at?: string | null;
    // Unified 4-entity waiver. Rejected for an uplift in this release (RL-013).
    pricing_mode?: "STANDARD" | "NO_COST" | null;
    is_repair_before_event?: boolean;
    created_by: string;
    completed_at: string | null;
    completed_by: string | null;
    completion_notes: string | null;
    cancelled_at: string | null;
    cancelled_by: string | null;
    cancellation_reason: string | null;
    created_at: string;
    updated_at: string;
    items?: ServiceRequestItem[];
    status_history?: ServiceRequestStatusHistoryEntry[];
}

export interface ServiceRequestListResponse {
    success: boolean;
    message: string;
    data: ServiceRequest[];
    meta: {
        page: number;
        limit: number;
        total: number;
    };
}

export interface ServiceRequestDetailsResponse {
    success: boolean;
    message: string;
    data: ServiceRequest;
}

export interface ListServiceRequestsParams {
    page?: number;
    limit?: number;
    search_term?: string;
    company_id?: string;
    request_status?: ServiceRequestStatus;
    request_type?: ServiceRequestType;
    billing_mode?: ServiceRequestBillingMode;
    repair_before_event?: boolean;
}

export interface ServiceRequestItemInput {
    asset_id?: string;
    asset_name: string;
    quantity?: number;
    notes?: string;
    refurb_days_estimate?: number;
}

export interface CreateServiceRequestPayload {
    company_id?: string;
    request_type: ServiceRequestType;
    billing_mode: ServiceRequestBillingMode;
    link_mode?: ServiceRequestLinkMode;
    blocks_fulfillment?: boolean;
    title: string;
    description?: string;
    related_asset_id?: string;
    related_order_id?: string;
    related_order_item_id?: string;
    requested_start_at?: string;
    requested_due_at?: string;
    items: ServiceRequestItemInput[];
}

export interface UpdateServiceRequestPayload {
    billing_mode?: ServiceRequestBillingMode;
    link_mode?: ServiceRequestLinkMode;
    blocks_fulfillment?: boolean;
    title?: string;
    description?: string;
    related_asset_id?: string | null;
    related_order_id?: string | null;
    related_order_item_id?: string | null;
    requested_start_at?: string | null;
    requested_due_at?: string | null;
    items?: ServiceRequestItemInput[];
}

export interface UpdateServiceRequestStatusPayload {
    to_status: ServiceRequestStatus;
    note?: string;
    completion_notes?: string;
}

export interface UpdateServiceRequestCommercialStatusPayload {
    commercial_status: ServiceRequestCommercialStatus;
    note?: string;
    /**
     * Carried by `service_request.quote_revised` and the client's revised-quote
     * mail on a QUOTED -> PENDING_QUOTE move
     * (`api .../service-request.services.ts:1022`). Accepted by the route's
     * schema (`service-request.schemas.ts:93`) and ignored on every other
     * transition.
     */
    revision_reason?: string;
}

export interface RespondServiceRequestQuotePayload {
    action: "APPROVE" | "DECLINE" | "REQUEST_REVISION";
    note?: string;
}

export interface ApplyServiceRequestFulfillmentOverridePayload {
    reason: string;
}

export interface CancelServiceRequestPayload {
    cancellation_reason: string;
}
