/**
 * Field-aware formatter for entity_change_history old_value / new_value.
 *
 * Those columns are raw JSONB: scalars for most fields, but OBJECTS for
 * `item_quantities` (assetName→qty map), `permit_requirements`, and
 * `venue_location`. This ALWAYS returns a string, so a raw object is never
 * handed to JSX as a child (which throws React error #31). Shared by the
 * order + self-pickup change-history cards so they format identically.
 */
export function formatChangeValue(field: string, value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value === "true") return "Yes";
    if (value === "false") return "No";

    if (typeof value === "object") {
        // item_quantities: { "Asset Name": qty } → "Asset Name: 2, Other: 1"
        if (field === "item_quantities") {
            const entries = Object.entries(value as Record<string, unknown>);
            return entries.length
                ? entries.map(([name, qty]) => `${name}: ${qty}`).join(", ")
                : "—";
        }
        // permit_requirements → short summary
        if (field === "permit_requirements") {
            const o = value as Record<string, unknown>;
            if (!o.requires_permit) return "No permit required";
            const owner = o.permit_owner ? ` (${String(o.permit_owner)})` : "";
            return `Permit required${owner}`;
        }
        // venue_location → readable address line
        if (field === "venue_location") {
            const o = value as Record<string, unknown>;
            const parts = [o.address, o.city, o.country].filter(Boolean).map(String);
            const base = parts.length ? parts.join(", ") : "";
            const notes = o.access_notes ? ` — ${String(o.access_notes)}` : "";
            return base + notes || "—";
        }
        // generic object fallback — never hand a raw object to JSX
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    return String(value);
}
