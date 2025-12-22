// Phase 4: Collections & Catalog System TypeScript Types

import type {
	Condition,
	AssetStatus,
	HandlingTag,
	AssetCategory,
} from './asset'

// ========================================
// Collection Types
// ========================================

export interface Collection {
	id: string
	company: string
	brand: string | null
	name: string
	description: string | null
	images: string[]
	category: string | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

export interface CollectionWithDetails extends Collection {
	companyName?: string
	brandName?: string
	brandLogoUrl?: string | null
	itemCount: number
}

export interface CollectionItem {
	id: string
	collection: string
	asset: string
	defaultQuantity: number
	notes: string | null
	createdAt: Date
}

export interface CollectionItemWithAsset extends CollectionItem {
	assetDetails: {
		id: string
		name: string
		category: string
		images: string[]
		volume: string // decimal as string
		weight: string // decimal as string
		status: AssetStatus
		condition: Condition
		availableQuantity: number
		totalQuantity: number
		handlingTags: HandlingTag[]
	}
}

// ========================================
// Collection Request/Response Types
// ========================================

export interface CreateCollectionRequest {
	company: string
	brand?: string | null
	name: string
	description?: string | null
	category?: string | null
	images?: string[]
}

export interface UpdateCollectionRequest {
	name?: string
	description?: string | null
	category?: string | null
	images?: string[]
	brand?: string | null
}

export interface CollectionListParams {
	company?: string
	brand?: string
	category?: string
	search?: string
	includeDeleted?: boolean
	limit?: number
	offset?: number
}

export interface CollectionListResponse {
	success: boolean
	collections: CollectionWithDetails[]
	total: number
	limit: number
	offset: number
}

export interface CollectionDetailsResponse {
	success: boolean
	collection: CollectionWithDetails & {
		items: CollectionItemWithAsset[]
	}
}

// ========================================
// Collection Item Request/Response Types
// ========================================

export interface AddCollectionItemRequest {
	asset: string
	defaultQuantity: number
	notes?: string | null
}

export interface UpdateCollectionItemRequest {
	defaultQuantity?: number
	notes?: string | null
}

// ========================================
// Collection Availability Types
// ========================================

export interface CollectionAvailabilityItem {
	assetId: string
	assetName: string
	defaultQuantity: number
	availableQuantity: number
	isAvailable: boolean
}

export interface CollectionAvailabilityResponse {
	success: boolean
	collectionId: string
	isFullyAvailable: boolean
	items: CollectionAvailabilityItem[]
}

// ========================================
// Catalog Types
// ========================================

export interface CatalogAssetItem {
	type: 'asset'
	id: string
	name: string
	description: string | null
	category: string
	images: string[]
	brand: {
		id: string
		name: string
		logoUrl?: string | null
	} | null
	availableQuantity: number
	totalQuantity: number
	condition: Condition
	refurbDaysEstimate?: number | null // Feedback #2: Days needed for refurbishment
	volume: string // decimal as string
	weight: string // decimal as string
	dimensionLength: string // decimal as string (cm)
	dimensionWidth: string // decimal as string (cm)
	dimensionHeight: string // decimal as string (cm)
}

export interface CatalogCollectionItem {
	type: 'collection'
	id: string
	name: string
	description: string | null
	category: string | null
	images: string[]
	brand: {
		id: string
		name: string
		logoUrl?: string | null
	} | null
	itemCount: number
}

export type CatalogItem = CatalogAssetItem | CatalogCollectionItem

export interface CatalogListParams {
	company?: string
	brand?: string
	category?: string
	search?: string
	type?: 'asset' | 'collection' | 'all'
	limit?: number
	offset?: number
}

export interface CatalogListResponse {
	success: boolean
	items: CatalogItem[]
	total: number
	limit: number
	offset: number
}

// ========================================
// Catalog Detail Types
// ========================================

export interface CatalogAssetDetails {
	id: string
	name: string
	description: string | null
	category: string
	images: string[]
	brand: {
		id: string
		name: string
		logoUrl: string | null
	} | null
	availableQuantity: number
	totalQuantity: number
	condition: Condition
	refurbDaysEstimate?: number | null // Feedback #2: Days needed for refurbishment
	volume: string // decimal as string
	weight: string // decimal as string
	dimensionLength: string // decimal as string
	dimensionWidth: string // decimal as string
	dimensionHeight: string // decimal as string
	handlingTags: HandlingTag[]
}

export interface CatalogCollectionItemDetail {
	id: string
	name: string
	category: string
	images: string[]
	defaultQuantity: number
	availableQuantity: number
	totalQuantity: number
	condition: Condition
	refurbDaysEstimate?: number | null // Feedback #2: Days needed for refurbishment
	volume: string // decimal as string
	weight: string // decimal as string
	dimensionLength: string // decimal as string (cm)
	dimensionWidth: string // decimal as string (cm)
	dimensionHeight: string // decimal as string (cm)
	isAvailable: boolean // availableQuantity >= defaultQuantity
}

export interface CatalogCollectionDetails {
	id: string
	name: string
	description: string | null
	category: string | null
	images: string[]
	brand: {
		id: string
		name: string
		logoUrl: string | null
	} | null
	items: CatalogCollectionItemDetail[]
	totalVolume: string // decimal as string (sum of items)
	totalWeight: string // decimal as string (sum of items)
	isFullyAvailable: boolean // all items available
}

export interface CatalogAssetDetailsResponse {
	success: boolean
	asset: CatalogAssetDetails
}

export interface CatalogCollectionDetailsResponse {
	success: boolean
	collection: CatalogCollectionDetails
}
