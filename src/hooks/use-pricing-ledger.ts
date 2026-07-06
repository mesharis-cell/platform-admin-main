"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { mapArraySnakeToCamel } from "@/lib/utils/helper";
import type {
    OrderLineItem,
    PreviewRole,
    PricingPreviewResponse,
    PurposeType,
} from "@/types/hybrid-pricing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Query key namespace for the ledger's role-preview fetch. Kept in sync with the
// invalidation added to `invalidateLineItemRelatedQueries` (use-order-line-items.ts)
// so any line-item mutation refreshes the ledger footer + preview lenses live.
export const pricingLedgerKeys = {
    preview: (purposeType: PurposeType, entityId: string, role: PreviewRole) =>
        ["pricing-preview", purposeType, entityId, role] as const,
};

/**
 * Fetch the ADMIN role-preview for an entity.
 *
 * One call returns BOTH the admin edit lens (`admin.pricing` + `admin.line_items`)
 * and the requested preview role's server projection (`preview.*`). The edit lens
 * consumes `admin.pricing` (footer totals + seed margin) while the preview lenses
 * render `preview.pricing` verbatim — never re-derived client-side (the projection
 * is the leak gate). The per-line arrays are mapped snake→camel to match
 * `OrderLineItem`; the pricing objects stay snake_case (BreakdownLine/OrderPricing
 * are snake-shaped by contract and the breakdown views read them directly).
 */
export function usePricingPreview(
    purposeType: PurposeType,
    entityId: string | null,
    role: PreviewRole,
    enabled = true
) {
    return useQuery({
        queryKey: entityId
            ? pricingLedgerKeys.preview(purposeType, entityId, role)
            : ["pricing-preview", "none"],
        queryFn: async (): Promise<PricingPreviewResponse> => {
            if (!entityId) return Promise.reject("No entity ID");
            try {
                const response = await apiClient.get(
                    `/operations/v1/pricing/${purposeType}/${entityId}/preview?role=${role}`
                );
                const data = response.data.data as PricingPreviewResponse;
                return {
                    ...data,
                    admin: {
                        ...data.admin,
                        line_items: mapArraySnakeToCamel(
                            (data.admin?.line_items || []) as unknown as Record<string, unknown>[]
                        ) as unknown as OrderLineItem[],
                    },
                    preview: {
                        ...data.preview,
                        line_items: mapArraySnakeToCamel(
                            (data.preview?.line_items || []) as unknown as Record<string, unknown>[]
                        ) as unknown as OrderLineItem[],
                    },
                };
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!entityId && enabled,
    });
}

// Per-entity admin URL bases mirror each entity's existing admin mutation hooks:
// orders + inbound go through the CLIENT router mount (OrderRoutes/InboundRoutes are
// mounted there too); SP + SR go through the OPERATIONS mount.
const markNoCostPath = (purposeType: PurposeType, entityId: string): string => {
    switch (purposeType) {
        case "ORDER":
            return `/client/v1/order/${entityId}/mark-no-cost`;
        case "INBOUND_REQUEST":
            return `/client/v1/inbound-request/${entityId}/mark-no-cost`;
        case "SELF_PICKUP":
            return `/operations/v1/self-pickup/${entityId}/mark-no-cost`;
        case "SERVICE_REQUEST":
            // SR's no-cost gesture is the concession route (P1-8) — it takes a
            // required `concession_reason` body, unlike the other three.
            return `/operations/v1/service-request/${entityId}/concession`;
    }
};

// Invalidate every query the ledger reads after a commercial mutation: the
// line-items list (edit lens rows), both preview-role variants (footer + lenses),
// and the entity's own detail/list queries.
const invalidateLedgerQueries = (
    queryClient: ReturnType<typeof useQueryClient>,
    purposeType: PurposeType,
    entityId: string
) => {
    queryClient.invalidateQueries({ queryKey: ["line-items", purposeType, entityId] });
    queryClient.invalidateQueries({ queryKey: ["pricing-preview", purposeType, entityId] });
    if (purposeType === "ORDER") {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
    } else if (purposeType === "INBOUND_REQUEST") {
        queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
    } else if (purposeType === "SERVICE_REQUEST") {
        queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    } else {
        queryClient.invalidateQueries({ queryKey: ["self-pickups"] });
        // SP detail query key is ["self-pickup", id] (selfPickupKeys.detail) — the
        // page re-routes to the NO_COST card + status badge off this refetch after
        // a ledger no-cost/bulk-margin. (Was ["self-pickup-detail"] — dead key.)
        queryClient.invalidateQueries({ queryKey: ["self-pickup", entityId] });
    }
};

/**
 * Bulk-margin stamp — `POST /operations/v1/line-item/bulk-margin`.
 *
 * Stamps `sell_unit_rate = ROUND(unit_rate * (1 + margin_percent/100), 2)` on every
 * BILLABLE non-SYSTEM non-voided line, one transaction + one rebuild (PLAN R3/R4).
 * Does NOT change the entity's margin seed. ADMIN + `pricing:adjust`.
 */
export function useBulkMargin(purposeType: PurposeType, entityId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            marginPercent,
            reason,
        }: {
            marginPercent: number;
            reason?: string;
        }) => {
            try {
                const response = await apiClient.post(`/operations/v1/line-item/bulk-margin`, {
                    purpose_type: purposeType,
                    entity_id: entityId,
                    margin_percent: marginPercent,
                    ...(reason ? { reason } : {}),
                });
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => invalidateLedgerQueries(queryClient, purposeType, entityId),
    });
}

/**
 * Mark the entity as no-cost — the entity's own route (ORDER/INBOUND/SP:
 * `/:id/mark-no-cost`; SR: `/:id/concession`). One-way transition to
 * `pricing_mode=NO_COST`; zeroes the whole breakdown. SR requires a reason
 * (`concession_reason`); the other three ignore any body.
 */
export function useMarkNoCost(purposeType: PurposeType, entityId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reason }: { reason?: string }) => {
            try {
                const body = purposeType === "SERVICE_REQUEST" ? { concession_reason: reason } : {};
                const response = await apiClient.post(markNoCostPath(purposeType, entityId), body);
                return response.data.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => invalidateLedgerQueries(queryClient, purposeType, entityId),
    });
}
