/**
 * Phase 5: Pricing Tiers React Query Hooks
 * Custom hooks for pricing tier management operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	PricingTier,
	CreatePricingTierRequest,
	UpdatePricingTierRequest,
	PricingTierListParams,
	PricingTierListResponse,
	TogglePricingTierRequest,
	CalculatePricingParams,
	CalculatePricingResponse,
} from "@/types/pricing";

/**
 * List pricing tiers with filtering
 */
export function usePricingTiers(params: PricingTierListParams = {}) {
	const queryParams = new URLSearchParams();

	if (params.country) queryParams.set("country", params.country);
	if (params.city) queryParams.set("city", params.city);
	if (params.isActive !== undefined)
		queryParams.set("isActive", params.isActive.toString());
	if (params.sortBy) queryParams.set("sortBy", params.sortBy);
	if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);
	if (params.page) queryParams.set("page", params.page.toString());
	if (params.pageSize) queryParams.set("pageSize", params.pageSize.toString());

	return useQuery<PricingTierListResponse>({
		queryKey: ["pricing-tiers", params],
		queryFn: async () => {
			const response = await fetch(
				`/api/pricing-tiers?${queryParams.toString()}`
			);
			if (!response.ok) throw new Error("Failed to fetch pricing tiers");
			return response.json();
		},
	});
}

/**
 * Get single pricing tier by ID
 */
export function usePricingTier(id: string | null) {
	return useQuery<{ success: boolean; data: PricingTier }>({
		queryKey: ["pricing-tier", id],
		queryFn: async () => {
			if (!id) throw new Error("Pricing tier ID is required");
			const response = await fetch(`/api/pricing-tiers/${id}`);
			if (!response.ok) throw new Error("Failed to fetch pricing tier");
			return response.json();
		},
		enabled: !!id,
	});
}

/**
 * Create new pricing tier
 */
export function useCreatePricingTier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreatePricingTierRequest) => {
			const response = await fetch("/api/pricing-tiers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to create pricing tier");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
		},
	});
}

/**
 * Update pricing tier
 */
export function useUpdatePricingTier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: UpdatePricingTierRequest;
		}) => {
			const response = await fetch(`/api/pricing-tiers/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to update pricing tier");
			}

			return response.json();
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
			queryClient.invalidateQueries({
				queryKey: ["pricing-tier", variables.id],
			});
		},
	});
}

/**
 * Toggle pricing tier active status
 */
export function useTogglePricingTier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			isActive,
		}: {
			id: string;
			isActive: boolean;
		}) => {
			const response = await fetch(`/api/pricing-tiers/${id}/toggle`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isActive }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to toggle pricing tier");
			}

			return response.json();
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
			queryClient.invalidateQueries({
				queryKey: ["pricing-tier", variables.id],
			});
		},
	});
}

/**
 * Delete pricing tier
 */
export function useDeletePricingTier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`/api/pricing-tiers/${id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to delete pricing tier");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
		},
	});
}

/**
 * Calculate pricing for given volume and location
 * Used for order estimation in Phase 6+
 */
export function useCalculatePricing(params: CalculatePricingParams | null) {
	const queryParams = new URLSearchParams();

	if (params?.country) queryParams.set("country", params.country);
	if (params?.city) queryParams.set("city", params.city);
	if (params?.volume !== undefined)
		queryParams.set("volume", params.volume.toString());

	return useQuery<CalculatePricingResponse>({
		queryKey: ["pricing-calculate", params],
		queryFn: async () => {
			if (!params) throw new Error("Pricing calculation parameters required");

			const response = await fetch(
				`/api/pricing-tiers/calculate?${queryParams.toString()}`
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to calculate pricing");
			}

			return response.json();
		},
		enabled: !!params && !!params.country && !!params.city && params.volume >= 0,
		retry: false, // Don't retry if no tier found
	});
}
