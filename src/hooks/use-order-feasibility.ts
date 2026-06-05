"use client";

/**
 * Admin order-edit feasibility hooks — the OPS twin of the client's
 * use-feasibility-check. Wires the admin order-edit to the NEW ops feasibility
 * endpoints added in this build:
 *
 *   GET  /operations/v1/order/ops-feasibility-config?order_id=…
 *   POST /operations/v1/order/ops-check-maintenance-feasibility
 *
 * Same underlying feasibility math + response shape as the client endpoints, but
 * the company is resolved from `order_id` (ADMIN/LOGISTICS carry no company_id).
 * Operational data only — never buy/margin/markup.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

export type MaintenanceDecision = "FIX_IN_ORDER" | "USE_AS_IS";

export type MaintenanceFeasibilityIssue = {
    asset_id: string;
    asset_name: string;
    refurb_days_estimate: number;
    earliest_feasible_date: string;
    earliest_feasible_datetime: string;
    condition: "RED" | "ORANGE";
    maintenance_mode: "MANDATORY_RED" | "OPTIONAL_ORANGE_FIX";
    message: string;
};

export type FeasibilityConfigShape = {
    minimum_lead_hours: number;
    exclude_weekends: boolean;
    weekend_days: number[];
    timezone: string;
};

export type MaintenanceFeasibilityResult = {
    feasible: boolean;
    issues: MaintenanceFeasibilityIssue[];
    config: FeasibilityConfigShape;
    /** Earliest calendar date (YYYY-MM-DD) usable for this order's items. */
    lead_floor_date: string;
    /** ISO 8601 UTC datetime form of `lead_floor_date`. */
    lead_floor_datetime: string;
};

export type OpsFeasibilityConfig = {
    minimum_lead_hours: number;
    /** Self-pickup lead-time floor — present on the shared config, unused here. */
    sp_minimum_lead_hours?: number;
    exclude_weekends: boolean;
    weekend_days: number[];
    timezone: string;
};

/**
 * Resolved feasibility config (lead-time floor + weekend rules) scoped to the
 * order's company. Drives the date-input `min` and the helper's floor copy.
 */
export function useOpsFeasibilityConfig(orderId: string | null | undefined) {
    return useQuery({
        queryKey: ["ops-feasibility-config", orderId],
        queryFn: async (): Promise<OpsFeasibilityConfig> => {
            const response = await apiClient.get("/client/v1/order/ops-feasibility-config", {
                params: orderId ? { order_id: orderId } : undefined,
            });
            return response.data.data as OpsFeasibilityConfig;
        },
        enabled: !!orderId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Auto-firing maintenance-feasibility subscription for the admin order-edit. Fires
 * on any input change — the staged item set (asset_id + maintenance_decision) and
 * the picked event-start date. `enabled` short-circuits the query when there's no
 * date yet or no items. Items are serialised into the queryKey so it's stable by
 * value (callers must memoise `items` to avoid identity churn).
 */
export function useOpsFeasibility({
    orderId,
    items,
    eventStartDate,
    enabled = true,
}: {
    orderId: string | null | undefined;
    items: Array<{ asset_id: string; maintenance_decision?: MaintenanceDecision }>;
    /** YYYY-MM-DD or null. Null disables the query. */
    eventStartDate: string | null;
    enabled?: boolean;
}) {
    return useQuery({
        queryKey: ["ops-feasibility", orderId, JSON.stringify(items), eventStartDate],
        queryFn: async (): Promise<MaintenanceFeasibilityResult> => {
            const response = await apiClient.post(
                "/client/v1/order/ops-check-maintenance-feasibility",
                {
                    order_id: orderId,
                    items,
                    event_start_date: eventStartDate,
                }
            );
            return response.data.data as MaintenanceFeasibilityResult;
        },
        enabled: enabled && !!orderId && items.length > 0 && !!eventStartDate,
        staleTime: 30 * 1000,
    });
}
