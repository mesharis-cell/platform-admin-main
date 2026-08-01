/**
 * RL-025 — the admin application's single nullable-date rendering contract.
 *
 * A permanent placement has NO scheduled return: `orders.event_end_date` and
 * `asset_bookings.blocked_until` are nullable from migration 0077 on, and the
 * API sends `null` — never a placeholder string and never the old
 * `2099-12-31` sentinel. Every surface that renders one of those values goes
 * through this module so the presentation is the same everywhere:
 *
 *   | Surface           | Permanent / open-ended output |
 *   |-------------------|-------------------------------|
 *   | Normal UI         | "No return scheduled"         |
 *   | Dense table       | "—"                           |
 *   | Date input        | empty + disabled + helper text |
 *   | Availability      | "Unavailable indefinitely"    |
 *
 * The reason this exists as one exported function rather than a convention is
 * `new Date(null)`, which does not throw — it yields the 1970 epoch. A raw
 * `new Date(order.event_end_date).toLocaleDateString()` therefore renders
 * "1/1/1970" on a placement, and a raw `d <= end` comparison silently drops the
 * row from a calendar. Both are live defect classes RL-026 enumerates; neither
 * is visible to `tsc`. Do not add a competing raw formatter.
 *
 * No lint rule enforces this — that was specified and cut (RL-025). The channels
 * that matter are enumerated by name in RL-026 and each is wired here.
 */

/** What a null date reads as on an ordinary (non-dense) surface. */
export const NO_RETURN_SCHEDULED = "No return scheduled";

/** What a null date reads as inside a dense table cell. */
export const DENSE_EMPTY = "—";

/** What an availability conflict says when the blocking booking is open-ended. */
export const UNAVAILABLE_INDEFINITELY = "Unavailable indefinitely";

export type NullableDateVariant = "normal" | "dense";

/**
 * Parse anything the API might hand us into a Date, or `null`.
 *
 * Returns `null` for `null`, `undefined`, `""` and any unparseable value — so a
 * malformed string degrades to the same "no date" presentation rather than to
 * "Invalid Date". It never returns the 1970 epoch for a nullish input, which is
 * the whole point.
 */
export function toDateOrNull(value: unknown): Date | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "number") {
        const fromNumber = new Date(value);
        return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
    }
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** True when this entity has no scheduled return at all. */
export function hasNoScheduledReturn(value: unknown): boolean {
    return toDateOrNull(value) === null;
}

interface FormatOptions {
    /** "normal" → "No return scheduled"; "dense" → "—". Default "normal". */
    variant?: NullableDateVariant;
    /** Override the null-case text entirely (e.g. "Not set" on a non-return field). */
    emptyLabel?: string;
    /** Include the time of day alongside the calendar date. */
    withTime?: boolean;
}

/**
 * The one date renderer. Never returns "Invalid Date", never returns 1970 for a
 * nullish input, never returns a blank string.
 */
export function formatNullableDate(value: unknown, options: FormatOptions = {}): string {
    const { variant = "normal", emptyLabel, withTime = false } = options;
    const parsed = toDateOrNull(value);
    if (!parsed) {
        if (emptyLabel !== undefined) return emptyLabel;
        return variant === "dense" ? DENSE_EMPTY : NO_RETURN_SCHEDULED;
    }
    return withTime ? parsed.toLocaleString() : parsed.toLocaleDateString();
}

/**
 * `<Input type="date">` wants `YYYY-MM-DD`. A null date yields `""`, which the
 * caller pairs with `disabled` + helper text per the contract's Date-input row.
 */
export function toDateInputValue(value: unknown): string {
    if (typeof value === "string") {
        const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
        if (ymd) return ymd[1];
    }
    const parsed = toDateOrNull(value);
    if (!parsed) return "";
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * A booking window as text. An open-ended window (`blocked_until = null`) reads
 * as indefinite rather than as a range ending at the epoch.
 */
export function formatBookingWindow(from: unknown, until: unknown): string {
    const start = formatNullableDate(from, { emptyLabel: DENSE_EMPTY });
    const end = toDateOrNull(until);
    if (!end) return `${start} → ${UNAVAILABLE_INDEFINITELY.toLowerCase()}`;
    return `${start} → ${end.toLocaleDateString()}`;
}
