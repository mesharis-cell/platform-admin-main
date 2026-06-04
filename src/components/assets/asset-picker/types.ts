/**
 * Unified Asset Picker — shared types (canonical copy, source-of-truth = client).
 *
 * SYNCED CANONICAL COPY. This folder is the source-of-truth and will be copied
 * VERBATIM into admin/ and warehouse/ under src/components/assets/asset-picker/.
 * Each repo wires its OWN data adapter (its own hook) but the component files +
 * props in this folder are identical across repos. Keep copies in sync by hand.
 *
 * See ASSET-PICKER-SPEC.md for the full contract.
 */

import type { ReactNode } from "react";

export type AssetCondition = "GREEN" | "ORANGE" | "RED";

export type MaintenanceDecision = "FIX_IN_ORDER" | "USE_AS_IS";

/**
 * Normalized item the picker renders. Each surface maps its raw rows
 * (CatalogItem / ops asset row / …) into this shape via its data adapter.
 * Carries images / availability / condition only — NEVER buy/margin/markup.
 */
export interface AssetPickerItem {
    id: string;
    name: string;
    code?: string | null;
    category?: string | null;
    /** Hex color for the category chip (mirrors catalog-card's categoryRef.color). */
    categoryColor?: string | null;
    brand?: string | null;
    /** on_display_image || images[0].url, already resolved by the adapter. */
    imageUrl?: string | null;
    availableQuantity: number;
    condition: AssetCondition;
    conditionNotes?: string | null;
    /** Structured condition photos surfaced in the ORANGE decision UI. */
    conditionPhotos?: { url: string; note?: string }[];
    /** Repair lead-time shown on the ORANGE decision card. */
    refurbDaysEstimate?: number | null;
    /** True when this item represents a grouped family with selectable siblings. */
    grouped?: boolean;
    siblings?: AssetPickerSibling[];
}

/** A concrete stock record inside a grouped family. Selection targets a sibling. */
export interface AssetPickerSibling {
    id: string;
    name: string;
    availableQuantity: number;
    condition: AssetCondition;
    conditionNotes?: string | null;
    conditionPhotos?: { url: string; note?: string }[];
    refurbDaysEstimate?: number | null;
    imageUrl?: string | null;
}

/**
 * One confirmed selection emitted on confirm. `assetId` is the concrete asset_id
 * (a grouped family resolves to the chosen sibling's id). `maintenanceDecision`
 * is present only for ORANGE selections when conditionDecision="require".
 */
export interface AssetPickerSelection {
    assetId: string;
    quantity: number;
    maintenanceDecision?: MaintenanceDecision;
}

export interface AssetPickerFacets {
    /** Render a brand facet select with these options. */
    brand?: { value: string; label: string }[];
    /** Render a category facet select with these options. */
    category?: { value: string; label: string; color?: string | null }[];
    /** Render a team/department facet select with these options. */
    team?: { value: string; label: string }[];
}

export type AssetPickerFilterValues = {
    brand?: string;
    category?: string;
    team?: string;
};

export interface AssetPickerProps {
    /**
     * "client" → condition decision required for ORANGE (checkout parity).
     * "ops"    → condition shown for awareness only, no decision UI.
     */
    mode: "client" | "ops";
    /** Normalized results. The surface maps its raw rows. */
    items: AssetPickerItem[];
    isLoading?: boolean;
    /** Debounced upstream by the adapter. */
    onSearch: (term: string) => void;
    /** Facet options + a controlled-filter callback. Omit to render no facets. */
    facets?: AssetPickerFacets;
    filterValues?: AssetPickerFilterValues;
    onFilterChange?: (next: AssetPickerFilterValues) => void;
    /** Asset ids already on the entity — marked "already added", not selectable. */
    alreadyOnEntity?: string[];
    multiSelect?: boolean;
    withQuantity?: boolean;
    /** "require" (client) → ORANGE needs a FIX_IN_ORDER/USE_AS_IS choice. */
    conditionDecision?: "require" | "none";
    /** Verb shown on the confirm button + add labels ("order" / "pickup" / …). */
    entityNoun?: string;
    /**
     * Renders the per-asset ORANGE maintenance decision (client mode). INJECTED so
     * the core stays free of client-only imports — ops copies omit it, and since
     * ops uses conditionDecision="none" it is never called there. Called once per
     * selected ORANGE asset when conditionDecision="require".
     */
    renderDecision?: (args: {
        assetName: string;
        assetImage?: string;
        conditionNotes?: string;
        conditionImages?: { url: string; note?: string }[];
        refurbDaysEstimate?: number;
        decision?: MaintenanceDecision;
        onDecisionChange: (decision: MaintenanceDecision) => void;
    }) => ReactNode;
    onConfirm: (selections: AssetPickerSelection[]) => void;
    /** Optional pagination footer (rendered when provided). */
    pagination?: {
        page: number;
        totalPages: number;
        onPrev: () => void;
        onNext: () => void;
        total?: number;
        shown?: number;
    };
}
