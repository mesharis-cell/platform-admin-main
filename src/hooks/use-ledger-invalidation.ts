"use client";

import type { useQueryClient } from "@tanstack/react-query";
import type { PurposeType } from "@/types/hybrid-pricing";
import { inboundRequestKeys } from "@/hooks/use-inbound-requests";
import { selfPickupKeys } from "@/hooks/use-self-pickups";

/**
 * Single source of truth for "a commercial mutation happened on this entity —
 * refresh everything the ledger + entity pages read."
 *
 * Consolidates what used to be two parallel, drift-prone helpers:
 *   - `invalidateLineItemRelatedQueries` (use-order-line-items.ts) — fired by the
 *     line-item CRUD hooks (add/update/void/metadata/visibility).
 *   - `invalidateLedgerQueries` (use-pricing-ledger.ts) — fired by bulk-margin +
 *     mark-no-cost.
 * They invalidated overlapping-but-not-identical key sets; this helper is the
 * UNION of both so either mutation path refreshes the same surface. That kills
 * the drift class (e.g. the dead `["self-pickup-detail", id]` key one path used
 * while the real detail key is `["self-pickup", id]` = selfPickupKeys.detail).
 *
 * Invalidates, for every entity type:
 *   - the line-items list (`["line-items", purposeType, entityId]`) — edit-lens rows
 *   - both preview-role variants (`["pricing-preview", purposeType, entityId]`) —
 *     footer totals + client/logistics lenses (prefix match covers both roles)
 * plus the entity's own list + detail queries per type.
 */
export const invalidateLedgerRelatedQueries = (
    queryClient: ReturnType<typeof useQueryClient>,
    purposeType: PurposeType,
    entityId: string
) => {
    // Edit-lens rows (list line-items hook) + the ledger's role-preview (footer
    // totals + client/logistics lenses). Prefix match on the preview key covers
    // both CLIENT and LOGISTICS role variants.
    queryClient.invalidateQueries({ queryKey: ["line-items", purposeType, entityId] });
    queryClient.invalidateQueries({ queryKey: ["pricing-preview", purposeType, entityId] });

    if (purposeType === "ORDER") {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
    } else if (purposeType === "INBOUND_REQUEST") {
        queryClient.invalidateQueries({ queryKey: ["inbound-requests"] });
        queryClient.invalidateQueries({ queryKey: inboundRequestKeys.detail(entityId) });
    } else if (purposeType === "SERVICE_REQUEST") {
        queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    } else {
        // SELF_PICKUP — the page re-routes to the NO_COST card + status badge off
        // this refetch after a ledger no-cost / bulk-margin. Uses the REAL detail
        // key (`["self-pickup", id]`), not the historical dead `["self-pickup-detail"]`.
        queryClient.invalidateQueries({ queryKey: ["self-pickups"] });
        queryClient.invalidateQueries({ queryKey: selfPickupKeys.detail(entityId) });
    }
};
