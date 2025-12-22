// Condition Management Types (Phase 12)

import { Condition } from './asset'

// ===== Condition Update =====

export interface UpdateConditionRequest {
	assetId: string
	condition: Condition
	notes?: string // Required if ORANGE or RED
	photos?: string[] // Array of photo URLs (required if RED)
	quantity?: number // Optional: For batch-tracked assets
	refurbDaysEstimate?: number // Feedback #2: Refurb estimate for ORANGE/RED items
}

export interface UpdateConditionResponse {
	success: boolean
	asset: {
		id: string
		condition: Condition
		status: 'AVAILABLE' | 'BOOKED' | 'OUT' | 'IN_MAINTENANCE'
		updatedAt: string
	}
	conditionHistory: {
		id: string
		condition: Condition
		notes: string | null
		photos: string[]
		updatedBy: string
		timestamp: string
	}
}

// ===== Maintenance Completion =====

export interface CompleteMaintenanceRequest {
	assetId: string
	maintenanceNotes: string // Detailed notes about repairs
}

export interface CompleteMaintenanceResponse {
	success: boolean
	asset: {
		id: string
		condition: 'GREEN'
		status: 'AVAILABLE'
		updatedAt: string
	}
	conditionHistory: {
		id: string
		condition: 'GREEN'
		notes: string
		timestamp: string
	}
}

// ===== Condition History =====

export interface ConditionHistoryEntry {
	id: string
	condition: Condition
	notes: string | null
	photos: string[]
	updatedBy: {
		id: string
		name: string
		email: string
	}
	timestamp: string
}

export interface GetConditionHistoryResponse {
	success: boolean
	assetId: string
	assetName: string
	currentCondition: Condition
	history: ConditionHistoryEntry[]
}

// ===== Items Needing Attention =====

export interface ItemNeedingAttention {
	id: string
	name: string
	qrCode: string
	condition: 'RED' | 'ORANGE'
	status: 'AVAILABLE' | 'IN_MAINTENANCE'
	company: {
		id: string
		name: string
	}
	warehouse: {
		id: string
		name: string
	}
	zone: {
		id: string
		name: string
	}
	lastConditionUpdate: {
		notes: string | null
		photos: string[]
		updatedBy: string
		timestamp: string
	}
}

export interface ItemsNeedingAttentionParams {
	condition?: 'RED' | 'ORANGE'
	company?: string
	warehouse?: string
	zone?: string
	page?: number
	limit?: number
}

export interface ItemsNeedingAttentionResponse {
	success: boolean
	items: ItemNeedingAttention[]
	pagination: {
		total: number
		page: number
		limit: number
		totalPages: number
	}
	summary: {
		redCount: number
		orangeCount: number
	}
}

// ===== Add Maintenance Notes =====

export interface AddMaintenanceNotesRequest {
	assetId: string
	notes: string // Detailed maintenance notes
}

export interface AddMaintenanceNotesResponse {
	success: boolean
	conditionHistory: {
		id: string
		condition: Condition
		notes: string
		timestamp: string
	}
}

// ===== Filter by Condition =====

export interface FilterByConditionParams {
	condition: Condition
	company?: string
	warehouse?: string
	zone?: string
	page?: number
	limit?: number
}

export interface AssetWithCondition {
	id: string
	name: string
	qrCode: string
	condition: Condition
	status: 'AVAILABLE' | 'BOOKED' | 'OUT' | 'IN_MAINTENANCE'
	company: {
		id: string
		name: string
	}
	warehouse: {
		id: string
		name: string
	}
	zone: {
		id: string
		name: string
	}
	lastScannedAt: string | null
	lastScannedBy: string | null
}

export interface FilterByConditionResponse {
	success: boolean
	assets: AssetWithCondition[]
	pagination: {
		total: number
		page: number
		limit: number
		totalPages: number
	}
}

// ===== Upload Damage Photos =====

export interface UploadDamagePhotosRequest {
	files: File[]
	assetId: string
}

export interface UploadDamagePhotosResponse {
	success: boolean
	photoUrls: string[]
}

// ===== Error Types =====

export interface ConditionError {
	error: string
	field?: string
	issue?: string
}
