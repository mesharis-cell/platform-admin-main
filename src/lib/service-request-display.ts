/**
 * The admin application's single service-request presentation contract.
 *
 * A service request carries TWO statuses — an operational one (`request_status`,
 * the work) and a commercial one (`commercial_status`, the money) — and neither
 * half means anything on its own. Every surface that renders a service request
 * therefore asks the same three questions, and they are answered here once:
 *
 *   1. What is this?            → `SR_TYPE_PRESENTATION`
 *   2. Whose desk is it on?     → `serviceRequestDesk()`  (resolves the pair)
 *   3. What state is each axis in? → `SR_STATUS_PRESENTATION` / `SR_COMMERCIAL_PRESENTATION`
 *
 * This module exists because the maps were previously re-declared per page — the
 * list page and the detail page each carried their own copy and they had already
 * drifted (the list styled seven operational statuses, the detail styled none and
 * fell back to a bare `secondary` badge). Import from here; do not re-declare.
 *
 * PRESENTATION ONLY. Nothing here decides what a user may do — every permission
 * gate, transition guard and enabled/disabled rule stays on the page that owns
 * the control. These functions read the same fields the pages already read and
 * return strings and class names.
 *
 * Tailwind note: every class string below is a complete literal in a lookup
 * table rather than an interpolated `bg-${tone}-100`, because the JIT compiler
 * only sees literals.
 */

import type {
    ServiceRequest,
    ServiceRequestCommercialStatus,
    ServiceRequestStatus,
    ServiceRequestType,
} from "@/types/service-request";

/** Semantic hues. One hue per meaning, matching the orders design language. */
export type Tone =
    | "slate"
    | "blue"
    | "amber"
    | "orange"
    | "green"
    | "cyan"
    | "teal"
    | "red"
    | "purple"
    | "emerald"
    | "sky";

interface Presentation {
    label: string;
    tone: Tone;
}

/** Dense list/table badge: solid tint. */
const LIST_BADGE: Record<Tone, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-300",
    blue: "bg-blue-100 text-blue-700 border-blue-300",
    amber: "bg-amber-100 text-amber-700 border-amber-300",
    orange: "bg-orange-100 text-orange-700 border-orange-300",
    green: "bg-green-100 text-green-700 border-green-300",
    cyan: "bg-cyan-100 text-cyan-700 border-cyan-300",
    teal: "bg-teal-100 text-teal-700 border-teal-300",
    red: "bg-red-100 text-red-700 border-red-300",
    purple: "bg-purple-100 text-purple-700 border-purple-300",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
    sky: "bg-sky-100 text-sky-700 border-sky-300",
};

/** Detail-page badge: translucent tint, matching the order detail header. */
const DETAIL_BADGE: Record<Tone, string> = {
    slate: "bg-slate-500/10 text-slate-700 border-slate-500/20",
    blue: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    orange: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    green: "bg-green-500/10 text-green-700 border-green-500/20",
    cyan: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
    teal: "bg-teal-500/10 text-teal-700 border-teal-500/20",
    red: "bg-red-500/10 text-red-700 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    sky: "bg-sky-500/10 text-sky-700 border-sky-500/20",
};

export function listBadgeClass(tone: Tone): string {
    return LIST_BADGE[tone];
}

export function detailBadgeClass(tone: Tone): string {
    return DETAIL_BADGE[tone];
}

/* ------------------------------------------------------------------ *
 * Operational status — the work
 * ------------------------------------------------------------------ */

export const SR_STATUS_PRESENTATION: Record<ServiceRequestStatus, Presentation> = {
    DRAFT: { label: "Draft", tone: "slate" },
    SUBMITTED: { label: "Submitted", tone: "blue" },
    IN_REVIEW: { label: "In Review", tone: "amber" },
    APPROVED: { label: "Approved", tone: "green" },
    IN_PROGRESS: { label: "In Progress", tone: "cyan" },
    COMPLETED: { label: "Completed", tone: "teal" },
    CANCELLED: { label: "Cancelled", tone: "red" },
};

/* ------------------------------------------------------------------ *
 * Commercial status — the money
 * ------------------------------------------------------------------ */

export const SR_COMMERCIAL_PRESENTATION: Record<ServiceRequestCommercialStatus, Presentation> = {
    INTERNAL: { label: "Internal", tone: "slate" },
    PENDING_QUOTE: { label: "Pending Quote", tone: "blue" },
    QUOTED: { label: "Quoted", tone: "purple" },
    QUOTE_APPROVED: { label: "Quote Approved", tone: "green" },
    INVOICED: { label: "Invoiced", tone: "amber" },
    PAID: { label: "Paid", tone: "emerald" },
    CANCELLED: { label: "Cancelled", tone: "red" },
};

/* ------------------------------------------------------------------ *
 * Request type — what kind of thing this is
 * ------------------------------------------------------------------ */

export const SR_TYPE_PRESENTATION: Record<ServiceRequestType, Presentation> = {
    // An uplift is the collection of a permanent placement and is the only type
    // that rides the two-desk quote flow, so it is the only one that is tinted.
    UPLIFT: { label: "Uplift", tone: "sky" },
    MAINTENANCE: { label: "Maintenance", tone: "slate" },
    RESKIN: { label: "Reskin", tone: "slate" },
    REFURBISHMENT: { label: "Refurbishment", tone: "slate" },
    CUSTOM: { label: "Custom", tone: "slate" },
};

export function statusPresentation(status: ServiceRequestStatus | string): Presentation {
    return (
        SR_STATUS_PRESENTATION[status as ServiceRequestStatus] ?? {
            label: String(status).replace(/_/g, " "),
            tone: "slate",
        }
    );
}

export function commercialPresentation(
    status: ServiceRequestCommercialStatus | string
): Presentation {
    return (
        SR_COMMERCIAL_PRESENTATION[status as ServiceRequestCommercialStatus] ?? {
            label: String(status).replace(/_/g, " "),
            tone: "slate",
        }
    );
}

export function typePresentation(type: ServiceRequestType | string): Presentation {
    return (
        SR_TYPE_PRESENTATION[type as ServiceRequestType] ?? {
            label: String(type).replace(/_/g, " "),
            tone: "slate",
        }
    );
}

/* ------------------------------------------------------------------ *
 * The desk — the resolved answer to "whose is this right now?"
 * ------------------------------------------------------------------ */

/** Alert-card tones, narrower than the badge palette. */
export type DeskTone = "waiting" | "action" | "inflight" | "done" | "closed";

export interface ServiceRequestDesk {
    /** Whose desk it is on. Two to four words. */
    label: string;
    /** The next thing that happens, in one sentence, from ADMIN's point of view. */
    next: string;
    tone: DeskTone;
}

/** Card / icon / title classes for the desk banner, keyed by tone. */
export const DESK_CARD_CLASS: Record<DeskTone, string> = {
    waiting: "bg-amber-500/5 border-amber-500/30",
    action: "bg-orange-500/5 border-orange-500/30",
    inflight: "bg-sky-500/5 border-sky-500/30",
    done: "bg-green-500/5 border-green-500/30",
    closed: "bg-muted/40 border-border",
};

export const DESK_ICON_CLASS: Record<DeskTone, string> = {
    waiting: "text-amber-600",
    action: "text-orange-600",
    inflight: "text-sky-600",
    done: "text-green-600",
    closed: "text-muted-foreground",
};

export const DESK_TITLE_CLASS: Record<DeskTone, string> = {
    waiting: "text-amber-700",
    action: "text-orange-700",
    inflight: "text-sky-700",
    done: "text-green-700",
    closed: "text-foreground",
};

export const DESK_BADGE_CLASS: Record<DeskTone, string> = {
    waiting: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    action: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    inflight: "bg-sky-500/10 text-sky-700 border-sky-500/20",
    done: "bg-green-500/10 text-green-700 border-green-500/20",
    closed: "bg-muted text-muted-foreground border-border",
};

type DeskInput = Pick<ServiceRequest, "request_type" | "request_status" | "commercial_status">;

/**
 * Resolve the pair of statuses into one desk.
 *
 * An UPLIFT runs the two-desk flow — logistics prices the buy side, admin
 * reviews and issues the quote, the client answers. Every other type is a work
 * request: logistics does the work, admin reviews and prices it.
 *
 * These strings are the ADMIN half of a pair. The warehouse app resolves the
 * same two statuses in `warehouse/src/lib/service-request-display.ts` and its
 * strings are the LOGISTICS half — whoever holds the desk gets the actionable
 * phrasing and the other side gets the waiting phrasing, so the two apps never
 * both claim the same state. Change one, change the other; the same ADMIN user
 * reads both.
 */
export function serviceRequestDesk(request: DeskInput): ServiceRequestDesk {
    const { request_status: ops, commercial_status: com } = request;

    if (ops === "CANCELLED")
        return { label: "Cancelled", next: "No further action.", tone: "closed" };
    if (ops === "COMPLETED")
        return { label: "Completed", next: "No further action.", tone: "done" };
    if (ops === "DRAFT") return { label: "Draft", next: "Not submitted yet.", tone: "closed" };

    if (request.request_type === "UPLIFT") {
        if (com === "QUOTE_APPROVED")
            return {
                label: "Approved",
                next: "The client accepted. The collection runs from the source order.",
                tone: "inflight",
            };
        if (com === "QUOTED")
            return {
                label: "With the client",
                next: "Quote issued — waiting on the client's answer.",
                tone: "waiting",
            };
        if (ops === "IN_REVIEW")
            return {
                label: "With admin",
                next: "Review the priced lines below, then issue the quote.",
                tone: "action",
            };
        if (ops === "SUBMITTED")
            return {
                label: "With logistics",
                next: "Logistics is pricing the collection. It comes back here for review.",
                tone: "waiting",
            };
        return {
            label: statusPresentation(ops).label,
            next: "The collection is under way.",
            tone: "inflight",
        };
    }

    // Non-uplift: the operational axis is the work and drives the desk. The
    // commercial axis only takes over while a quote is out with the client.
    //
    // The work itself is physical, so SUBMITTED and IN_PROGRESS belong to
    // logistics — those are the two states the warehouse app puts a Start Work /
    // Mark Complete button on, and this app offers nothing but the catch-all
    // status dropdown. The wording here is therefore the waiting half of the
    // pair; the warehouse says the actionable half.
    if (ops === "APPROVED")
        return { label: "Approved", next: "Ready to start the work.", tone: "inflight" };
    if (ops === "IN_PROGRESS")
        return {
            label: "With logistics",
            next: "Work is under way. Logistics closes it when the work is done.",
            tone: "waiting",
        };
    if (com === "QUOTED")
        return {
            label: "With the client",
            next: "Quote issued — waiting on the client's answer.",
            tone: "waiting",
        };
    // These two sentences name the buttons the detail page actually renders for
    // the state (`serviceRequestOpsActions`). They used to say "set its
    // operational and commercial status", which described the two enum pickers
    // that page no longer has.
    if (ops === "IN_REVIEW")
        return {
            label: "With admin",
            next: "Review the request, then approve it or send it back to logistics.",
            tone: "action",
        };
    if (ops === "SUBMITTED")
        return {
            label: "With logistics",
            next: "Logistics starts the work. Bring it to admin review only if it needs a decision here.",
            tone: "waiting",
        };

    return { label: statusPresentation(ops).label, next: "", tone: "closed" };
}
