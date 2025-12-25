// Phase 3: Asset Management & QR Code Generation TypeScript Types

// Tracking Method
export type TrackingMethod = 'INDIVIDUAL' | 'BATCH'

// Condition
export type Condition = 'GREEN' | 'ORANGE' | 'RED'

// Asset Status
export type AssetStatus = 'AVAILABLE' | 'BOOKED' | 'OUT' | 'IN_MAINTENANCE'

// Handling Tags
export type HandlingTag =
	| 'Fragile'
	| 'HighValue'
	| 'HeavyLift'
	| 'AssemblyRequired'

// Asset Categories
export type AssetCategory = 'Furniture' | 'Glassware' | 'Installation' | 'Decor'

// Asset entity
// Feedback #4 & #5: Removed quantity fields, availability calculated from asset_bookings
export interface Asset {
	id: string
	company: string
	brand?: string
	warehouse: string
	zone: string
	name: string
	description?: string
	category: AssetCategory
	images: string[]
	tracking_method: TrackingMethod
	total_quantity: number
	available_quantity: number
	qr_code: string
	packaging?: string
	weight: number // kg
	dimensions: {
		length: number
		width: number
		height: number
	}
	volume_per_unit: number // m³
	condition: Condition
	status: AssetStatus
	refurb_days_estimate?: number | null // Feedback #2: Estimated days to refurbish
	handling_tags: string[]
	last_scanned_at?: string
	last_scanned_by?: string
	deleted_at?: string
	created_at: string
	updated_at: string
}

// Asset with related entity details (for detail view)
export interface AssetWithDetails extends Asset {
	latestConditionNotes?: string // Feedback #2: Latest condition notes from history
	companyDetails: {
		id: string
		name: string
	}
	brandDetails?: {
		id: string
		name: string
	}
	warehouseDetails: {
		id: string
		name: string
		city: string
	}
	zoneDetails: {
		id: string
		name: string
	}
	conditionHistory: AssetConditionHistoryEntry[]
}

// Asset Condition History Entry
export interface AssetConditionHistoryEntry {
	id: string
	asset: string
	condition: Condition
	notes?: string
	photos: string[]
	updatedBy: string
	timestamp: string
}

// Create Asset Request
export interface CreateAssetRequest {
	company_id: string // uuid
	brand_id?: string // uuid
	warehouse_id: string // uuid
	zone_id: string // uuid
	name: string
	description?: string
	category: AssetCategory
	images: string[] // array of uploaded image URLs
	tracking_method: TrackingMethod
	total_quantity: number
	available_quantity: number
	packaging?: string // required if BATCH
	weight_per_unit: number // kg
	dimensions?: {
		length?: number // cm
		width?: number // cm
		height?: number // cm
	}
	volume_per_unit: number // m³
	condition?: Condition // optional, defaults to GREEN if not provided
	condition_notes?: string // Feedback #2: Required for ORANGE/RED items
	handling_tags?: string[]
	refurb_days_estimate?: number
	status?: AssetStatus // optional, defaults to AVAILABLE
}

// Update Asset Request
export interface UpdateAssetRequest {
	brand_id?: string // uuid
	warehouse_id?: string // uuid
	zone_id?: string // uuid
	name?: string
	description?: string
	category?: AssetCategory
	images?: string[] // replace existing images
	totalQuantity?: number // adjust total quantity
	packaging?: string
	weight?: number // kg
	dimensionLength?: number // cm
	dimensionWidth?: number // cm
	dimensionHeight?: number // cm
	volume?: number // m³
	condition?: Condition // Feedback #2: Allow condition changes via edit
	refurbDaysEstimate?: number | null // Feedback #2: Update refurb estimate
	conditionNotes?: string // Feedback #2: Notes when changing condition
	handlingTags?: string[]
}

// Asset List Query Parameters
export interface AssetListParams {
	company?: string // uuid
	brand?: string // uuid
	warehouse?: string // uuid
	zone?: string // uuid
	category?: AssetCategory
	condition?: Condition
	status?: AssetStatus
	search?: string // search by name
	limit?: number
	offset?: number
}

// Asset List Response
export interface AssetListResponse {
	success: true
	assets: Asset[]
	total: number
	limit: number
	offset: number
}

// Generate QR Code Request
export interface GenerateQRCodeRequest {
	qrCode: string // the QR code string to encode
}

// Generate QR Code Response
export interface GenerateQRCodeResponse {
	success: true
	qrCodeImage: string // base64-encoded PNG or SVG
}

// Upload Image Response
export interface UploadImageResponse {
	success: true
	imageUrl: string // URL of uploaded image in file storage
}

// API Success Response
export interface ApiSuccessResponse<T = unknown> {
	success: true
	data?: T
	message?: string
}

// API Error Response
export interface ApiErrorResponse {
	success: false
	error: string
	details?: unknown
}

export interface AssetsDetails {
  id: string;
  platform_id: string;
  company_id: string;
  warehouse_id: string;
  zone_id: string;
  brand_id: string | null;

  name: string;
  description: string | null;
  category: string;

  images: string[];

  tracking_method: TrackingMethod;

  total_quantity: number;
  available_quantity: number;

  qr_code: string;
  packaging: string | null;

  weight_per_unit: number;
  volume_per_unit: number;

  dimensions: {
		length: number;
		width: number;
		height: number;
	};

  condition: Condition;
  condition_notes: string | null;
  refurb_days_estimate: number | null;

  condition_history: {
		notes: string;
		condition: Condition;
		updated_by: string;
		timestamp: string;
	}[];
  handling_tags: string[];

  status: AssetStatus;

  last_scanned_at: string | null;
  last_scanned_by: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  company: {
  id: string;
  name: string;
  domain: string;
};
  warehouse: {
  id: string;
  name: string;
  city: string;
  country: string;
};
  zone: {
  id: string;
  name: string;
};
  brand: {
		id: string;
		name: string;
		logo_url: string;
	};
}