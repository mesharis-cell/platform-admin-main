"use client";

/**
 * React Query hooks for scanning operations
 * Phase 11: QR Code Scanning & Inventory Tracking
 */

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    CompleteOutboundScanResponse,
    GetAssetScanHistoryResponse,
    GetInventoryAvailabilityResponse,
    GetScanEventsResponse,
    InventoryAvailabilityParams,
    OutboundScanResponse,
    UploadTruckPhotosResponse,
    APIOutboundProgressResponse,
} from "@/types/scanning";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================
// Outbound Scanning Functions
// ============================================================

const getOutboundScanProgress = async (orderId: string): Promise<APIOutboundProgressResponse> => {
    try {
        const response = await apiClient.get<APIOutboundProgressResponse>(
            `/operations/v1/scanning/outbound/${orderId}/progress`
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const scanOutboundItem = async (data: {
    orderId: string;
    qrCode: string;
    quantity?: number;
}): Promise<OutboundScanResponse> => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/outbound/${data.orderId}/scan`,
            {
                qr_code: data.qrCode,
                quantity: data.quantity,
            }
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const uploadTruckPhotos = async (data: {
    orderId: string;
    photos: string[];
}): Promise<UploadTruckPhotosResponse> => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/outbound/${data.orderId}/truck-photos`,
            data
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const completeOutboundScan = async (data: {
    orderId: string;
}): Promise<CompleteOutboundScanResponse> => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/outbound/${data.orderId}/complete`,
            {}
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

// ============================================================
// Outbound Scanning Hooks (Stateless)
// ============================================================

export function useOutboundScanProgress(orderId: string | null) {
    return useQuery({
        queryKey: ["outboundScanProgress", orderId],
        queryFn: () => getOutboundScanProgress(orderId!),
        enabled: !!orderId,
        refetchInterval: 3000, // Poll every 3 seconds for real-time updates
    });
}

export function useScanOutboundItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: scanOutboundItem,
        onSuccess: (_, variables) => {
            // Invalidate progress query
            queryClient.invalidateQueries({
                queryKey: ["outboundScanProgress", variables.orderId],
            });
        },
    });
}

export function useUploadTruckPhotos() {
    return useMutation({
        mutationFn: uploadTruckPhotos,
    });
}

export function useCompleteOutboundScan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: completeOutboundScan,
        onSuccess: (data) => {
            // Invalidate order details
            queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
            queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
            queryClient.invalidateQueries({
                queryKey: ["outboundScanProgress", data.orderId],
            });
        },
    });
}

// ============================================================
// Inbound Scanning Functions
// ============================================================

const getInboundScanProgress = async (orderId: string) => {
    try {
        const response = await apiClient.get(`/operations/v1/scanning/inbound/${orderId}/progress`);
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const scanInboundItem = async (data: {
    orderId: string;
    qrCode: string;
    condition: "GREEN" | "ORANGE" | "RED";
    notes?: string;
    photos?: string[];
    refurbDaysEstimate?: number;
    discrepancyReason?: "BROKEN" | "LOST" | "OTHER";
    quantity?: number;
}) => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/inbound/${data.orderId}/scan`,
            {
                qr_code: data.qrCode,
                condition: data.condition,
                notes: data.notes,
                photos: data.photos,
                refurb_days_estimate: data.refurbDaysEstimate,
                discrepancy_reason: data.discrepancyReason,
                quantity: data.quantity,
            }
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const completeInboundScan = async (data: { orderId: string }) => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/inbound/${data.orderId}/complete`,
            {}
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

// ============================================================
// Inbound Scanning Hooks (Stateless)
// ============================================================

export function useInboundScanProgress(orderId: string | null) {
    return useQuery({
        queryKey: ["inboundScanProgress", orderId],
        queryFn: () => getInboundScanProgress(orderId!),
        enabled: !!orderId,
        refetchInterval: 3000,
    });
}

export function useScanInboundItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: scanInboundItem,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["inboundScanProgress", variables.orderId],
            });
        },
    });
}

export function useCompleteInboundScan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: completeInboundScan,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
            queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({
                queryKey: ["inboundScanProgress", data.orderId],
            });
        },
    });
}

// ============================================================
// History & Inventory Functions
// ============================================================

const getOrderScanEvents = async (orderId: string): Promise<GetScanEventsResponse> => {
    try {
        const response = await apiClient.get(`/client/v1/order/${orderId}/scan-events`);
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const getAssetScanHistory = async (assetId: string): Promise<GetAssetScanHistoryResponse> => {
    try {
        const response = await apiClient.get(`/operations/v1/assets/${assetId}/scan-history`);
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const getInventoryAvailability = async (
    params: InventoryAvailabilityParams
): Promise<GetInventoryAvailabilityResponse> => {
    try {
        const response = await apiClient.get("/operations/v1/inventory/availability", { params });
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

// ============================================================
// Scan History Hooks
// ============================================================

export function useOrderScanEvents(orderId: string) {
    return useQuery({
        queryKey: ["orderScanEvents", orderId],
        queryFn: () => getOrderScanEvents(orderId),
        enabled: !!orderId,
    });
}

export function useAssetScanHistory(assetId: string) {
    return useQuery({
        queryKey: ["assetScanHistory", assetId],
        queryFn: () => getAssetScanHistory(assetId),
        enabled: !!assetId,
    });
}

// ============================================================
// Inventory Tracking Hooks
// ============================================================

export function useInventoryAvailability(params: InventoryAvailabilityParams) {
    return useQuery({
        queryKey: ["inventoryAvailability", params],
        queryFn: () => getInventoryAvailability(params),
        refetchInterval: 10000,
    });
}
