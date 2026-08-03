"use client";

/**
 * RL-032 Resolution 2 — the write-off decision, on both entities.
 *
 * A load that cannot be finished in one visit has a stated way forward. If the
 * outstanding units WILL be collected on a later visit, the operator simply does
 * not complete the return. If they will NOT be collected, ADMIN **or LOGISTICS**
 * records a decision for exactly those units, after which they count as settled
 * and the next inbound completion can close the parent and credit everything
 * that actually came back.
 *
 * Open to both roles under NO quantity or value threshold and NO counter-
 * approval, on RL-018's settlement doctrine: the operator resolving the load is
 * the one who counted it. No new permission key — both routes sit under a
 * permission the roles already hold (`service_requests:update` on the order arm,
 * `self_pickups:edit_details` on the self-pickup arm).
 *
 * The decision is TERMINAL. Nothing in the ledger reverses itself and no route
 * reverses it; a unit written off and later collected is corrected by an
 * ordinary manual stock adjustment, outside this release's routes.
 */

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { serviceRequestKeys } from "./use-service-requests";
import { selfPickupKeys } from "./use-self-pickups";

export type WriteOffReason = "CONSUMED" | "LOST" | "DAMAGED" | "OTHER";

/**
 * The entry shape is RL-018's `settlements[]` shape, so there is exactly ONE
 * settlement vocabulary in the release. An entry carrying `asset_id` settles one
 * serialized unit and carries no quantity; an entry without it is pooled and its
 * `quantity` is REQUIRED. There is no `mode` discriminator, because there is no
 * reinstatement mode.
 */
export interface WriteOffDecisionUnit {
    line_id: string;
    asset_id?: string;
    quantity?: number;
}

/**
 * A deliberate override of the future-booking guard, on the DECISION route only.
 * Presence of the block is the flag; the reason is mandatory and is what makes
 * the override auditable rather than a silent bypass. Shaped exactly like the
 * platform's other destructive override, `placementReconcileSchema` — a literal
 * acknowledgement that cannot be produced by a stray truthy value, plus a
 * reason (`api .../scanning.schemas.ts:144-156`).
 *
 * It overrides the GUARD only. Every other refusal — nothing outstanding, a
 * quantity above the true outstanding, the wrong stock mode, the wrong parent
 * status — still stands and carries no `code`.
 */
export interface WriteOffBookingOverride {
    acknowledge_competing_booking: true;
    /** Required, 5–500 characters. Written to the ledger row and the audit event. */
    reason: string;
}

export interface WriteOffDecisionPayload {
    reason: WriteOffReason;
    /** Required, 5–500 characters. Internal: never written to status history. */
    note: string;
    units: WriteOffDecisionUnit[];
    booking_override?: WriteOffBookingOverride;
}

/**
 * One serialized unit the decision refused to write off because it is already
 * committed to somebody else. Mirrors `BlockedWriteOffUnit`
 * (`api/src/app/shared/settlement/settlement.core.ts:668-681`).
 */
export interface BlockedWriteOffUnit {
    line_id: string;
    asset_id: string;
    asset_name: string;
    asset_qr_code: string | null;
    blocking_booking_id: string;
    blocking_parent_type: "ORDER" | "SELF_PICKUP";
    blocking_parent_entity_id: string;
    blocking_parent_human_id: string;
    blocking_company_name: string;
    blocked_from: string;
    blocked_until: string | null;
    message: string;
}

/**
 * The machine-readable discriminator on the guard's 409
 * (`settlement.core.ts:687`). Key the override affordance off THIS, never off
 * the message text.
 */
export const WRITE_OFF_BLOCKED_CODE = "SERIALIZED_UNIT_BOOKED_ELSEWHERE";

/**
 * The guard's 409, kept structured.
 *
 * `throwApiError` deliberately flattens every failure to `new Error(message)`,
 * which is right for a toast and useless here — the whole point of this refusal
 * is the LIST of units and their competing bookings. So the two write-off
 * mutations use their own thrower: this class when the body carries the guard's
 * `code`, and `throwApiError` unchanged for everything else, so no other
 * failure shape changes.
 */
export class WriteOffBlockedError extends Error {
    readonly code = WRITE_OFF_BLOCKED_CODE;
    readonly blockedUnits: BlockedWriteOffUnit[];

    constructor(message: string, blockedUnits: BlockedWriteOffUnit[]) {
        super(message);
        this.name = "WriteOffBlockedError";
        this.blockedUnits = blockedUnits;
    }
}

export function isWriteOffBlockedError(error: unknown): error is WriteOffBlockedError {
    return error instanceof WriteOffBlockedError;
}

/**
 * `code` and `blocked_units` are TOP-LEVEL on the body — the global error
 * handler spreads `CustomizedError.data` at the root, not under `data`.
 */
function throwWriteOffError(error: unknown): never {
    const body = (
        error as {
            response?: {
                data?: { code?: string; message?: string; blocked_units?: BlockedWriteOffUnit[] };
            };
        }
    )?.response?.data;

    if (body?.code === WRITE_OFF_BLOCKED_CODE && Array.isArray(body.blocked_units)) {
        throw new WriteOffBlockedError(
            body.message || "Some of these units are booked elsewhere.",
            body.blocked_units
        );
    }

    return throwApiError(error);
}

/**
 * RL-032 order arm — `POST /operations/v1/service-request/:id/uplift-write-off`.
 *
 * Preconditions the SERVER enforces (the UI mirrors them so the control is not
 * offered pointlessly, but the server is authoritative): the request is an
 * approved, non-completed UPLIFT, and the source order is AWAITING_RETURN —
 * never RETURN_IN_TRANSIT, because a live visit is resolved by recording the
 * partial collection first.
 */
export function useRecordUpliftWriteOff() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            serviceRequestId,
            payload,
        }: {
            serviceRequestId: string;
            payload: WriteOffDecisionPayload;
        }) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/service-request/${serviceRequestId}/uplift-write-off`,
                    payload
                );
                return response.data;
            } catch (error) {
                return throwWriteOffError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: serviceRequestKeys.detail(variables.serviceRequestId),
            });
            // The decision moves total_quantity and reduces bookings, so every
            // order, asset and stock-movement surface is now stale.
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
            queryClient.invalidateQueries({ queryKey: ["inboundScanProgress"] });
        },
    });
}

/**
 * RL-032 self-pickup arm — `POST /operations/v1/self-pickup/:id/retention-write-off`.
 *
 * Mandatory, not symmetry for its own sake: a self-pickup has no
 * RETURN_IN_TRANSIT status and therefore no partial-visit edge, and the order
 * route is structurally unreachable from a pickup. Without this arm a permanent
 * pickup where nine of ten units come back and the tenth is never coming has
 * exactly one move — complete now and write off a unit nobody has decided about.
 *
 * Scope is PERMANENT placements in AWAITING_RETURN only. Ordinary self-pickup
 * returns keep today's behaviour exactly.
 */
export function useRecordSelfPickupRetentionWriteOff() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            selfPickupId,
            payload,
        }: {
            selfPickupId: string;
            payload: WriteOffDecisionPayload;
        }) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/self-pickup/${selfPickupId}/retention-write-off`,
                    payload
                );
                return response.data;
            } catch (error) {
                return throwWriteOffError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: selfPickupKeys.detail(variables.selfPickupId),
            });
            queryClient.invalidateQueries({ queryKey: ["self-pickups"] });
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
            queryClient.invalidateQueries({ queryKey: ["selfPickupReturnProgress"] });
        },
    });
}

/**
 * Per-asset return progress, the only admin-reachable read that carries
 * `stock_mode` alongside the quantity actually scanned back. The write-off
 * builder joins it to the parent's item rows on `asset_id` to work out which
 * lines are serialized and how much of each has already returned.
 *
 * Deliberately NOT the 3-second poll the live scanning screens use: this is a
 * review surface, not a scanning console.
 */
export interface ReturnProgressAsset {
    asset_id: string;
    asset_name: string;
    qr_code?: string;
    stock_mode?: "SERIALIZED" | "POOLED";
    required_quantity: number;
    scanned_quantity: number;
    is_complete: boolean;
}

export function useOrderReturnProgress(orderId: string | null, enabled = true) {
    return useQuery({
        queryKey: ["order-return-progress", orderId],
        enabled: !!orderId && enabled,
        staleTime: 15_000,
        queryFn: async (): Promise<{ assets: ReturnProgressAsset[] }> => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/scanning/inbound/${orderId}/progress`
                );
                return response.data?.data ?? response.data;
            } catch (error) {
                return throwApiError(error);
            }
        },
    });
}

export function useSelfPickupReturnProgress(selfPickupId: string | null, enabled = true) {
    return useQuery({
        queryKey: ["selfPickupReturnProgress", selfPickupId],
        enabled: !!selfPickupId && enabled,
        staleTime: 15_000,
        queryFn: async (): Promise<{ assets: ReturnProgressAsset[] }> => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/scanning/self-pickup-return/${selfPickupId}/progress`
                );
                return response.data?.data ?? response.data;
            } catch (error) {
                return throwApiError(error);
            }
        },
    });
}
