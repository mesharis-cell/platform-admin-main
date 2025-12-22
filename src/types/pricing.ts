/**
 * Phase 5: Pricing Configuration Types
 * TypeScript types for pricing tier management
 */

/**
 * Pricing Tier Entity
 * Represents volume-based and location-based pricing structure
 */
export interface PricingTier {
	id: string;
	country: string;
	city: string;
	volumeMin: number; // Minimum cubic meters for this tier
	volumeMax: number; // Maximum cubic meters for this tier (exclusive boundary)
	basePrice: number; // A2 Logistics base cost for this tier
	isActive: boolean; // Enable or disable pricing structure
	createdAt: string;
	updatedAt: string;
}

/**
 * Create Pricing Tier Request
 * Payload for creating new pricing tier
 */
export interface CreatePricingTierRequest {
	country: string;
	city: string;
	volumeMin: number;
	volumeMax: number;
	basePrice: number;
	isActive?: boolean; // Optional, defaults to true
}

/**
 * Update Pricing Tier Request
 * Payload for updating existing pricing tier
 * Country and city cannot be changed (create new tier instead)
 */
export interface UpdatePricingTierRequest {
	volumeMin?: number;
	volumeMax?: number;
	basePrice?: number;
	isActive?: boolean;
}

/**
 * Pricing Tier List Query Parameters
 * Query parameters for filtering pricing tier list
 */
export interface PricingTierListParams {
	country?: string;
	city?: string;
	isActive?: boolean;
	sortBy?: "createdAt" | "country" | "city" | "volumeMin" | "basePrice";
	sortOrder?: "asc" | "desc";
	page?: number;
	pageSize?: number;
}

/**
 * Pricing Tier List Response
 * Response format for listing pricing tiers
 */
export interface PricingTierListResponse {
	success: boolean;
	data: PricingTier[];
	meta: {
		total: number;
		page: number;
		pageSize: number;
	};
}

/**
 * Calculate Pricing Query Parameters
 * Parameters for calculating A2 base price
 */
export interface CalculatePricingParams {
	country: string;
	city: string;
	volume: number; // Total order volume in m³
}

/**
 * Calculate Pricing Response
 * Response with matched pricing tier details
 */
export interface CalculatePricingResponse {
	success: boolean;
	data: {
		pricingTierId: string;
		country: string;
		city: string;
		volumeMin: number;
		volumeMax: number;
		basePrice: number;
		matchedVolume: number;
	};
}

/**
 * Toggle Pricing Tier Request
 * Payload for activating/deactivating pricing tier
 */
export interface TogglePricingTierRequest {
	isActive: boolean;
}

// Validation types are exported from types/phase2.ts to avoid duplicates
