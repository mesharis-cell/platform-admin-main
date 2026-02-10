"use client";

/**
 * Phase 6: Order Management React Query Hooks
 *
 * Client-side hooks for order creation, cart management, and order submission workflows.
 */

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    MyOrdersListParams,
    MyOrdersListResponse,
    OrderWithDetails,
    SubmitOrderRequest,
    SubmitOrderResponse,
    TruckDetailsData,
} from "@/types/order";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoiceKeys } from "./use-invoices";

// ============================================================
// Order Submission
// ============================================================

/**
 * Submit order
 */
export function useSubmitOrder(draftId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: SubmitOrderRequest): Promise<SubmitOrderResponse> => {
            const response = await fetch(`/api/orders/${draftId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to submit order");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

/**
 * Submit order directly from cart (no draft)
 */
export function useSubmitOrderFromCart() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch("/api/orders/submit-from-cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to submit order");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["client-orders"] });
            queryClient.invalidateQueries({
                queryKey: ["client-dashboard-summary"],
            });
        },
    });
}

// ============================================================
// Order Retrieval
// ============================================================

/**
 * Get order details
 */
export function useOrder(orderId: string | null) {
    return useQuery({
        queryKey: ["orders", orderId],
        queryFn: async (): Promise<OrderWithDetails> => {
            const response = await fetch(`/api/orders/${orderId}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch order");
            }

            return response.json();
        },
        enabled: !!orderId,
    });
}

/**
 * List user's orders
 */
export function useMyOrders(params: MyOrdersListParams = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.offset) queryParams.append("offset", params.offset.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    return useQuery({
        queryKey: ["orders", "my-orders", params],
        queryFn: async (): Promise<MyOrdersListResponse> => {
            const response = await fetch(`/api/orders/my-orders?${queryParams}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch orders");
            }

            return response.json();
        },
    });
}

// ============================================================
// Phase 7: Admin Order Management Hooks
// ============================================================

/**
 * List all orders for admin with filtering and search
 */
export function useAdminOrders(
    params: {
        page?: number;
        limit?: number;
        company?: string;
        brand?: string;
        order_status?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    } = {}
) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.company) queryParams.append("company_id", params.company);
    if (params.brand) queryParams.append("brand_id", params.brand);
    if (params.order_status) queryParams.append("order_status", params.order_status);
    if (params.dateFrom) queryParams.append("date_from", params.dateFrom);
    if (params.dateTo) queryParams.append("date_to", params.dateTo);
    if (params.search) queryParams.append("search_term", params.search);
    if (params.sortBy) queryParams.append("sort_by", params.sortBy);
    if (params.sortOrder) queryParams.append("sort_order", params.sortOrder);

    return useQuery({
        queryKey: ["orders", "admin-list", params],
        queryFn: async () => {
            try {
                const response = await apiClient.get(`/client/v1/order?${queryParams}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

/**
 * Get order details for admin (includes status history)
 */
export function useAdminOrderDetails(orderId: string | null) {
    return useQuery({
        queryKey: ["orders", "admin-detail", orderId],
        queryFn: async () => {
            try {
                const response = await apiClient.get(`/client/v1/order/${orderId}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!orderId,
    });
}

/**
 * Get order status history (PMG Admin only)
 */
export function useAdminOrderStatusHistory(orderId: string | null) {
    return useQuery({
        queryKey: ["orders", "admin-status-history", orderId],
        queryFn: async () => {
            try {
                const response = await apiClient.get(`/client/v1/order/${orderId}/status-history`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!orderId,
    });
}

export function useSendInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderId: string) => {
            try {
                const response = await apiClient.patch(`/client/v1/order/${orderId}/send-invoice`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            // Invalidate invoice queries
            queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables) });
            queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });

            // Invalidate order queries (status changed to PAID)
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

/**
 * Update job number (PMG Admin only)
 */
export function useUpdateJobNumber() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            job_number,
        }: {
            orderId: string;
            job_number: string | null;
        }) => {
            try {
                const response = await apiClient.patch(`/client/v1/order/${orderId}/job-number`, {
                    job_number,
                });
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            // Invalidate order details and list
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-detail", variables.orderId],
            });
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-list"],
            });
        },
    });
}

/**
 * Export orders as CSV
 */
export function useExportOrders() {
    return useMutation({
        mutationFn: async (params: {
            company?: string;
            brand?: string;
            status?: string;
            dateFrom?: string;
            dateTo?: string;
            search?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        }) => {
            const queryParams = new URLSearchParams();
            if (params.company) queryParams.append("company_id", params.company);
            if (params.brand) queryParams.append("brand_id", params.brand);
            if (params.status) queryParams.append("order_status", params.status);
            if (params.dateFrom) queryParams.append("date_from", params.dateFrom);
            if (params.dateTo) queryParams.append("date_to", params.dateTo);
            if (params.search) queryParams.append("search_term", params.search);
            if (params.sortBy) queryParams.append("sort_by", params.sortBy);
            if (params.sortOrder) queryParams.append("sort_order", params.sortOrder);

            const res = await apiClient.get(`/client/v1/order/export?${queryParams}`, {
                responseType: "blob",
            });
            return res.data;
        },
    });
}

// ============================================================
// Phase 8: Pricing & Quoting System Hooks
// ============================================================

/**
 * List orders in PRICING_REVIEW status (A2 Staff)
 */
export function usePricingReviewOrders() {
    return useQuery({
        queryKey: ["orders", "pricing-review"],
        queryFn: async () => {
            const response = await fetch("/api/admin/orders/pricing-review");

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to fetch pricing review orders");
            }

            return response.json();
        },
    });
}

/**
 * List orders in PENDING_APPROVAL status (Admin)
 */
export function usePendingApprovalOrders() {
    return useQuery({
        queryKey: ["orders", "pending-approval"],
        queryFn: async () => {
            try {
                const response = await apiClient.get("/client/v1/order/pending-approval");
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

/**
 * A2 approve standard pricing
 */
export function useA2ApproveStandard() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, notes }: { orderId: string; notes?: string }) => {
            try {
                const response = await apiClient.patch(
                    `/client/v1/order/${orderId}/approve-standard-pricing`,
                    { notes }
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["orders", "pricing-review"],
            });
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-list"],
            });
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-detail", variables.orderId],
            });
        },
    });
}

/**
 * Adjust pricing
 */
export function useAdjustPricing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            adjustedPrice,
            adjustmentReason,
        }: {
            orderId: string;
            adjustedPrice: number;
            adjustmentReason: string;
        }) => {
            try {
                const response = await apiClient.patch(
                    `/client/v1/order/${orderId}/adjust-pricing`,
                    {
                        adjusted_price: adjustedPrice,
                        adjustment_reason: adjustmentReason,
                    }
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["orders", "pricing-review"],
            });
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-list"],
            });
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-detail", variables.orderId],
            });
        },
    });
}

/**
 * PMG approve pricing
 */
export function usePMGApprovePricing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            a2BasePrice,
            pmgMarginPercent,
            pmgReviewNotes,
        }: {
            orderId: string;
            a2BasePrice: number;
            pmgMarginPercent: number;
            pmgReviewNotes?: string;
        }) => {
            try {
                const response = await apiClient.patch(
                    `/client/v1/order/${orderId}/approve-platform-pricing`,
                    {
                        logistics_base_price: a2BasePrice,
                        platform_margin_percent: pmgMarginPercent,
                        notes: pmgReviewNotes,
                    }
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["orders", "pending-approval"],
            });
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-list"],
            });
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-detail", variables.orderId],
            });
        },
    });
}

/**
 * Client approve quote
 */
export function useClientApproveQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, notes }: { orderId: string; notes?: string }) => {
            const response = await fetch(`/api/client/orders/${orderId}/quote/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to approve quote");
            }

            return response.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["client-order-detail", variables.orderId],
            });
            queryClient.invalidateQueries({ queryKey: ["client-orders"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "my-orders"] });
        },
    });
}

/**
 * Client decline quote
 */
export function useClientDeclineQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            declineReason,
        }: {
            orderId: string;
            declineReason: string;
        }) => {
            const response = await fetch(`/api/client/orders/${orderId}/quote/decline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ declineReason }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to decline quote");
            }

            return response.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["client-order-detail", variables.orderId],
            });
            queryClient.invalidateQueries({ queryKey: ["client-orders"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "my-orders"] });
        },
    });
}

// ============================================================
// Phase: Hybrid Pricing Workflow Hooks (NEW)
// ============================================================

/**
 * Submit order for Admin approval (Logistics → Admin)
 */
export function useSubmitForApproval() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderId: string) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/order/${orderId}/submit-for-approval`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["orders", "pricing-review"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "pending-approval"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "admin-list"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "admin-detail", variables] });
        },
    });
}

/**
 * Admin approve quote and send to client
 */
export function useAdminApproveQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            marginOverridePercent,
            marginOverrideReason,
        }: {
            orderId: string;
            marginOverridePercent?: number;
            marginOverrideReason?: string;
        }) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/order/${orderId}/admin-approve-quote`,
                    {
                        margin_override_percent: marginOverridePercent,
                        margin_override_reason: marginOverrideReason,
                    }
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["orders", "pending-approval"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "admin-list"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "admin-detail", variables.orderId] });
        },
    });
}

/**
 * Admin returns order to Logistics for revisions
 */
export function useReturnToLogistics() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/order/${orderId}/return-to-logistics`,
                    {
                        reason,
                    }
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["orders", "pending-approval"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "pricing-review"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "admin-list"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "admin-detail", variables.orderId] });
        },
    });
}

/**
 * Cancel order (Admin only)
 */
export function useCancelOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            reason,
            notes,
            notifyClient,
        }: {
            orderId: string;
            reason: string;
            notes: string;
            notifyClient: boolean;
        }) => {
            try {
                const response = await apiClient.post(`/client/v1/order/${orderId}/cancel`, {
                    reason,
                    notes,
                    notify_client: notifyClient,
                });
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["orders", "admin-detail", variables.orderId] });
        },
    });
}

/**
 * Update order vehicle type (Logistics)
 */
export function useUpdateOrderVehicle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            vehicleType,
            reason,
        }: {
            orderId: string;
            vehicleType: string;
            reason: string;
        }) => {
            try {
                const response = await apiClient.patch(`/client/v1/order/${orderId}/vehicle`, {
                    vehicle_type_id: vehicleType,
                    reason,
                });
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-detail", variables.orderId],
            });
            queryClient.invalidateQueries({ queryKey: ["orders", "pricing-review"] });
        },
    });
}

/**
 * Update order vehicle type (Logistics)
 */
export function useAddTruckDetails() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            truckType,
            payload
        }: {
            orderId: string;
            truckType: "DELIVERY" | "PICKUP";
            payload: TruckDetailsData;
        }) => {
            try {
                const details = {
                    truck_plate: payload.truckPlate,
                    driver_name: payload.driverName,
                    driver_contact: payload.driverContact,
                    truck_size: payload.truckSize,
                    tailgate_required: payload.tailgateRequired,
                    manpower: payload.manpower,
                    notes: payload.notes,
                };

                const requestBody = truckType === "DELIVERY"
                    ? { delivery_truck_details: details }
                    : { pickup_truck_details: details };

                const response = await apiClient.patch(`/client/v1/order/${orderId}/truck-details`, requestBody);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-detail", variables.orderId],
            });
            queryClient.invalidateQueries({ queryKey: ["orders", "pricing-review"] });
        },
    });
}

export function useUpdateOrderPricing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({orderId, pricingId, rate}: {orderId: string, pricingId: string, rate: number}) => {
            try {
                const response = await apiClient.patch(`/operations/v1/price/transport/${pricingId}`, {transport_rate: rate});
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["orders", "admin-detail", variables.orderId],
            });
            queryClient.invalidateQueries({ queryKey: ["orders", "pricing-review"] });
        },
    });
}