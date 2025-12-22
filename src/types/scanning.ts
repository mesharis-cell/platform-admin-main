/**
 * Phase 11: QR Code Scanning & Inventory Tracking Types
 *
 * This file contains TypeScript types for:
 * - Scanning sessions (ephemeral, not persisted to DB)
 * - Scan events (persisted records in scanEvents table)
 * - Scanning workflow requests and responses
 * - Inventory tracking types
 */

// ============================================================
// Enums
// ============================================================

export type ScanType = 'OUTBOUND' | 'INBOUND'
export type DiscrepancyReason = 'BROKEN' | 'LOST' | 'OTHER'

// Condition enum is already defined in asset.ts but re-exported here for convenience
export type { Condition } from './asset'

// ============================================================
// Scan Event Types (Database Records)
// ============================================================

export interface ScanEvent {
	id: string
	order: string // orderId (uuid)
	asset: string // assetId (uuid)
	scanType: ScanType
	quantity: number
	condition: 'GREEN' | 'ORANGE' | 'RED'
	notes: string | null
	photos: string[] // Array of photo URLs
	discrepancyReason: DiscrepancyReason | null
	scannedBy: string // userId
	scannedAt: Date
}

export interface ScanEventWithDetails {
	id: string
	order: string // orderId (uuid)
	asset: string // assetId (uuid)
	scanType: ScanType
	quantity: number
	condition: 'GREEN' | 'ORANGE' | 'RED'
	notes: string | null
	photos: string[] // Array of photo URLs
	discrepancyReason: DiscrepancyReason | null
	scannedBy: string // userId
	scannedAt: Date
	// Extended details
	assetDetails: {
		assetId: string
		assetName: string
		qrCode: string
		trackingMethod: 'INDIVIDUAL' | 'BATCH'
	}
	scannedByUser: {
		userId: string
		name: string
	}
	orderDetails: {
		orderId: string
		orderIdDisplay: string // Human-readable (ORD-20241109-001)
	}
}

// ============================================================
// Scanning Session Types (In-Memory Only)
// ============================================================

export interface ScanningSession {
	sessionId: string
	orderId: string
	scanType: ScanType
	startedAt: Date
	startedBy: string // userId
	itemsScanned: ScannedItemProgress[]
	expiresAt: Date
}

export interface ScannedItemProgress {
	assetId: string
	scannedQuantity: number
	requiredQuantity: number
}

// ============================================================
// Asset Info for Scanning
// ============================================================

export interface AssetToScan {
	assetId: string
	assetName: string
	qrCode: string
	trackingMethod: 'INDIVIDUAL' | 'BATCH'
	requiredQuantity: number // For outbound: quantity in order, For inbound: quantity that went out
	scannedQuantity: number
	remainingQuantity: number // requiredQuantity - scannedQuantity
}

// ============================================================
// API Request/Response Types
// ============================================================

// Outbound Scanning

export interface StartOutboundScanRequest {
	orderId: string
}

export interface StartOutboundScanResponse {
	sessionId: string
	orderId: string
	totalItems: number // Total quantity of all items
	itemsScanned: number // 0 at start
	assets: AssetToScan[]
}

export interface OutboundScanRequest {
	sessionId: string
	qrCode: string
	quantity?: number // Required for BATCH tracking, optional for INDIVIDUAL (defaults to 1)
}

export interface OutboundScanResponse {
	success: true
	asset: {
		assetId: string
		assetName: string
		trackingMethod: 'INDIVIDUAL' | 'BATCH'
		scannedQuantity: number
		requiredQuantity: number
		remainingQuantity: number
	}
	progress: ScanProgress
}

export interface UploadTruckPhotosRequest {
	sessionId: string
	photos: string[] // Base64-encoded images
}

export interface UploadTruckPhotosResponse {
	success: true
	uploadedPhotos: string[] // URLs of uploaded photos
}

export interface CompleteOutboundScanRequest {
	sessionId: string
}

export interface CompleteOutboundScanResponse {
	success: true
	orderId: string
	newStatus: 'READY_FOR_DELIVERY'
	totalItemsScanned: number
	truckPhotosUploaded: number
}

// Inbound Scanning

export interface StartInboundScanRequest {
	orderId: string
}

export interface StartInboundScanResponse {
	sessionId: string
	orderId: string
	totalItems: number // Total quantity that went out
	itemsScanned: number // 0 at start
	assets: AssetToScan[]
}

export interface InboundScanRequest {
	sessionId: string
	qrCode: string
	quantity?: number // Required for BATCH tracking
	condition: 'GREEN' | 'ORANGE' | 'RED'
	notes?: string // Required if condition is ORANGE or RED
	photos?: string[] // Base64-encoded images (required if RED)
	refurbDaysEstimate?: number // Feedback #2: Required for ORANGE/RED
	discrepancyReason?: DiscrepancyReason // If quantity < expected
}

export interface InboundScanResponse {
	success: true
	asset: {
		assetId: string
		assetName: string
		trackingMethod: 'INDIVIDUAL' | 'BATCH'
		scannedQuantity: number
		expectedQuantity: number
		remainingQuantity: number
		condition: 'GREEN' | 'ORANGE' | 'RED'
		status: 'AVAILABLE' | 'IN_MAINTENANCE' // GREEN/ORANGE → AVAILABLE, RED → IN_MAINTENANCE
	}
	progress: ScanProgress
}

export interface CompleteInboundScanRequest {
	sessionId: string
}

export interface CompleteInboundScanResponse {
	success: true
	orderId: string
	newStatus: 'CLOSED'
	totalItemsScanned: number
	itemsWithDiscrepancies: number
	itemsNeedingMaintenance: number
}

// Session Progress

export interface ScanProgress {
	totalItems: number
	itemsScanned: number
	percentComplete: number
}

export interface GetSessionProgressResponse {
	sessionId: string
	orderId: string
	scanType: ScanType
	startedAt: string // ISO timestamp
	startedBy: {
		userId: string
		name: string
	}
	totalItems: number
	itemsScanned: number
	percentComplete: number
	assets: AssetToScan[]
}

// Scan History

export interface GetScanEventsResponse {
	orderId: string
	scanEvents: ScanEventWithDetails[]
}

export interface GetAssetScanHistoryResponse {
	assetId: string
	assetName: string
	qrCode: string
	scanHistory: ScanEventWithDetails[]
}

// ============================================================
// Inventory Tracking Types
// ============================================================

export interface ReserveAssetRequest {
	orderId: string
	quantity: number
}

export interface ReserveAssetResponse {
	success: true
	assetId: string
	bookedQuantity: number
	availableQuantity: number
}

export interface ReleaseAssetRequest {
	orderId: string
	quantity: number
}

export interface ReleaseAssetResponse {
	success: true
	assetId: string
	bookedQuantity: number
	availableQuantity: number
}

export interface InventoryAvailabilityParams {
	company?: string // Filter by company UUID
	warehouse?: string // Filter by warehouse UUID
	zone?: string // Filter by zone UUID
	status?: 'AVAILABLE' | 'BOOKED' | 'OUT' | 'IN_MAINTENANCE'
}

export interface AssetAvailability {
	assetId: string
	assetName: string
	company: {
		companyId: string
		companyName: string
	}
	warehouse: {
		warehouseId: string
		warehouseName: string
	}
	zone: {
		zoneId: string
		zoneName: string
	}
	trackingMethod: 'INDIVIDUAL' | 'BATCH'
	totalQuantity: number
	availableQuantity: number
	bookedQuantity: number
	outQuantity: number
	inMaintenanceQuantity: number
	status: 'AVAILABLE' | 'BOOKED' | 'OUT' | 'IN_MAINTENANCE'
	lastScannedAt: Date | null
	lastScannedBy: {
		userId: string
		name: string
	} | null
}

export interface GetInventoryAvailabilityResponse {
	assets: AssetAvailability[]
}

// ============================================================
// Error Types
// ============================================================

export interface ScanningError {
	error: string
	details?: {
		field?: string
		issue?: string
	}
}
