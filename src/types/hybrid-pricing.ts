/**
 * Hybrid Pricing System Types
 * Types for pricing config, transport rates, service types, and order line items
 */

// ============================================================
// Transport Rates
// ============================================================

export type TripType = "ONE_WAY" | "ROUND_TRIP";

// ============================================================
// Service Types
// ============================================================

export type ServiceCategory =
    | "ASSEMBLY"
    | "EQUIPMENT"
    | "HANDLING"
    | "RESKIN"
    | "TRANSPORT"
    | "OTHER";

export interface ServiceType {
    id: string;
    platformId: string;
    name: string;
    category: ServiceCategory;
    unit: string;
    default_rate: number | null;
    description: string | null;
    display_order: number;
    is_active: boolean;
    // Default margin policy for lines created from this service type.
    // When false, new CATALOG lines default to NULL apply_margin which
    // resolves to false at projection time.
    apply_margin: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateServiceTypeRequest {
    name: string;
    category: ServiceCategory;
    unit: string;
    default_rate?: number | null;
    description?: string;
    display_order?: number;
    is_active?: boolean;
    apply_margin?: boolean;
}

export interface UpdateServiceTypeRequest {
    name?: string;
    unit?: string;
    defaultRate?: number | null;
    description?: string;
    displayOrder?: number;
    isActive?: boolean;
    applyMargin?: boolean;
}

// ============================================================
// Order Line Items
// ============================================================

export type LineItemType = "CATALOG" | "CUSTOM" | "SYSTEM";
export type PurposeType = "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP";
export type LineItemBillingMode = "BILLABLE" | "NON_BILLABLE" | "COMPLIMENTARY";
export type LineItemRequestStatus = "REQUESTED" | "APPROVED" | "REJECTED";
export type TransportTripLeg = "DELIVERY" | "PICKUP" | "ACCESS" | "TRANSFER";

export interface TransportLineItemMetadata {
    [key: string]: unknown;
}

export interface OrderLineItem {
    id: string;
    platformId: string;
    orderId: string;
    serviceTypeId: string | null;
    lineItemType: LineItemType;
    // `systemLineKeyEnum` keeps BASE_OPS forever (PG enums don't shrink) and the
    // future AUTO_FEE handler (PLAN §11) adds more keys — so this is `string | null`,
    // not a closed BASE_OPS union. (P0 review LOW note: converge admin+warehouse+client.)
    systemKey?: string | null;
    category: ServiceCategory;
    description: string;
    quantity: number | null;
    unit: string | null;
    unitRate: number | null;
    total: number;
    buy_unit_rate?: number;
    buy_total?: number;
    // Per-unit sell override (ADMIN-only). NULL / absent = blanket-margin math.
    // Note: the list endpoint runs mapArraySnakeToCamel, so at runtime this
    // arrives as `sellUnitRate`. Both keys are declared so either read compiles.
    sell_unit_rate?: number | null;
    sellUnitRate?: number | null;
    sell_total?: number;
    addedBy: string;
    // Resolved actor display name (API batched user-name join, added_by_name).
    // Absent/null → fall back to addedBy (the raw user id).
    addedByName?: string | null;
    addedAt: string;
    notes: string | null;
    billingMode?: LineItemBillingMode;
    metadata?: TransportLineItemMetadata | Record<string, unknown> | null;
    clientPriceVisible?: boolean;
    // When false, server strips this line from LOGISTICS projections + list.
    logisticsVisible?: boolean;
    canEditPricingFields?: boolean;
    canEditMetadataFields?: boolean;
    lockReason?: string | null;
    isVoided: boolean;
    voidedAt: string | null;
    voidedBy: string | null;
    voidReason: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCatalogLineItemRequest {
    order_id?: string;
    inbound_request_id?: string;
    service_request_id?: string;
    self_pickup_id?: string;
    purpose_type: PurposeType;
    service_type_id: string;
    quantity: number;
    notes?: string;
    billing_mode?: LineItemBillingMode;
    metadata?: Record<string, unknown>;
    logistics_visible?: boolean;
    // Per-unit sell override (ADMIN-only, BILLABLE-only). Accepted directly at
    // catalog-create since Phase 1 — kills the old create-then-PUT loop. Omit =
    // no override (server seed-derives from prices.margin_percent).
    sell_unit_rate?: number | null;
}

export interface CreateCustomLineItemRequest {
    order_id?: string;
    inbound_request_id?: string;
    service_request_id?: string;
    self_pickup_id?: string;
    purpose_type: PurposeType;
    description: string;
    category: ServiceCategory;
    quantity: number;
    unit: string;
    unit_rate: number;
    notes?: string;
    billing_mode?: LineItemBillingMode;
    metadata?: Record<string, unknown>;
    logistics_visible?: boolean;
    // Per-unit sell override (ADMIN-only). Omit = no override; null = clear.
    sell_unit_rate?: number | null;
}

export interface UpdateLineItemRequest {
    quantity?: number;
    unit?: string;
    unitRate?: number;
    notes?: string;
    billingMode?: LineItemBillingMode;
    metadata?: Record<string, unknown>;
    clientPriceVisible?: boolean;
    logisticsVisible?: boolean;
    // Per-unit sell override (ADMIN-only). Mapped to sell_unit_rate by the
    // update hook (mapCamelToSnake). number = set override, null = clear it,
    // OMITTED = untouched (no change). Never send `undefined` — the API schema
    // is .strict() and undefined would still emit a sell_unit_rate key.
    sellUnitRate?: number | null;
}

export interface PatchLineItemMetadataRequest {
    notes?: string;
    metadata?: Record<string, unknown>;
}

// Combined visibility patch. The audience chip on the line items list
// fires this with one or both flags. Server requires at least one.
export interface PatchLineItemVisibilityRequest {
    clientPriceVisible?: boolean;
    logisticsVisible?: boolean;
}

export interface PatchEntityLineItemVisibilityRequest {
    purposeType: PurposeType;
    orderId?: string;
    inboundRequestId?: string;
    serviceRequestId?: string;
    selfPickupId?: string;
    clientPriceVisible?: boolean;
    logisticsVisible?: boolean;
    lineItemIds?: string[];
}

export interface VoidLineItemRequest {
    void_reason: string;
}

export interface LineItemRequest {
    id: string;
    lineItemRequestId: string;
    platformId: string;
    companyId: string;
    purposeType: PurposeType;
    orderId: string | null;
    inboundRequestId: string | null;
    serviceRequestId: string | null;
    status: LineItemRequestStatus;
    description: string;
    category: ServiceCategory;
    quantity: number;
    unit: string;
    unitRate: number;
    notes: string | null;
    reviewedDescription: string | null;
    reviewedCategory: ServiceCategory | null;
    reviewedQuantity: number | null;
    reviewedUnit: string | null;
    reviewedUnitRate: number | null;
    reviewedNotes: string | null;
    approvedBillingMode: LineItemBillingMode | null;
    adminNote: string | null;
    requestedBy: string;
    resolvedBy: string | null;
    resolvedAt: string | null;
    approvedLineItemId: string | null;
    createdServiceTypeId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLineItemRequestPayload {
    purposeType: PurposeType;
    orderId?: string;
    inboundRequestId?: string;
    serviceRequestId?: string;
    description: string;
    category: ServiceCategory;
    quantity: number;
    unit: string;
    unitRate: number;
    notes?: string;
}

export interface ApproveLineItemRequestPayload {
    description?: string;
    category?: ServiceCategory;
    quantity?: number;
    unit?: string;
    unitRate?: number;
    notes?: string;
    billingMode?: LineItemBillingMode;
    adminNote?: string;
    // LIR approval is a full commercial decision (PLAN decision 6): the admin can
    // set the created line's per-line sell rate + client visibility. sellUnitRate
    // absent/null → seed-derived sell (server margin math); only valid on BILLABLE
    // lines (API rejects otherwise). clientPriceVisible defaults false.
    sellUnitRate?: number | null;
    clientPriceVisible?: boolean;
}

export interface RejectLineItemRequestPayload {
    adminNote: string;
}

export interface OrderTransportTrip {
    id: string;
    platformId: string;
    orderId: string;
    legType: TransportTripLeg;
    truckPlate: string | null;
    driverName: string | null;
    driverContact: string | null;
    truckSize: string | null;
    manpower: number | null;
    tailgateRequired: boolean;
    notes: string | null;
    sequenceNo: number;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateOrderTransportTripPayload {
    legType: TransportTripLeg;
    truckPlate?: string;
    driverName?: string;
    driverContact?: string;
    truckSize?: string;
    manpower?: number;
    tailgateRequired?: boolean;
    notes?: string;
    sequenceNo?: number;
}

export interface UpdateOrderTransportTripPayload {
    legType?: TransportTripLeg;
    truckPlate?: string;
    driverName?: string;
    driverContact?: string;
    truckSize?: string;
    manpower?: number;
    tailgateRequired?: boolean;
    notes?: string;
    sequenceNo?: number;
}

// ============================================================
// Order Pricing Structure (NEW)
// ============================================================

// Per-line snapshot row carried in OrderPricing.breakdown_lines.
// The same shape is used for all three role projections; some fields are
// nulled per role (e.g. total = null for client-hidden lines).
export interface BreakdownLine {
    line_id: string;
    line_kind?: "SYSTEM" | "RATE_CARD" | "CUSTOM";
    category?: string;
    label: string;
    quantity: number;
    unit: string;
    buy_unit_price?: number;
    buy_total?: number;
    sell_unit_price?: number;
    sell_total?: number;
    // ADMIN-only "override active" marker. NULL = today's blanket-margin math;
    // a number = admin set a per-unit sell override on this line.
    sell_unit_rate_override?: number | null;
    unit_price?: number | null;
    total?: number | null;
    billing_mode?: string;
    client_price_visible?: boolean;
    logistics_visible?: boolean;
    is_voided?: boolean;
    notes?: string | null;
}

export interface OrderPricing {
    breakdown_lines?: BreakdownLine[];
    totals?: {
        buy_system_total?: number;
        buy_rate_card_total?: number;
        buy_custom_total?: number;
        buy_total?: number;
        sell_system_total?: number;
        sell_rate_card_total?: number;
        sell_custom_total?: number;
        sell_total?: number;
        margin_amount?: number;
        subtotal?: number;
        vat_percent?: number;
        vat_amount?: number;
        sell_total_with_vat?: number;
        system_total?: number;
        rate_card_total?: number;
        custom_total?: number;
        total?: number;
    };
    margin_policy?: {
        percent: number;
        is_override: boolean;
        override_reason: string | null;
    };
    system_total: number;
    sell?: {
        system_total: number;
        subtotal?: number;
        vat_amount?: number;
        final_total: number;
    };
    line_items?: {
        catalog_total: number;
        custom_total: number;
    };
    margin?: {
        percent: number;
        amount: number;
        is_override: boolean;
        override_reason: string | null;
    };
    margin_percent?: number;
    vat?: {
        percent: number;
        amount: number;
    };
    subtotal?: number | string;
    final_total: number | string;
    calculated_at?: string;
    // ADMIN-only payload. The API embeds all three role projections so the
    // breakdown card can render Logistics + Client tabs without extra calls,
    // and the preview is 1:1 with what each role actually receives.
    // Absent on non-admin responses.
    projections?: {
        admin: OrderPricing | null;
        logistics: OrderPricing | null;
        client: OrderPricing | null;
    };
}

// ============================================================
// Role-Preview (Pricing Ledger)
// ============================================================

export type PreviewRole = "CLIENT" | "LOGISTICS";

/**
 * Response of `GET /operations/v1/pricing/:purposeType/:entityId/preview?role=`.
 *
 * ADMIN-only. Carries BOTH the admin edit lens (`admin.pricing` money projection
 * + `admin.line_items` full editable rows) AND the requested preview role's
 * server projection (`preview.pricing` + `preview.line_items`) — produced by the
 * SAME functions the real role payloads use, so it stays the single leak gate.
 * `admin.pricing` / `preview.pricing` are `null` when the entity is not priced yet.
 */
export interface PricingPreviewResponse {
    purpose_type: PurposeType;
    entity_id: string;
    role: PreviewRole;
    pricing_mode: "STANDARD" | "NO_COST";
    admin: {
        pricing: OrderPricing | null;
        line_items: OrderLineItem[];
    };
    preview: {
        role: PreviewRole;
        pricing: OrderPricing | null;
        line_items: OrderLineItem[];
    };
}

// ============================================================
// Reskin Requests
// ============================================================

export type ReskinStatus = "pending" | "complete" | "cancelled";

export interface ReskinRequest {
    id: string;
    platformId: string;
    orderId: string;
    orderItemId: string;
    originalAssetId: string;
    originalAssetName: string;
    targetBrandId: string | null;
    targetBrandCustom: string | null;
    clientNotes: string;
    adminNotes: string | null;
    newAssetId: string | null;
    newAssetName: string | null;
    completedAt: string | null;
    completedBy: string | null;
    completionNotes: string | null;
    completionPhotos: string[];
    cancelledAt: string | null;
    cancelledBy: string | null;
    cancellationReason: string | null;
    createdAt: string;
    updatedAt: string;
    status: ReskinStatus;
}

export interface ProcessReskinRequestRequest {
    cost: number;
    admin_notes?: string;
}

export interface CompleteReskinRequestRequest {
    new_asset_name: string;
    completion_photos: string[];
    completion_notes?: string;
}

export interface CancelReskinRequestRequest {
    cancellationReason: string;
    orderAction: "continue" | "cancel_order";
}

// ============================================================
// Order Cancellation
// ============================================================

export type CancellationReason =
    | "client_requested"
    | "asset_unavailable"
    | "pricing_dispute"
    | "event_cancelled"
    | "fabrication_failed"
    | "other";

export interface CancelOrderRequest {
    reason: CancellationReason;
    notes: string;
    notifyClient: boolean;
}
