/**
 * React Query hooks for condition management operations (Phase 12)
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	UpdateConditionRequest,
	UpdateConditionResponse,
	CompleteMaintenanceRequest,
	CompleteMaintenanceResponse,
	GetConditionHistoryResponse,
	ItemsNeedingAttentionParams,
	ItemsNeedingAttentionResponse,
	AddMaintenanceNotesRequest,
	AddMaintenanceNotesResponse,
	FilterByConditionParams,
	FilterByConditionResponse,
	UploadDamagePhotosResponse,
} from "@/types/condition";

// ===== Update Condition =====

export function useUpdateCondition() {
	const queryClient = useQueryClient();

	return useMutation<
		UpdateConditionResponse,
		Error,
		UpdateConditionRequest
	>({
		mutationFn: async (data: UpdateConditionRequest) => {
			const response = await fetch("/api/conditions/update", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to update condition");
			}

			return response.json();
		},
		onSuccess: (data) => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({
				queryKey: ["condition-history", data.asset.id],
			});
			queryClient.invalidateQueries({ queryKey: ["items-needing-attention"] });
			queryClient.invalidateQueries({ queryKey: ["assets"] });
			queryClient.invalidateQueries({
				queryKey: ["asset", data.asset.id],
			});
		},
	});
}

// ===== Complete Maintenance =====

export function useCompleteMaintenance() {
	const queryClient = useQueryClient();

	return useMutation<
		CompleteMaintenanceResponse,
		Error,
		CompleteMaintenanceRequest
	>({
		mutationFn: async (data: CompleteMaintenanceRequest) => {
			const response = await fetch("/api/conditions/maintenance/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to complete maintenance");
			}

			return response.json();
		},
		onSuccess: (data) => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({
				queryKey: ["condition-history", data.asset.id],
			});
			queryClient.invalidateQueries({ queryKey: ["items-needing-attention"] });
			queryClient.invalidateQueries({ queryKey: ["assets"] });
			queryClient.invalidateQueries({
				queryKey: ["asset", data.asset.id],
			});
		},
	});
}

// ===== Get Condition History =====

export function useConditionHistory(assetId: string) {
	return useQuery<GetConditionHistoryResponse, Error>({
		queryKey: ["condition-history", assetId],
		queryFn: async () => {
			const response = await fetch(
				`/api/conditions/history/${assetId}`
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || "Failed to fetch condition history"
				);
			}

			return response.json();
		},
		enabled: !!assetId,
	});
}

// ===== Get Items Needing Attention =====

export function useItemsNeedingAttention(
	params: ItemsNeedingAttentionParams = {}
) {
	const queryParams = new URLSearchParams();

	if (params.condition) queryParams.set("condition", params.condition);
	if (params.company) queryParams.set("company", params.company);
	if (params.warehouse) queryParams.set("warehouse", params.warehouse);
	if (params.zone) queryParams.set("zone", params.zone);
	if (params.page) queryParams.set("page", params.page.toString());
	if (params.limit) queryParams.set("limit", params.limit.toString());

	return useQuery<ItemsNeedingAttentionResponse, Error>({
		queryKey: ["items-needing-attention", params],
		queryFn: async () => {
			const response = await fetch(
				`/api/conditions/needing-attention?${queryParams}`
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || "Failed to fetch items needing attention"
				);
			}

			return response.json();
		},
	});
}

// ===== Add Maintenance Notes =====

export function useAddMaintenanceNotes() {
	const queryClient = useQueryClient();

	return useMutation<
		AddMaintenanceNotesResponse,
		Error,
		AddMaintenanceNotesRequest
	>({
		mutationFn: async (data: AddMaintenanceNotesRequest) => {
			const response = await fetch("/api/conditions/notes/add", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to add maintenance notes");
			}

			return response.json();
		},
		onSuccess: (data, variables) => {
			// Invalidate condition history for the asset
			queryClient.invalidateQueries({
				queryKey: ["condition-history", variables.assetId],
			});
		},
	});
}

// ===== Filter Assets by Condition =====

export function useFilterAssetsByCondition(params: FilterByConditionParams) {
	const queryParams = new URLSearchParams();

	queryParams.set("condition", params.condition);
	if (params.company) queryParams.set("company", params.company);
	if (params.warehouse) queryParams.set("warehouse", params.warehouse);
	if (params.zone) queryParams.set("zone", params.zone);
	if (params.page) queryParams.set("page", params.page.toString());
	if (params.limit) queryParams.set("limit", params.limit.toString());

	return useQuery<FilterByConditionResponse, Error>({
		queryKey: ["filter-assets-by-condition", params],
		queryFn: async () => {
			const response = await fetch(
				`/api/assets/filter-by-condition?${queryParams}`
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || "Failed to filter assets by condition"
				);
			}

			return response.json();
		},
		enabled: !!params.condition,
	});
}

// ===== Upload Damage Photos =====

export function useUploadDamagePhotos() {
	return useMutation<
		UploadDamagePhotosResponse,
		Error,
		{ files: File[]; assetId: string }
	>({
		mutationFn: async ({ files, assetId }) => {
			const formData = new FormData();
			formData.append("assetId", assetId);

			files.forEach((file) => {
				formData.append("files", file);
			});

			const response = await fetch("/api/uploads/damage-photos", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to upload damage photos");
			}

			return response.json();
		},
	});
}
