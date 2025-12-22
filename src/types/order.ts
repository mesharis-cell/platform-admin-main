/**
 * Phase 6: Order Creation & Submission TypeScript Types
 *
 * Type definitions for order management, cart operations, and order submission workflows.
 */

import { Condition, HandlingTag } from './asset'

// ============================================================
// Enums
// ============================================================

export type OrderStatus =
	| 'DRAFT'
	| 'SUBMITTED'
	| 'PRICING_REVIEW'
	| 'PENDING_APPROVAL'
	| 'QUOTED'
	| 'DECLINED'
	| 'CONFIRMED'
	| 'IN_PREPARATION'
	| 'READY_FOR_DELIVERY'
	| 'IN_TRANSIT'
	| 'DELIVERED'
	| 'IN_USE'
	| 'AWAITING_RETURN'
	| 'CLOSED'

// Feedback #1: Add separate financial status type
export type FinancialStatus =
	| 'PENDING_QUOTE'
	| 'QUOTE_SENT'
	| 'QUOTE_ACCEPTED'
	| 'PENDING_INVOICE'
	| 'INVOICED'
	| 'PAID'

// ============================================================
// Order Types
// ============================================================

export interface Order {
	id: string
	orderId: string // Human-readable order ID (e.g., "ORD-20241109-001")
	company: string
	companyName?: string // Populated via join
	brand?: string | null
	brandName?: string | null // Populated via join
	userId: string
	userName?: string // Populated via join
	userEmail?: string // Populated via join
	// Contact information
	contactName?: string | null
	contactEmail?: string | null
	contactPhone?: string | null
	// Event details
	eventStartDate?: Date | null
	eventEndDate?: Date | null
	// Venue information
	venueName?: string | null
	venueCountry?: string | null
	venueCity?: string | null
	venueAddress?: string | null
	venueAccessNotes?: string | null
	// Special instructions
	specialInstructions?: string | null
	// Calculated totals
	calculatedVolume: string // decimal as string
	calculatedWeight: string // decimal as string
	// Pricing tier reference
	pricingTier?: string | null
	// Pricing fields (Phase 8)
	a2BasePrice?: string | null
	a2AdjustedPrice?: string | null
	a2AdjustmentReason?: string | null
	a2AdjustedAt?: Date | null
	a2AdjustedBy?: string | null
	pmgMarginPercent?: string | null
	pmgMarginAmount?: string | null
	pmgReviewedAt?: Date | null
	pmgReviewedBy?: string | null
	pmgReviewNotes?: string | null
	finalTotalPrice?: string | null
	quoteSentAt?: Date | null
	// Invoice fields (Phase 9)
	invoiceNumber?: string | null
	invoiceGeneratedAt?: Date | null
	invoicePdfUrl?: string | null
	invoicePaidAt?: Date | null
	paymentMethod?: string | null
	paymentReference?: string | null
	// Time windows (Phase 10)
	deliveryWindowStart?: Date | null
	deliveryWindowEnd?: Date | null
	pickupWindowStart?: Date | null
	pickupWindowEnd?: Date | null
	// Truck photos (Phase 11)
	truckPhotos: string[]
	// Job number (Phase 7)
	jobNumber?: string | null
	// Status (Feedback #1: Separate financial from fulfillment)
	status: OrderStatus
	financialStatus: FinancialStatus
	// Timestamps
	createdAt: Date
	updatedAt: Date
	deletedAt?: Date | null
}

export interface OrderWithDetails extends Order {
	items: OrderItemWithAsset[]
	itemCount: number
	pricingTierDetails?: {
		country: string
		city: string
		volumeMin: string
		volumeMax: string
		basePrice: string
	} | null
	pricingBreakdown?: {
		showBreakdown: boolean
		a2BasePrice?: string | null
		pmgMarginPercent?: string | null
		pmgMarginAmount?: string | null
	} | null
}

// ============================================================
// Order Item Types
// ============================================================

export interface OrderItem {
	id: string
	order: string
	asset: string
	assetName: string // Denormalized
	quantity: number
	volume: string // decimal as string (per unit)
	weight: string // decimal as string (per unit)
	totalVolume: string // decimal as string (quantity * volume)
	totalWeight: string // decimal as string (quantity * weight)
	condition: Condition
	handlingTags: HandlingTag[]
	fromCollection?: string | null
	fromCollectionName?: string | null
	createdAt: Date
}

export interface OrderItemWithAsset extends OrderItem {
	assetDetails?: {
		id: string
		name: string
		images: string[]
		category: string
		qrCode: string
		trackingMethod: 'INDIVIDUAL' | 'BATCH'
		status: 'AVAILABLE' | 'BOOKED' | 'OUT' | 'IN_MAINTENANCE'
	}
}

// ============================================================
// Request/Response Types
// ============================================================

// Draft order creation/update
export interface CreateDraftOrderRequest {
	items: DraftOrderItem[]
	brand?: string // Optional primary brand
}

export interface DraftOrderItem {
	assetId: string
	quantity: number
	fromCollectionId?: string
}

export interface DraftOrderResponse {
	draftId: string
	items: OrderItemWithAsset[]
	calculatedVolume: string
	calculatedWeight: string
	itemCount: number
}

// Add items to existing draft
export interface AddItemsToDraftRequest {
	items: DraftOrderItem[]
}

// Update item quantity
export interface UpdateOrderItemQuantityRequest {
	quantity: number
}

// Add collection to cart
export interface AddCollectionToCartRequest {
	draftId?: string // Optional - create new if not provided
}

export interface AddCollectionToCartResponse {
	draftId: string
	addedItems: OrderItemWithAsset[]
	calculatedVolume: string
	calculatedWeight: string
	itemCount: number
}

// Estimated price calculation
export interface EstimatedPriceRequest {
	venueCountry: string
	venueCity: string
}

export interface EstimatedPriceResponse {
	estimatedPrice: string
	pricingTier: {
		id: string
		country: string
		city: string
		volumeMin: string
		volumeMax: string
		basePrice: string
	} | null
	a2BasePrice: string
	pmgMarginPercent: string
	pmgMarginAmount: string
	calculatedVolume: string
	note: string
}

// Order submission
export interface SubmitOrderRequest {
	eventStartDate: string // ISO date string
	eventEndDate: string // ISO date string
	venueName: string
	venueCountry: string
	venueCity: string
	venueAddress: string
	venueAccessNotes?: string
	contactName: string
	contactEmail: string
	contactPhone: string
	specialInstructions?: string
	brand?: string // Optional primary brand
}

export interface SubmitOrderResponse {
	orderId: string
	status: OrderStatus
	submittedAt: Date
	message: string
}

// List user orders
export interface MyOrdersListParams {
	status?: OrderStatus
	limit?: number
	offset?: number
	sortBy?: 'createdAt' | 'eventStartDate' | 'orderId'
	sortOrder?: 'asc' | 'desc'
}

export interface MyOrdersListResponse {
	orders: Order[]
	total: number
	limit: number
	offset: number
}

// ============================================================
// Phase 9: Invoicing Types
// ============================================================

// Invoice metadata from order
export interface InvoiceMetadata {
	invoiceNumber: string
	invoiceGeneratedAt: string // ISO timestamp
	invoicePdfUrl: string
	invoicePaidAt: string | null // ISO timestamp or null
	paymentMethod: string | null
	paymentReference: string | null
	isPaid: boolean
	orderId: string
	finalTotalPrice: string
}

// Generate invoice request
export interface GenerateInvoiceRequest {
	orderId: string
	regenerate?: boolean
}

// Generate invoice response
export interface GenerateInvoiceResponse {
	success: boolean
	invoice: {
		invoiceNumber: string
		invoicePdfUrl: string
		invoiceGeneratedAt: string // ISO timestamp
		orderId: string
	}
}

// Send invoice email request
export interface SendInvoiceEmailRequest {
	orderId: string
	recipientOverride?: string
}

// Send invoice email response
export interface SendInvoiceEmailResponse {
	success: boolean
	emailSent: boolean
	sentTo: string[]
	sentAt: string // ISO timestamp
}

// Confirm payment request
export interface ConfirmPaymentRequest {
	paymentMethod: string
	paymentReference: string
	paymentDate: string // ISO date string
	notes?: string
}

// Confirm payment response
export interface ConfirmPaymentResponse {
	success: boolean
	invoice: {
		invoiceNumber: string
		invoicePaidAt: string // ISO timestamp
		paymentMethod: string
		paymentReference: string
	}
}

// Invoice list params
export interface InvoiceListParams {
	company?: string
	isPaid?: boolean
	dateFrom?: string // ISO date
	dateTo?: string // ISO date
	page?: number
	limit?: number
	sortBy?: 'invoiceGeneratedAt' | 'invoicePaidAt' | 'finalTotalPrice'
	sortOrder?: 'asc' | 'desc'
}

// Invoice list item
export interface InvoiceListItem {
	invoiceNumber: string
	orderId: string
	orderIdReadable: string
	company: {
		id: string
		name: string
	}
	contactName: string
	invoiceGeneratedAt: string
	invoicePaidAt: string | null
	paymentMethod: string | null
	finalTotalPrice: string
	isPaid: boolean
}

// Invoice list response
export interface InvoiceListResponse {
	invoices: InvoiceListItem[]
	pagination: {
		total: number
		page: number
		limit: number
		totalPages: number
	}
}

// ============================================================
// Phase 10: Order Lifecycle & Notification Types
// ============================================================

export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'RETRYING'

export type NotificationType =
	| 'ORDER_SUBMITTED'
	| 'A2_APPROVED_STANDARD'
	| 'A2_ADJUSTED_PRICING'
	| 'QUOTE_SENT'
	| 'QUOTE_APPROVED'
	| 'QUOTE_DECLINED'
	| 'INVOICE_GENERATED'
	| 'PAYMENT_CONFIRMED'
	| 'ORDER_CONFIRMED'
	| 'READY_FOR_DELIVERY'
	| 'IN_TRANSIT'
	| 'DELIVERED'
	| 'PICKUP_REMINDER'
	| 'ORDER_CLOSED'
	| 'TIME_WINDOWS_UPDATED'

export interface NotificationLog {
	id: string
	order: string
	notificationType: NotificationType
	recipients: {
		to: string[]
		cc?: string[]
		bcc?: string[]
	}
	status: NotificationStatus
	attempts: number
	lastAttemptAt: Date
	sentAt?: Date | null
	messageId?: string | null
	errorMessage?: string | null
	createdAt: Date
}

export interface NotificationLogWithOrder {
	id: string
	order: {
		id: string
		orderId: string
		companyName: string
	}
	notificationType: NotificationType
	recipients: {
		to: string[]
		cc?: string[]
		bcc?: string[]
	}
	status: NotificationStatus
	attempts: number
	lastAttemptAt: Date
	sentAt?: Date | null
	messageId?: string | null
	errorMessage?: string | null
	createdAt: Date
}

// Status Progression
export interface ProgressStatusRequest {
	newStatus: OrderStatus
	notes?: string
}

export interface ProgressStatusResponse {
	order: Order
	message: string
}

// Time Windows
export interface TimeWindowsRequest {
	deliveryWindowStart: string // ISO 8601 format
	deliveryWindowEnd: string
	pickupWindowStart: string
	pickupWindowEnd: string
}

export interface TimeWindowsResponse {
	order: Order
	message: string
}

// Status History
export interface StatusHistoryEntry {
	id: string
	status: OrderStatus
	notes?: string | null
	updatedBy: {
		id: string
		name: string
		email: string
	}
	timestamp: Date
}

export interface StatusHistoryResponse {
	orderId: string
	currentStatus: OrderStatus
	history: StatusHistoryEntry[]
}

// Failed Notifications
export interface FailedNotificationsParams {
	status?: 'FAILED' | 'RETRYING'
	notificationType?: string
	orderId?: string
	limit?: number
	offset?: number
}

export interface FailedNotificationsResponse {
	total: number
	notifications: NotificationLogWithOrder[]
}

// Validation types are exported from types/phase2.ts to avoid duplicates
