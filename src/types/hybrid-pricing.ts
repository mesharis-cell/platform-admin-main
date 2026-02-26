/**
 * Hybrid Pricing System Types
 * Types for pricing config, transport rates, service types, and order line items
 */

// ============================================================
// Pricing Configuration
// ============================================================

export interface PricingConfig {
    id: string;
    platformId: string;
    companyId: string | null;
    warehouseOpsRate: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SetPricingConfigRequest {
    warehouseOpsRate: number;
}

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
}

export interface UpdateServiceTypeRequest {
    name?: string;
    unit?: string;
    defaultRate?: number | null;
    description?: string;
    displayOrder?: number;
    isActive?: boolean;
}

// ============================================================
// Order Line Items
// ============================================================

export type LineItemType = "CATALOG" | "CUSTOM";
export type PurposeType = "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
export type LineItemBillingMode = "BILLABLE" | "NON_BILLABLE" | "COMPLIMENTARY";

export interface TransportLineItemMetadata {
    truck_plate?: string;
    driver_name?: string;
    driver_contact?: string;
    truck_size?: string;
    tailgate_required?: boolean;
    manpower?: number;
    city_id?: string;
    city_name?: string;
    vehicle_type_id?: string;
    vehicle_type_name?: string;
    trip_direction?: "DELIVERY" | "PICKUP" | "ACCESS" | "TRANSFER";
    delivery_notes?: string;
    pickup_notes?: string;
    notes?: string;
    [key: string]: unknown;
}

export interface OrderLineItem {
    id: string;
    platformId: string;
    orderId: string;
    serviceTypeId: string | null;
    lineItemType: LineItemType;
    category: ServiceCategory;
    description: string;
    quantity: number | null;
    unit: string | null;
    unitRate: number | null;
    total: number;
    addedBy: string;
    addedAt: string;
    notes: string | null;
    billingMode?: LineItemBillingMode;
    metadata?: TransportLineItemMetadata | Record<string, unknown> | null;
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
    purpose_type: PurposeType;
    service_type_id: string;
    quantity: number;
    notes?: string;
    billing_mode?: LineItemBillingMode;
    metadata?: Record<string, unknown>;
}

export interface CreateCustomLineItemRequest {
    order_id?: string;
    inbound_request_id?: string;
    service_request_id?: string;
    purpose_type: PurposeType;
    description: string;
    category: ServiceCategory;
    quantity: number;
    unit: string;
    unit_rate: number;
    notes?: string;
    billing_mode?: LineItemBillingMode;
    metadata?: Record<string, unknown>;
}

export interface UpdateLineItemRequest {
    quantity?: number;
    unit?: string;
    unitRate?: number;
    notes?: string;
    billingMode?: LineItemBillingMode;
    metadata?: Record<string, unknown>;
}

export interface VoidLineItemRequest {
    void_reason: string;
}

// ============================================================
// Order Pricing Structure (NEW)
// ============================================================

export interface OrderPricing {
    warehouse_ops_rate?: number;
    base_ops_total: number;
    logistics_sub_total: number;
    base_operations?: {
        volume: number;
        rate: number;
        total: number;
    };
    transport: {
        emirate?: string;
        trip_type?: TripType;
        vehicle_type?: string;
        system_rate: number;
        final_rate: number;
        vehicle_changed?: boolean;
        vehicle_change_reason?: string | null;
    };
    line_items: {
        catalog_total: number;
        custom_total: number;
    };
    logistics_subtotal?: number;
    margin: {
        percent: number;
        amount: number;
        is_override: boolean;
        override_reason: string | null;
    };
    final_total: number;
    calculated_at: string;
    calculated_by?: string;
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
