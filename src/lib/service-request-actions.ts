/**
 * The admin application's answer to "what may I do to THIS service request, right now".
 *
 * ── Why this module exists ───────────────────────────────────────────────────
 *
 * The detail page used to carry two flat enum dropdowns — six operational
 * options and seven commercial ones — that were not a function of the current
 * status. They offered writes the API rejects on almost every state: on a
 * COMPLETED request all six operational options 400 (`service-request.services
 * .ts:659`), and the control still rendered. This module replaces the guessing
 * with a derivation from the API's real maps.
 *
 * Every entry below is a MIRROR of a specific server rule, cited inline. The
 * server is authoritative in every case — these exist so a control is never
 * OFFERED where it would be refused, which is the same contract
 * `PlacementReconcileCard`'s status lists keep.
 *
 * ── The two axes ─────────────────────────────────────────────────────────────
 *
 * A service request carries an operational status (the work) and a commercial
 * status (the money). They advance on different routes, are guarded by
 * different maps, and one gates the other in exactly one direction: a
 * CLIENT_BILLABLE request cannot start or finish work before it is
 * commercially cleared (`assertOperationalCommercialCoupling`,
 * `service-request.services.ts:249-267`).
 *
 * ── What is deliberately never offered ───────────────────────────────────────
 *
 *   - `CANCELLED` on EITHER axis. The generic status route 409s it outright
 *     (`service-request.services.ts:690`) because it writes the status alone —
 *     no reason, no actor, no commercial cascade. Cancellation goes to the
 *     dedicated `POST /:id/cancel`, or `POST /:id/uplift-cancel` on an uplift.
 *   - `INVOICED` / `PAID`. 409 on every service request, both billing modes
 *     (`service-request.services.ts:897`) — there is no invoice engine and the
 *     statuses cannot be undone.
 *   - `QUOTE_APPROVED` on a CLIENT_BILLABLE request. 409
 *     (`service-request.services.ts:918`): a client's quote is accepted by the
 *     client, on `POST /client/v1/service-request/:id/quote-response`, never on
 *     their behalf. There is no admin path to it at all.
 *   - `INTERNAL` as a target. Refused for CLIENT_BILLABLE
 *     (`commercial-policy.ts:137`) and an outward dead end for INTERNAL_ONLY
 *     once INVOICED/PAID are refused.
 *
 * PRESENTATION + POLICY ONLY. Nothing here performs a mutation or reads a
 * permission — the caller supplies `canAct` and owns every hook.
 */

import type {
    ServiceRequest,
    ServiceRequestCommercialStatus,
    ServiceRequestStatus,
} from "@/types/service-request";

/* ------------------------------------------------------------------ *
 * The maps, mirrored from the API
 * ------------------------------------------------------------------ */

/**
 * `SERVICE_REQUEST_STATUS_TRANSITIONS` — `api/src/app/utils/commercial-policy.ts:40-56`.
 * Reproduced verbatim, `CANCELLED` included, so this file can be diffed against
 * the server map. `CANCELLED` is filtered out at the point of use, not here.
 */
const OPS_TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
    DRAFT: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["IN_REVIEW", "IN_PROGRESS", "CANCELLED"],
    IN_REVIEW: ["APPROVED", "SUBMITTED", "CANCELLED"],
    APPROVED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
};

/** `BILLABLE_COMMERCIAL_TRANSITIONS` — `commercial-policy.ts:58-69`. */
const BILLABLE_COMMERCIAL_TRANSITIONS: Record<
    ServiceRequestCommercialStatus,
    ServiceRequestCommercialStatus[]
> = {
    INTERNAL: [],
    PENDING_QUOTE: ["QUOTED", "CANCELLED"],
    QUOTED: ["PENDING_QUOTE", "QUOTE_APPROVED", "CANCELLED"],
    QUOTE_APPROVED: ["PENDING_QUOTE", "INVOICED", "CANCELLED"],
    INVOICED: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
};

/** `INTERNAL_COMMERCIAL_TRANSITIONS` — `commercial-policy.ts:71-82`. */
const INTERNAL_COMMERCIAL_TRANSITIONS: Record<
    ServiceRequestCommercialStatus,
    ServiceRequestCommercialStatus[]
> = {
    INTERNAL: ["INVOICED", "PAID", "CANCELLED"],
    PENDING_QUOTE: [],
    QUOTED: [],
    QUOTE_APPROVED: [],
    INVOICED: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
};

/**
 * Targets the commercial route refuses on EVERY service request, regardless of
 * billing mode or current status — `service-request.services.ts:897` (INVOICED /
 * PAID) and `:918` (QUOTE_APPROVED on a CLIENT_BILLABLE request; an
 * INTERNAL_ONLY one cannot reach the quote lifecycle at all, so the target is
 * unreachable both ways). `CANCELLED` is here because cancellation is the
 * dedicated route's job on both axes.
 */
const NEVER_OFFERED_COMMERCIAL: ServiceRequestCommercialStatus[] = [
    "INVOICED",
    "PAID",
    "QUOTE_APPROVED",
    "CANCELLED",
    "INTERNAL",
];

/**
 * `UPLIFT_ISSUANCE_STATUSES` — `uplift.services.ts:58`. The operational statuses
 * from which an uplift quote may be issued: IN_REVIEW is first issuance,
 * IN_PROGRESS is re-issuance after a failed visit (RL-015's retry cycle).
 */
const UPLIFT_ISSUANCE_STATUSES: ServiceRequestStatus[] = ["IN_REVIEW", "IN_PROGRESS"];

/** `service-request.services.ts:659` — neither axis is worked from here. */
const TERMINAL_OPS_STATUSES: ServiceRequestStatus[] = ["COMPLETED", "CANCELLED"];

/* ------------------------------------------------------------------ *
 * Operational actions — the work
 * ------------------------------------------------------------------ */

export interface ServiceRequestOpsAction {
    /** `FROM->TO`, the same key shape the warehouse order control uses. */
    key: string;
    toStatus: ServiceRequestStatus;
    /** The decision, named. Never a bare status. */
    label: string;
    /** One sentence: what happens when it is taken. */
    description: string;
    /** `primary` is the forward decision; `secondary` is the step back. */
    intent: "primary" | "secondary";
    /** A step back is an event and has to say what happened. */
    requiresNote: boolean;
    /** COMPLETED captures `completion_notes` rather than a transition note. */
    capturesCompletionNotes: boolean;
    /** Non-null when the server would refuse this right now, in plain words. */
    blockedReason: string | null;
}

interface OpsActionCopy {
    label: string;
    description: string;
    intent: "primary" | "secondary";
    requiresNote: boolean;
    capturesCompletionNotes: boolean;
}

/**
 * Per-EDGE copy, keyed `FROM->TO`. Keyed on the edge and not the target status
 * because the same target means different things from different states: on this
 * entity only `IN_REVIEW->SUBMITTED` is a step back, and it is the one edge that
 * demands a note — the same treatment the warehouse order control gives its
 * single backward edge ("Failed / Aborted / Partial Collection").
 */
const OPS_ACTION_COPY: Record<string, OpsActionCopy> = {
    "DRAFT->SUBMITTED": {
        label: "Submit Request",
        description: "Puts the request into the queue so logistics can pick it up.",
        intent: "primary",
        requiresNote: false,
        capturesCompletionNotes: false,
    },
    "SUBMITTED->IN_REVIEW": {
        label: "Bring to Admin Review",
        description:
            "Takes the request off the logistics queue and onto this desk for a pricing or scope decision.",
        intent: "primary",
        requiresNote: false,
        capturesCompletionNotes: false,
    },
    "SUBMITTED->IN_PROGRESS": {
        label: "Start Work",
        description: "Records that the work has started, without a review step.",
        intent: "secondary",
        requiresNote: false,
        capturesCompletionNotes: false,
    },
    "IN_REVIEW->APPROVED": {
        label: "Approve Request",
        description: "Clears the request to be worked. Logistics starts it from the warehouse app.",
        intent: "primary",
        requiresNote: false,
        capturesCompletionNotes: false,
    },
    "IN_REVIEW->SUBMITTED": {
        label: "Send Back to Logistics",
        description:
            "Returns the request to the logistics queue for rework. It leaves this desk until logistics sends it back.",
        intent: "secondary",
        requiresNote: true,
        capturesCompletionNotes: false,
    },
    "APPROVED->IN_PROGRESS": {
        label: "Start Work",
        description: "Records that the work has started.",
        intent: "primary",
        requiresNote: false,
        capturesCompletionNotes: false,
    },
    "IN_PROGRESS->COMPLETED": {
        label: "Mark Complete",
        description:
            "Closes the request. A maintenance request also restores its asset's condition to green.",
        intent: "primary",
        requiresNote: false,
        capturesCompletionNotes: true,
    },
};

export interface OpsActionContext {
    /** Caller-owned permission answer for `service_requests:update`. */
    canAct: boolean;
    /** `request.photos.length` — the type does not carry `photos`, the response does. */
    workPhotoCount: number;
}

/**
 * `assertOperationalCommercialCoupling` — `service-request.services.ts:249-267`.
 * A CLIENT_BILLABLE request cannot reach IN_PROGRESS or COMPLETED until it is
 * commercially cleared. `pricing_mode = NO_COST` clears it too, because a waived
 * request has no quote to approve.
 */
function commercialCouplingBlock(
    request: Pick<ServiceRequest, "billing_mode" | "commercial_status" | "pricing_mode">,
    toStatus: ServiceRequestStatus
): string | null {
    if (!["IN_PROGRESS", "COMPLETED"].includes(toStatus)) return null;
    if (request.billing_mode !== "CLIENT_BILLABLE") return null;
    if (request.pricing_mode === "NO_COST") return null;
    if (["QUOTE_APPROVED", "INVOICED", "PAID"].includes(request.commercial_status)) return null;
    return "The client has not accepted the quote yet. A billable request cannot be worked or closed before that.";
}

/**
 * The operational decisions available on this request, in render order.
 *
 * Empty means render nothing at all — a terminal request, an uplift, or a user
 * without the permission. That is the intended outcome in all three cases and
 * is why the caller gets a list rather than a "hidden/disabled" pair.
 */
export function serviceRequestOpsActions(
    request: Pick<
        ServiceRequest,
        | "request_type"
        | "request_status"
        | "billing_mode"
        | "commercial_status"
        | "pricing_mode"
        | "is_repair_before_event"
    >,
    context: OpsActionContext
): ServiceRequestOpsAction[] {
    if (!context.canAct) return [];

    // Terminal — the route refuses every target from here
    // (`service-request.services.ts:659`), so there is nothing to render.
    if (TERMINAL_OPS_STATUSES.includes(request.request_status)) return [];

    // An UPLIFT's operational axis has no generic writer at all, and this is not
    // a cosmetic narrowing — every edge belongs to a coupled route or another
    // actor: SUBMITTED->IN_REVIEW is logistics' `submit-for-approval`
    // (`uplift.services.ts:750`), IN_REVIEW->SUBMITTED is admin's
    // `return-to-logistics` and is 409'd here outright
    // (`service-request.services.ts:706`), IN_REVIEW->APPROVED is the CLIENT's
    // own quote acceptance (`uplift.services.ts:1017`), APPROVED->IN_PROGRESS
    // rides the order's dispatch (`order.services.ts:2578`), and
    // IN_PROGRESS->COMPLETED is the inbound completion
    // (`scanning.services.ts:721`). Writing any of them from here would move the
    // status and leave the coupled half behind. The uplift desk panel carries
    // the real controls; the warehouse app withholds the same three for the same
    // reason (`warehouse .../service-requests/[id]/page.tsx:293`).
    if (request.request_type === "UPLIFT") return [];

    const isRepairBeforeEvent = request.is_repair_before_event === true;

    return (OPS_TRANSITIONS[request.request_status] || [])
        .filter((toStatus) => toStatus !== "CANCELLED")
        .map((toStatus): ServiceRequestOpsAction | null => {
            const key = `${request.request_status}->${toStatus}`;
            const copy = OPS_ACTION_COPY[key];
            if (!copy) return null;

            // Repair-before-event completion additionally needs a saved work
            // photo (`service-request.services.ts:727`). The notes half of that
            // rule is captured in the dialog, so only the photo half can block
            // the control itself.
            const photoBlock =
                toStatus === "COMPLETED" && isRepairBeforeEvent && context.workPhotoCount === 0
                    ? "A Repair Before Event task needs at least one saved work photo before it can be completed."
                    : null;

            return {
                key,
                toStatus,
                ...copy,
                blockedReason: commercialCouplingBlock(request, toStatus) ?? photoBlock,
            };
        })
        .filter((action): action is ServiceRequestOpsAction => action !== null);
}

/* ------------------------------------------------------------------ *
 * Commercial actions — the money
 * ------------------------------------------------------------------ */

export interface ServiceRequestCommercialAction {
    key: string;
    toStatus: ServiceRequestCommercialStatus;
    label: string;
    description: string;
    /** Non-null when the server would refuse this right now, in plain words. */
    blockedReason: string | null;
}

export interface ServiceRequestCommercialActions {
    /**
     * The forward money decision, if the state has one. Takes the pricing
     * ledger's footer slot — the position the order page gives "Approve & Send
     * Quote to Client" (`orders/[id]/hybrid-sections.tsx:73-82`).
     */
    primary: ServiceRequestCommercialAction | null;
    /**
     * The step back onto pricing, if the state has one. Takes the slot beside
     * the ledger the order page gives Return-to-Logistics — it is a decision
     * about the quote, not a pricing edit, so it sits outside the card.
     */
    secondary: ServiceRequestCommercialAction | null;
}

/**
 * The commercial decisions available on this request.
 *
 * An INTERNAL_ONLY request has NONE, in every state: its map
 * (`commercial-policy.ts:71-82`) offers only INVOICED, PAID and CANCELLED, and
 * all three are refused. That is the correct outcome and is why the footer slot
 * must be gated rather than always passed — an internal maintenance task should
 * not render a lone loud money button it can never use.
 */
export function serviceRequestCommercialActions(
    request: Pick<
        ServiceRequest,
        "request_type" | "request_status" | "billing_mode" | "commercial_status"
    >,
    context: { canAct: boolean }
): ServiceRequestCommercialActions {
    const empty: ServiceRequestCommercialActions = { primary: null, secondary: null };
    if (!context.canAct) return empty;

    const isUplift = request.request_type === "UPLIFT";
    const transitions =
        request.billing_mode === "CLIENT_BILLABLE"
            ? BILLABLE_COMMERCIAL_TRANSITIONS
            : INTERNAL_COMMERCIAL_TRANSITIONS;

    const offerable = (transitions[request.commercial_status] || []).filter(
        (target) => !NEVER_OFFERED_COMMERCIAL.includes(target)
    );

    // After the refusals above, exactly two edges survive on the whole entity:
    // PENDING_QUOTE -> QUOTED (issue) and {QUOTED, QUOTE_APPROVED} ->
    // PENDING_QUOTE (reopen). Anything else appearing here is a map change on
    // the API that has not been mirrored, and is dropped rather than guessed at.
    const result: ServiceRequestCommercialActions = { primary: null, secondary: null };

    if (offerable.includes("QUOTED")) {
        // RL-013 — on an uplift the quote may only be issued while the request is
        // with admin (IN_REVIEW) or being re-priced after a failed visit
        // (IN_PROGRESS); anything else is 409
        // (`service-request.services.ts:948`). The route is also ADMIN-only for
        // this target (`:938`), which is free here: `admin/src/middleware.tsx`
        // admits no other role.
        const upliftDeskBlock =
            isUplift && !UPLIFT_ISSUANCE_STATUSES.includes(request.request_status)
                ? request.request_status === "SUBMITTED"
                    ? "The collection is still with logistics. It comes back here for review before a quote can be issued."
                    : `A collection quote is issued while the request is with admin or being re-priced after a failed visit. Current status: ${request.request_status.replace(/_/g, " ").toLowerCase()}.`
                : null;

        result.primary = {
            key: `${request.commercial_status}->QUOTED`,
            toStatus: "QUOTED",
            // Word-for-word the order page's approve action
            // (`orders/[id]/hybrid-sections.tsx:79`). It takes the SAME slot in
            // the SAME shared ledger footer, so a different phrasing read as a
            // different control and a different button width. It IS the same
            // decision — admin signs off the priced lines and the client is sent
            // the quote — so it gets the same words.
            //
            // The uplift's old "Issue Collection Quote to Client" is gone
            // deliberately: an uplift page already says UPLIFT COLLECTION in its
            // header, its desk banner and its ledger context, so the qualifier
            // bought nothing and cost the match.
            label: "Approve & Send Quote to Client",
            description:
                "Generates the cost estimate and sends the client the quote. They accept or decline it themselves.",
            blockedReason: upliftDeskBlock,
        };
    }

    if (offerable.includes("PENDING_QUOTE")) {
        const fromApproved = request.commercial_status === "QUOTE_APPROVED";

        // Reopening pricing on an uplift outside the issuance band is a trap
        // rather than an error: the API accepts the move to PENDING_QUOTE and
        // then refuses the re-issue (`service-request.services.ts:948`), leaving
        // the collection un-quotable. Offered greyed with the reason rather than
        // silently absent, so an admin looking for it learns why.
        const upliftDeskBlock =
            isUplift && !UPLIFT_ISSUANCE_STATUSES.includes(request.request_status)
                ? `Reopening pricing now would leave the collection unable to be re-quoted — a quote is only re-issued once the visit has been attempted. Current status: ${request.request_status.replace(/_/g, " ").toLowerCase()}.`
                : null;

        result.secondary = {
            key: `${request.commercial_status}->PENDING_QUOTE`,
            toStatus: "PENDING_QUOTE",
            label: fromApproved ? "Reopen Pricing" : "Revise Quote",
            description: fromApproved
                ? "Unlocks the line items so the request can be re-priced, and withdraws the accepted quote. The client has to accept the new one."
                : "Withdraws the quote from the client and unlocks the line items so it can be re-priced and issued again.",
            blockedReason: upliftDeskBlock,
        };
    }

    return result;
}
