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
export type VehicleType = "STANDARD" | "7_TON" | "10_TON";

export interface TransportRate {
    id: string;
    platformId: string;
    companyId: string | null;
    emirate: string;
    area: string | null;
    tripType: TripType;
    vehicleType: VehicleType;
    rate: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTransportRateRequest {
    companyId?: string | null;
    emirate: string;
    area?: string | null;
    tripType: TripType;
    vehicleType: VehicleType;
    rate: number;
    isActive?: boolean;
}

export interface UpdateTransportRateRequest {
    rate?: number;
    isActive?: boolean;
}

export interface TransportRateLookup {
    emirate: string;
    tripType: TripType;
    vehicleType: VehicleType;
    rate: number;
}

// ============================================================
// Service Types
// ============================================================

export type ServiceCategory = "ASSEMBLY" | "EQUIPMENT" | "HANDLING" | "RESKIN" | "OTHER";

export interface ServiceType {
    id: string;
    platformId: string;
    name: string;
    category: ServiceCategory;
    unit: string;
    defaultRate: number | null;
    description: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateServiceTypeRequest {
    name: string;
    category: ServiceCategory;
    unit: string;
    defaultRate?: number | null;
    description?: string;
    displayOrder?: number;
    isActive?: boolean;
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

export interface OrderLineItem {
    id: string;
    platformId: string;
    orderId: string;
    serviceTypeId: string | null;
    reskinRequestId: string | null;
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
    isVoided: boolean;
    voidedAt: string | null;
    voidedBy: string | null;
    voidReason: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCatalogLineItemRequest {
    service_type_id: string;
    quantity: number;
    unit_rate: number;
    notes?: string;
}

export interface CreateCustomLineItemRequest {
    description: string;
    category: ServiceCategory;
    total: number;
    notes?: string;
    reskinRequestId?: string;
}

export interface UpdateLineItemRequest {
    quantity?: number;
    unitRate?: number;
    total?: number;
    notes?: string;
}

export interface VoidLineItemRequest {
    void_reason: string;
}

// ============================================================
// Order Pricing Structure (NEW)
// ============================================================

export interface OrderPricing {
    base_ops_total: string;
    logistics_sub_total: string;
    base_operations: {
        volume: number;
        rate: number;
        total: number;
    };
    transport: {
        emirate: string;
        trip_type: TripType;
        vehicle_type: VehicleType;
        system_rate: number;
        final_rate: number;
        vehicle_changed: boolean;
        vehicle_change_reason: string | null;
    };
    line_items: {
        catalog_total: number;
        custom_total: number;
    };
    logistics_subtotal: number;
    margin: {
        percent: number;
        amount: number;
        is_override: boolean;
        override_reason: string | null;
    };
    final_total: number;
    calculated_at: string;
    calculated_by: string;
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
