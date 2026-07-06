"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

// ----------------------------------- KEYS ---------------------------------------------------

export const selfPickupKeys = {
    list: (params?: Record<string, unknown>) => ["self-pickups", params] as const,
    detail: (id: string | null) => ["self-pickup", id] as const,
    statusHistory: (id: string | null) => ["self-pickup-status-history", id] as const,
    changeHistory: (id: string | null) => ["self-pickup-change-history", id] as const,
};

// ----------------------------------- LIST (ADMIN) -------------------------------------------

export function useAdminSelfPickups(
    params: {
        page?: number;
        limit?: number;
        company?: string;
        brand?: string;
        self_pickup_status?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: string;
    } = {}
) {
    return useQuery({
        queryKey: selfPickupKeys.list(params),
        queryFn: async () => {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== "") query.set(key, String(value));
            });
            const { data } = await apiClient.get(`/operations/v1/self-pickup?${query.toString()}`);
            return data;
        },
    });
}

// ----------------------------------- DETAIL -------------------------------------------------

export function useAdminSelfPickupDetails(id: string | null) {
    return useQuery({
        queryKey: selfPickupKeys.detail(id),
        queryFn: async () => {
            const { data } = await apiClient.get(`/operations/v1/self-pickup/${id}`);
            return data;
        },
        enabled: !!id,
        // Auto-refresh pricing snapshot — see useAdminOrderDetails for rationale.
        staleTime: 30_000,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
    });
}

// ----------------------------------- STATUS HISTORY -----------------------------------------

export function useAdminSelfPickupStatusHistory(id: string | null) {
    return useQuery({
        queryKey: selfPickupKeys.statusHistory(id),
        queryFn: async () => {
            const { data } = await apiClient.get(`/operations/v1/self-pickup/${id}/status-history`);
            return data;
        },
        enabled: !!id,
    });
}

// ----------------------------------- CHANGE HISTORY -----------------------------------------

/**
 * Self-pickup field-level change history (Order Editing — Phase 4, read-only).
 *
 * Returns newest-first rows of field-level edits (old → new + who + on-behalf-of).
 * ADMIN + LOGISTICS may view (the /operations/v1 base). Mirrors the order
 * change-history hook and the warehouse useAdminSelfPickupChangeHistory.
 */
export function useAdminSelfPickupChangeHistory(id: string | null) {
    return useQuery({
        queryKey: selfPickupKeys.changeHistory(id),
        queryFn: async () => {
            const { data } = await apiClient.get(`/operations/v1/self-pickup/${id}/change-history`);
            return data;
        },
        enabled: !!id,
    });
}

// ----------------------------------- MUTATIONS ----------------------------------------------

export function useSubmitForApproval() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(
                `/operations/v1/self-pickup/${id}/submit-for-approval`
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useAdminApproveQuote() {
    const qc = useQueryClient();
    return useMutation({
        // Blanket margin-override retired (P1-6): the approve schema is empty-strict,
        // so any margin_override_* key 400s. Per-line sell/margin now lives in the
        // PricingLedger; approve is a one-click send (decision 8).
        mutationFn: async ({ id }: { id: string }) => {
            const { data } = await apiClient.post(`/operations/v1/self-pickup/${id}/approve`, {});
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useReturnToLogisticsSelfPickup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const { data } = await apiClient.post(
                `/operations/v1/self-pickup/${id}/return-to-logistics`,
                { reason }
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

// Ops-triggered return — admin or logistics can flip PICKED_UP → AWAITING_RETURN
// when the client hasn't clicked "Start Return" on their portal. Matches the
// /operations/v1/self-pickup/:id/trigger-return ADMIN+LOGISTICS route.
export function useOpsTriggerSelfPickupReturn() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(
                `/operations/v1/self-pickup/${id}/trigger-return`
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useMarkReadyForPickup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(
                `/operations/v1/self-pickup/${id}/ready-for-pickup`
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useCancelSelfPickup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            reason,
            notes,
            notifyClient,
        }: {
            id: string;
            reason: string;
            notes?: string;
            notifyClient?: boolean;
        }) => {
            const { data } = await apiClient.post(`/operations/v1/self-pickup/${id}/cancel`, {
                reason,
                notes,
                notify_client: notifyClient,
            });
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

export function useMarkSelfPickupNoCost() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(`/operations/v1/self-pickup/${id}/mark-no-cost`);
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
            qc.invalidateQueries({ queryKey: ["self-pickup-status-history"] });
        },
        onError: throwApiError,
    });
}

// ----------------------------------- EDIT DETAILS (ADMIN, Order-Editing P4) -----------------

/**
 * Admin-side self-pickup edit payload. Mirrors the order OrderEditDetailsPayload
 * but for the SP field set (no permit, no venue). Send ONLY the changed keys —
 * every field is optional on the API side (editSelfPickupSchema). The ops endpoint
 * (PATCH /operations/v1/self-pickup/:id, ADMIN + self_pickups:edit_details) only
 * permits edits while the pickup is in the pre-confirmation band
 * (SUBMITTED | PRICING_REVIEW | PENDING_APPROVAL | QUOTED) and returns a 409/400
 * otherwise; callers should surface `error.message` (already unwrapped by throwApiError).
 *
 * Nullable string fields (collector_email / notes / special_instructions / po_number /
 * job_number / expected_return_at) accept `null` to CLEAR them server-side.
 */
export interface SelfPickupEditDetailsPayload {
    collector_name?: string;
    collector_phone?: string;
    collector_email?: string | null;
    notes?: string | null;
    special_instructions?: string | null;
    is_permanent_placement?: boolean;
    po_number?: string | null;
    // Admin-allowed (clients never touch this).
    job_number?: string | null;
    // Tier C — pickup window inputs (drive the booking window via reconcileBookings).
    // Sent as ISO strings; the server re-derives the booking window and may 409 on
    // availability. Editing a QUOTED pickup's window bounces it back to PRICING_REVIEW.
    pickup_window?: { start: string; end: string };
    // ISO string or null (clearable).
    expected_return_at?: string | null;
    // Item ops — same op model as orders (UPDATE / ADD / REMOVE). SP items are flat:
    // `order_item_id` is the self_pickup_items PK. SP items carry NO maintenance fields.
    //   • UPDATE — { order_item_id, quantity } (op optional; back-compat default).
    //   • ADD    — { op: "ADD", asset_id, quantity }.
    //   • REMOVE — { op: "REMOVE", order_item_id }.
    // Server reconciles bookings (availability-checked: 409 on conflict) and reprices.
    // An item op on a QUOTED pickup bounces it to PRICING_REVIEW. Omit `items` when none.
    items?: Array<{
        op?: "UPDATE" | "ADD" | "REMOVE";
        order_item_id?: string;
        asset_id?: string;
        quantity?: number;
    }>;
}

/**
 * Admin self-pickup detail edit (Order Editing — Phase 4 retrofit).
 *
 * PATCHes /operations/v1/self-pickup/:id with the changed-keys payload. Mirrors
 * useOrderEditDetails: on success it invalidates the SP detail, the SP list, the
 * status history (a Tier-C edit on a QUOTED pickup reverts it to PRICING_REVIEW),
 * and the change-history timeline — all the SP query keys this app uses.
 */
export function useEditSelfPickupDetails() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({
            selfPickupId,
            payload,
        }: {
            selfPickupId: string;
            payload: SelfPickupEditDetailsPayload;
        }) => {
            try {
                const { data } = await apiClient.patch(
                    `/operations/v1/self-pickup/${selfPickupId}`,
                    payload
                );
                return data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_data, variables) => {
            // Detail view (pricing / status may have changed).
            qc.invalidateQueries({ queryKey: selfPickupKeys.detail(variables.selfPickupId) });
            // List + ops queue (status may have reverted to PRICING_REVIEW).
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            // Status history (revert appends a row) + field-level change history.
            qc.invalidateQueries({
                queryKey: selfPickupKeys.statusHistory(variables.selfPickupId),
            });
            qc.invalidateQueries({
                queryKey: selfPickupKeys.changeHistory(variables.selfPickupId),
            });
        },
    });
}

export function useUpdateSelfPickupJobNumber() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, job_number }: { id: string; job_number: string | null }) => {
            const { data } = await apiClient.patch(`/operations/v1/self-pickup/${id}/job-number`, {
                job_number,
            });
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
        },
        onError: throwApiError,
    });
}
