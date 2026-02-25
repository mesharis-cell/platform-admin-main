"use client";

// Phase 4: Collections React Query Hooks

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    Collection,
    CollectionWithDetails,
    CollectionListParams,
    CreateCollectionRequest,
    UpdateCollectionRequest,
    AddCollectionItemRequest,
    UpdateCollectionItemRequest,
    CollectionAvailabilityResponse,
} from "@/types/collection";
import { apiClient } from "@/lib/api/api-client";
import { error } from "console";
import { throwApiError } from "@/lib/utils/throw-api-error";

// ========================================
// Collection Query Hooks
// ========================================

export function useCollections(params: CollectionListParams = {}) {
    return useQuery({
        queryKey: ["collections", params],
        queryFn: async () => {
            try {
                const queryParams = new URLSearchParams();

                if (params.company_id && params.company_id !== "_all_")
                    queryParams.set("company_id", params.company_id);
                if (params.brand_id && params.brand_id !== "_all_")
                    queryParams.set("brand_id", params.brand_id);
                if (params.category) queryParams.set("category", params.category);
                if (params.search_term) queryParams.set("search_term", params.search_term);
                if (params.includeDeleted) queryParams.set("includeDeleted", "true");
                if (params.limit) queryParams.set("limit", params.limit.toString());
                if (params.offset) queryParams.set("offset", params.offset.toString());

                const response = await apiClient.get("/operations/v1/collection", {
                    params: queryParams,
                });

                return response.data;
            } catch (error) {
                console.error("Failed to fetch collections:", error);
                throw new Error("Failed to fetch collections");
            }
        },
        staleTime: 30000, // 30 seconds
    });
}

export function useCollection(id: string | undefined) {
    return useQuery({
        queryKey: ["collections", id],
        queryFn: async () => {
            try {
                if (!id) throw new Error("Collection ID required");

                const response = await apiClient.get(`/operations/v1/collection/${id}`);

                return response.data;
            } catch (error) {
                console.error("Failed to fetch collection:", error);
                throw new Error("Failed to fetch collection");
            }
        },
        enabled: !!id,
        staleTime: 30000,
    });
}

export function useCollectionAvailability(
    id: string | undefined,
    eventStartDate: string,
    eventEndDate: string
) {
    return useQuery({
        queryKey: ["collections", id, "availability", eventStartDate, eventEndDate],
        queryFn: async () => {
            try {
                if (!id) throw new Error("Collection ID required");

                const queryParams = new URLSearchParams({
                    eventStartDate,
                    eventEndDate,
                });

                const response = await apiClient.get(
                    `/operations/v1/collection/${id}/availability?${queryParams.toString()}`
                );

                return response.data;
            } catch (error) {
                console.error("Failed to fetch collection availability:", error);
                throw new Error("Failed to fetch collection availability");
            }
        },
        enabled: !!id && !!eventStartDate && !!eventEndDate,
        staleTime: 10000, // 10 seconds (fresher data for availability)
    });
}

// ========================================
// Collection Mutation Hooks
// ========================================

export function useCreateCollection() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateCollectionRequest) => {
            try {
                const response = await apiClient.post("/operations/v1/collection", data);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });
}

export function useUpdateCollection(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateCollectionRequest) => {
            try {
                const response = await apiClient.patch(`/operations/v1/collection/${id}`, data);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
            queryClient.invalidateQueries({ queryKey: ["collections", id] });
        },
    });
}

export function useDeleteCollection() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(`/operations/v1/collection/${id}`);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });
}

// ========================================
// Collection Item Mutation Hooks
// ========================================

export function useAddCollectionItem(collectionId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AddCollectionItemRequest) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/collection/${collectionId}/items`,
                    data
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });
}

export function useUpdateCollectionItem(collectionId: string, itemId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateCollectionItemRequest) => {
            try {
                const response = await apiClient.put(
                    `/operations/v1/collection/${collectionId}/items/${itemId}`,
                    data
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
        },
    });
}

export function useRemoveCollectionItem(collectionId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (itemId: string) => {
            try {
                const response = await apiClient.delete(
                    `/operations/v1/collection/${collectionId}/items/${itemId}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });
}

// ========================================
// Collection Image Upload Hook
// ========================================

export function useUploadCollectionImages() {
    return useMutation({
        mutationFn: async (files: File[]) => {
            try {
                const formData = new FormData();

                files.forEach((file) => {
                    formData.append("images", file);
                });

                const response = await apiClient.post("/operations/v1/collection/images", formData);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}
