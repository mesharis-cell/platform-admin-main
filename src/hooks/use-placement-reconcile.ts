"use client";

/**
 * RL-003 — the ADMIN late-placement reconciliation, both arms.
 *
 * The case: goods are already out on an ORDINARY order or self-pickup and the
 * client decides late that they are keeping them. ADMIN converts the entity to a
 * permanent placement here, which stops the stock ever being expected back and
 * makes its inventory hold open-ended.
 *
 * ONE-WAY. Permanent → ordinary is not supported; there is no reverse route.
 *
 *   ORDER        POST /operations/v1/order/:id/placement-reconcile
 *                auth("ADMIN") + orders:edit_details
 *   SELF_PICKUP  POST /operations/v1/self-pickup/:id/placement-reconcile
 *                auth("ADMIN") + self_pickups:edit_details + enable_self_pickup
 *
 * ONE body shape serves both arms (the API declares it once, in
 * `orderSchemas.placementReconcileSchema`, and the self-pickup routes import
 * it), so this hook does the same rather than keeping a divergent copy.
 *
 * The response's `future_booking_clashes` is a read-and-print: every booking on
 * an affected asset that starts AFTER the hold this action just made open-ended
 * would have ended. Nothing is computed from it and the conversion is never
 * gated on it — the owner's decision is that a printed list read by a human is
 * the whole of the control. It arrives ONLY on this POST; there is no GET that
 * previews it.
 */

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { selfPickupKeys } from "./use-self-pickups";

export type PlacementParentType = "ORDER" | "SELF_PICKUP";

export interface PlacementReconcilePayload {
    /** 5–500 characters, trimmed. INTERNAL — reaches the audit event only. */
    reason: string;
    /** Required literal `true`. The request is refused without it. */
    acknowledge_open_ended: true;
}

/**
 * One later commitment the now open-ended hold overlaps. Field names are the
 * API's `FutureBookingClash` verbatim (`api/src/app/services/placement-reconcile.service.ts`).
 * Dates arrive as ISO strings over the wire; `blocked_until` is null when that
 * booking is itself open-ended.
 */
export interface FutureBookingClash {
    asset_id: string;
    asset_name: string;
    booking_id: string;
    parent_type: PlacementParentType;
    parent_human_id: string;
    company_name: string;
    quantity: number;
    blocked_from: string;
    blocked_until: string | null;
}

export interface PlacementReconcileResult {
    entity_type: PlacementParentType;
    entity_id: string;
    human_id: string;
    status: string;
    is_permanent_placement: boolean;
    /** true when the entity was ALREADY in the state this action produces — a no-op, not a failure. */
    already_reconciled: boolean;
    /** true when the same call also moved the entity to PLACED. */
    placed: boolean;
    return_date_cleared: boolean;
    /** Order arm only — the collection window is cleared on the same rule as the return date. */
    pickup_window_cleared: boolean;
    /**
     * Order arm only — the window the CLIENT originally requested is a separate
     * column from the confirmed one above, so it is reported separately.
     */
    requested_pickup_window_cleared: boolean;
    bookings_made_open_ended: number;
    /**
     * RL-037's dispatch work, present only when the goods were already dispatched.
     * Serialized asset rows are stamped PLACED; pooled stock STAYS HELD on its
     * open-ended booking — the dispatch write-off was reversed by owner decision
     * on 2026-08-06, so `pooled_written_off` is always [] and
     * `total_units_written_off` is always 0. The keys survive for payload-shape
     * continuity, and the card's write-off panel (keyed on `> 0`) never renders.
     */
    custody_exit: {
        pooled_written_off: Array<{
            item_id: string;
            asset_id: string;
            asset_name: string;
            qty: number;
        }>;
        serialized_placed_count: number;
        total_units_written_off: number;
    } | null;
    future_booking_clashes: FutureBookingClash[];
    correlation_id: string;
}

/** The standard sendResponse envelope. The API's own wording is on `message`. */
export interface PlacementReconcileResponse {
    success: boolean;
    message: string;
    data: PlacementReconcileResult;
}

const pathFor = (parentType: PlacementParentType, entityId: string): string =>
    parentType === "ORDER"
        ? `/operations/v1/order/${entityId}/placement-reconcile`
        : `/operations/v1/self-pickup/${entityId}/placement-reconcile`;

export function usePlacementReconcile(parentType: PlacementParentType, entityId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: PlacementReconcilePayload) => {
            try {
                const response = await apiClient.post(pathFor(parentType, entityId), payload);
                return response.data as PlacementReconcileResponse;
            } catch (error) {
                return throwApiError(error);
            }
        },
        onSuccess: () => {
            if (parentType === "ORDER") {
                // Prefix-invalidates the detail, the list, every ops queue, the
                // status history and the change-history timeline — all of which
                // key off ["orders", …].
                queryClient.invalidateQueries({ queryKey: ["orders"] });
            } else {
                queryClient.invalidateQueries({ queryKey: selfPickupKeys.detail(entityId) });
                queryClient.invalidateQueries({ queryKey: ["self-pickups"] });
                queryClient.invalidateQueries({ queryKey: selfPickupKeys.statusHistory(entityId) });
                queryClient.invalidateQueries({ queryKey: selfPickupKeys.changeHistory(entityId) });
            }

            // Bookings became open-ended, and a dispatched entity also had its
            // serialized assets stamped PLACED — so availability and asset rows
            // are stale regardless of which arm ran. (The stock-movements
            // invalidation is a harmless leftover from the retired dispatch
            // write-off era — this path writes no movements since 2026-08-06.)
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({ queryKey: ["asset-availability-stats"] });
            queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
        },
    });
}
