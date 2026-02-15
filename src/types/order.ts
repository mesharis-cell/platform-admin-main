/**
 * Phase 6: Order Creation & Submission TypeScript Types
 *
 * Type definitions for order management, cart operations, and order submission workflows.
 */

import { Condition, HandlingTag } from "./asset";

// ============================================================
// Enums
// ============================================================

export type OrderStatus =
    | "DRAFT"
    | "SUBMITTED"
    | "PRICING_REVIEW"
    | "PENDING_APPROVAL"
    | "QUOTED"
    | "DECLINED"
    | "CONFIRMED"
    | "AWAITING_FABRICATION"
    | "IN_PREPARATION"
    | "READY_FOR_DELIVERY"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "IN_USE"
    | "AWAITING_RETURN"
    | "RETURN_IN_TRANSIT"
    | "CLOSED"
    | "CANCELLED";

// Feedback #1: Add separate financial status type
export type FinancialStatus =
    | "PENDING_QUOTE"
    | "QUOTE_SENT"
    | "QUOTE_REVISED"
    | "QUOTE_ACCEPTED"
    | "PENDING_INVOICE"
    | "INVOICED"
    | "PAID"
    | "CANCELLED";

export type MaintenanceDecision = "FIX_IN_ORDER" | "USE_AS_IS";

// ============================================================
// Order Types
// ============================================================

export interface Order {
    id: string;
    orderId: string; // Human-readable order ID (e.g., "ORD-20241109-001")
    companyName?: string; // Populated via join
    brand?: string | null;
    brandName?: string | null; // Populated via join
    userId: string;
    userName?: string; // Populated via join
    userEmail?: string; // Populated via join
    // Contact information
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    trip_type: "ONE_WAY" | "ROUND_TRIP";
    company: {
        id: string;
        name: string;
    };
    // Event details
    eventStartDate?: Date | null;
    eventEndDate?: Date | null;
    // Venue information
    venueName?: string | null;
    venueCountry?: string | null;
    venueCity?: string | null;
    venue_city_id: string;
    vehicle_type_id: string;
    venueAddress?: string | null;
    venueAccessNotes?: string | null;
    // Special instructions
    specialInstructions?: string | null;
    // Calculated totals
    calculatedVolume: string; // decimal as string
    calculatedWeight: string; // decimal as string
    // Pricing tier reference
    pricingTier?: string | null;
    order_pricing_id: string;
    // Pricing fields (Phase 8)
    a2BasePrice?: string | null;
    a2AdjustedPrice?: string | null;
    a2AdjustmentReason?: string | null;
    a2AdjustedAt?: Date | null;
    a2AdjustedBy?: string | null;
    pmgMarginPercent?: string | null;
    pmgMarginAmount?: string | null;
    pmgReviewedAt?: Date | null;
    pmgReviewedBy?: string | null;
    pmgReviewNotes?: string | null;
    finalTotalPrice?: string | null;
    quoteSentAt?: Date | null;
    // Invoice fields (Phase 9)
    invoiceNumber?: string | null;
    invoiceGeneratedAt?: Date | null;
    invoicePdfUrl?: string | null;
    invoicePaidAt?: Date | null;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    // Time windows (Phase 10)
    delivery_window: {
        start: Date | null;
        end: Date | null;
    };
    pickup_window: {
        start: Date | null;
        end: Date | null;
    };
    // Truck photos (Phase 11)
    truckPhotos: string[];
    // Job number (Phase 7)
    jobNumber?: string | null;
    // Status (Feedback #1: Separate financial from fulfillment)
    status: OrderStatus;
    financialStatus: FinancialStatus;
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}

export interface OrderWithDetails extends Order {
    items: OrderItemWithAsset[];
    itemCount: number;
    pricingTierDetails?: {
        country: string;
        city: string;
        volumeMin: string;
        volumeMax: string;
        basePrice: string;
    } | null;
    pricingBreakdown?: {
        showBreakdown: boolean;
        a2BasePrice?: string | null;
        pmgMarginPercent?: string | null;
        pmgMarginAmount?: string | null;
    } | null;
}

// ============================================================
// Order Item Types
// ============================================================

export interface OrderItem {
    id: string;
    order: string;
    asset: string;
    assetName: string; // Denormalized
    quantity: number;
    volume: string; // decimal as string (per unit)
    weight: string; // decimal as string (per unit)
    totalVolume: string; // decimal as string (quantity * volume)
    totalWeight: string; // decimal as string (quantity * weight)
    condition: Condition;
    handlingTags: HandlingTag[];
    maintenanceDecision?: MaintenanceDecision | null;
    requiresMaintenance?: boolean;
    maintenanceRefurbDaysSnapshot?: number | null;
    maintenanceDecisionLockedAt?: Date | null;
    fromCollection?: string | null;
    fromCollectionName?: string | null;
    createdAt: Date;
}

export interface OrderItemWithAsset extends OrderItem {
    assetDetails?: {
        id: string;
        name: string;
        images: string[];
        category: string;
        qrCode: string;
        trackingMethod: "INDIVIDUAL" | "BATCH";
        status: "AVAILABLE" | "BOOKED" | "OUT" | "IN_MAINTENANCE";
    };
}

// ============================================================
// Request/Response Types
// ============================================================

// Draft order creation/update
export interface CreateDraftOrderRequest {
    items: DraftOrderItem[];
    brand?: string; // Optional primary brand
}

export interface DraftOrderItem {
    assetId: string;
    quantity: number;
    fromCollectionId?: string;
}

export interface DraftOrderResponse {
    draftId: string;
    items: OrderItemWithAsset[];
    calculatedVolume: string;
    calculatedWeight: string;
    itemCount: number;
}

// Add items to existing draft
export interface AddItemsToDraftRequest {
    items: DraftOrderItem[];
}

// Update item quantity
export interface UpdateOrderItemQuantityRequest {
    quantity: number;
}

// Add collection to cart
export interface AddCollectionToCartRequest {
    draftId?: string; // Optional - create new if not provided
}

export interface AddCollectionToCartResponse {
    draftId: string;
    addedItems: OrderItemWithAsset[];
    calculatedVolume: string;
    calculatedWeight: string;
    itemCount: number;
}

// Estimated price calculation
export interface EstimatedPriceRequest {
    venueCountry: string;
    venueCity: string;
}

export interface EstimatedPriceResponse {
    estimatedPrice: string;
    pricingTier: {
        id: string;
        country: string;
        city: string;
        volumeMin: string;
        volumeMax: string;
        basePrice: string;
    } | null;
    a2BasePrice: string;
    pmgMarginPercent: string;
    pmgMarginAmount: string;
    calculatedVolume: string;
    note: string;
}

// Order submission
export interface SubmitOrderRequest {
    eventStartDate: string; // ISO date string
    eventEndDate: string; // ISO date string
    venueName: string;
    venueCountry: string;
    venueCity: string;
    venueAddress: string;
    venueAccessNotes?: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    specialInstructions?: string;
    brand?: string; // Optional primary brand
}

export interface SubmitOrderResponse {
    orderId: string;
    status: OrderStatus;
    submittedAt: Date;
    message: string;
}

// List user orders
export interface MyOrdersListParams {
    status?: OrderStatus;
    limit?: number;
    offset?: number;
    sortBy?: "createdAt" | "eventStartDate" | "orderId";
    sortOrder?: "asc" | "desc";
}

export interface MyOrdersListResponse {
    orders: Order[];
    total: number;
    limit: number;
    offset: number;
}

// ============================================================
// Phase 9: Invoicing Types
// ============================================================

// Invoice metadata from order
export interface InvoiceMetadata {
    invoiceNumber: string;
    invoiceGeneratedAt: string; // ISO timestamp
    invoicePdfUrl: string;
    invoicePaidAt: string | null; // ISO timestamp or null
    paymentMethod: string | null;
    paymentReference: string | null;
    isPaid: boolean;
    orderId: string;
    finalTotalPrice: string;
}

// Generate invoice request
export interface GenerateInvoiceRequest {
    orderId: string;
    regenerate?: boolean;
}

// Generate invoice response
export interface GenerateInvoiceResponse {
    success: boolean;
    invoice: {
        invoiceNumber: string;
        invoicePdfUrl: string;
        invoiceGeneratedAt: string; // ISO timestamp
        orderId: string;
    };
}

// Send invoice email request
export interface SendInvoiceEmailRequest {
    orderId: string;
    recipientOverride?: string;
}

// Send invoice email response
export interface SendInvoiceEmailResponse {
    success: boolean;
    emailSent: boolean;
    sentTo: string[];
    sentAt: string; // ISO timestamp
}

// Confirm payment request
export interface ConfirmPaymentRequest {
    payment_method: string;
    payment_reference: string;
    payment_date: string; // ISO date string
    notes?: string;
}

// Confirm payment response
export interface ConfirmPaymentResponse {
    success: boolean;
    invoice: {
        invoiceNumber: string;
        invoicePaidAt: string; // ISO timestamp
        paymentMethod: string;
        paymentReference: string;
    };
}

// Invoice list params
export interface InvoiceListParams {
    company?: string;
    isPaid?: string;
    dateFrom?: string; // ISO date
    dateTo?: string; // ISO date
    page?: number;
    limit?: number;
    type?: string;
    sortBy?: "created_at" | "updated_at" | "invoice_id";
    sortOrder?: "asc" | "desc";
}

export interface OrderPricing {
    warehouse_ops_rate: number;
    base_ops_total: number;
    logistics_sub_total: number;
    transport: {
        final_rate: number;
        system_rate: number;
    };
    line_items: {
        custom_total: number;
        catalog_total: number;
    };
    margin: {
        amount: number;
        percent: number;
        is_override: boolean;
        override_reason: string | null;
    };
    final_total: number;
    calculated_at: string;
}

// Invoice list item
export interface InvoiceListItem {
    id: string;
    invoice_id: string;
    invoice_pdf_url: string;
    invoice_paid_at: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    order: {
        id: string;
        order_id: string;
        contact_name: string;
        event_start_date: string;
        venue_name: string;
        order_status: string;
        financial_status: string;
        final_pricing: {
            total_price: number;
            quote_sent_at: string;
        };
        order_pricing: OrderPricing;
    };
    inbound_request: {
        id: string;
        inbound_request_id: string;
        request_status: string;
        financial_status: string;
        incoming_at: string;
        pricing: OrderPricing;
    };
    company: {
        id: string;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

// Invoice list response
export interface InvoiceListResponse {
    data: InvoiceListItem[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

// ============================================================
// Phase 10: Order Lifecycle & Notification Types
// ============================================================

export type NotificationStatus = "QUEUED" | "SENT" | "FAILED" | "RETRYING";

export type NotificationType =
    | "ORDER_SUBMITTED"
    | "A2_APPROVED_STANDARD"
    | "A2_ADJUSTED_PRICING"
    | "QUOTE_SENT"
    | "QUOTE_APPROVED"
    | "QUOTE_DECLINED"
    | "INVOICE_GENERATED"
    | "PAYMENT_CONFIRMED"
    | "ORDER_CONFIRMED"
    | "READY_FOR_DELIVERY"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "PICKUP_REMINDER"
    | "ORDER_CLOSED"
    | "TIME_WINDOWS_UPDATED";

export interface NotificationLog {
    id: string;
    order: string;
    notificationType: NotificationType;
    recipients: {
        to: string[];
        cc?: string[];
        bcc?: string[];
    };
    status: NotificationStatus;
    attempts: number;
    lastAttemptAt: Date;
    sentAt?: Date | null;
    messageId?: string | null;
    errorMessage?: string | null;
    createdAt: Date;
}

export interface NotificationLogWithOrder {
    id: string;
    order: {
        id: string;
        orderId: string;
        companyName: string;
    };
    notificationType: NotificationType;
    recipients: {
        to: string[];
        cc?: string[];
        bcc?: string[];
    };
    status: NotificationStatus;
    attempts: number;
    lastAttemptAt: Date;
    sentAt?: Date | null;
    messageId?: string | null;
    errorMessage?: string | null;
    createdAt: Date;
}

// Status Progression
export interface ProgressStatusRequest {
    newStatus: OrderStatus;
    notes?: string;
}

export interface ProgressStatusResponse {
    order: Order;
    message: string;
}

// Time Windows
export interface TimeWindowsRequest {
    deliveryWindowStart: string; // ISO 8601 format
    deliveryWindowEnd: string;
    pickupWindowStart: string;
    pickupWindowEnd: string;
}

export interface TimeWindowsResponse {
    order: Order;
    message: string;
}

// Status History
export interface StatusHistoryEntry {
    id: string;
    status: OrderStatus;
    notes?: string | null;
    updatedBy: {
        id: string;
        name: string;
        email: string;
    };
    timestamp: Date;
}

export interface StatusHistoryResponse {
    orderId: string;
    currentStatus: OrderStatus;
    history: StatusHistoryEntry[];
}

// Failed Notifications
export interface FailedNotificationsParams {
    status?: "FAILED" | "RETRYING";
    notificationType?: string;
    orderId?: string;
    limit?: number;
    offset?: number;
}

export interface FailedNotificationsResponse {
    total: number;
    notifications: NotificationLogWithOrder[];
}

// Validation types are exported from types/phase2.ts to avoid duplicates

// ============================================================
// API Response Types (New Structure)
// ============================================================

export interface APIOrder {
    id: string;
    order_id: string;
    company: {
        id: string;
        name: string;
    };
    brand: string | null;
    user_id: string;
    job_number: string | null;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    event_start_date: string;
    event_end_date: string;
    venue_name: string;
    venue_location: {
        city: string;
        address: string;
        country: string;
        access_notes: string | null;
    };
    calculated_totals: {
        volume: string;
        weight: string;
    };
    order_status: OrderStatus;
    financial_status: FinancialStatus;
    tier_id: string | null;
    created_at: string;
    updated_at: string;
    item_count: number;
    item_preview: string[];
}

export interface APIOrdersResponse {
    data: APIOrder[];
    message: string;
    meta: any;
    success: boolean;
}

// ============================================================
// Truck details types
// ============================================================
export interface TruckDetailsData {
    truckPlate: string;
    driverName: string;
    driverContact: string;
    truckSize: string;
    tailgateRequired: boolean;
    manpower: number;
    notes: string;
}

export type OrderTransportUnitKind = "DELIVERY_BILLABLE" | "PICKUP_OPS" | "OTHER_ACCESS";

export interface OrderTransportUnitDetailsData {
    truck_plate?: string | null;
    driver_name?: string | null;
    driver_contact?: string | null;
    truck_size?: string | null;
    tailgate_required?: boolean;
    manpower?: number;
    pickup_notes?: string | null;
    delivery_notes?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown>;
}

export interface OrderTransportUnit {
    id: string;
    kind: OrderTransportUnitKind;
    vehicle_type_id: string | null;
    label: string | null;
    is_default: boolean;
    is_billable: boolean;
    billable_rate: string | null;
    vehicle_type?: {
        id: string;
        name: string;
    } | null;
    details?: OrderTransportUnitDetailsData | null;
}

export interface CreateOrderTransportUnitPayload {
    kind: OrderTransportUnitKind;
    vehicle_type_id?: string;
    label?: string;
    is_default?: boolean;
    is_billable?: boolean;
    billable_rate?: number;
    detail?: OrderTransportUnitDetailsData;
}

export interface UpdateOrderTransportUnitPayload {
    kind?: OrderTransportUnitKind;
    vehicle_type_id?: string | null;
    label?: string;
    is_default?: boolean;
    is_billable?: boolean;
    billable_rate?: number | null;
    detail?: OrderTransportUnitDetailsData;
}
