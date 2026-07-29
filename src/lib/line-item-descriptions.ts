/**
 * Shared preset descriptions for line-item / percentage-line modals.
 *
 * These are SUGGESTIONS only — the description field is an editable combobox
 * (see DescriptionSuggestInput). Picking a preset fills the input with its text,
 * which the admin can then freely edit; free-text entry is always allowed. The
 * value flows to the create payload exactly like a plain text input.
 */
export const LINE_ITEM_DESCRIPTION_PRESETS: readonly string[] = [
    "Fuel Surcharge (12.5%)",
    "Service Charge",
    "Handling Fee",
    "Administration Fee",
    "Processing Fee",
    "Out-of-Hours (OOH) Surcharge",
    "Overtime Surcharge",
    "Permit Processing Fee",
    "Peak Season Surcharge",
    "Rush / Expedite Fee",
    "Damage Waiver",
    "Environmental Levy",
] as const;

/**
 * Case-insensitive substring filter over the presets. An empty/whitespace query
 * returns the full list (so the dropdown can show all presets on focus).
 */
export function filterDescriptionPresets(query: string): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return [...LINE_ITEM_DESCRIPTION_PRESETS];
    return LINE_ITEM_DESCRIPTION_PRESETS.filter((preset) => preset.toLowerCase().includes(q));
}
