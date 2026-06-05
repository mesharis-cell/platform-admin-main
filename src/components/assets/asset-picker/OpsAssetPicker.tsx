"use client";

/**
 * OpsAssetPicker — the OPS (admin/warehouse) data adapter for the canonical
 * AssetPicker.
 *
 * NOT a synced canonical file. This is the ops surface's data adapter: it owns
 * the search-term state, calls useSearchAssets (/operations/v1/asset — note it
 * only fires once the term is >= 2 chars), and maps the flat ops asset rows to
 * the normalized AssetPickerItem shape. The ops feed carries operational fields
 * only (images / availability / condition) — NEVER buy / margin / markup — so the
 * mapping surfaces exactly those.
 *
 * The core <AssetPicker> stays data-agnostic; this mirrors the client's
 * ClientAssetPicker but for ops, with NO maintenance decision (ops mode →
 * conditionDecision="none", no renderDecision). RED / zero-availability are
 * visually flagged + disabled by the card so a save-time 409 is avoided.
 *
 * `onConfirm` re-emits the picker's selections enriched with the chosen asset's
 * display NAME (the picker works in ids; an editor staging the add needs the name
 * for its staged-add rows), exactly like ClientAssetPicker's NamedAssetSelection.
 */

import { useMemo, useState } from "react";
import { useSearchAssets } from "@/hooks/use-assets";
import type { Asset } from "@/types/asset";
import { AssetPicker } from "./AssetPicker";
import type { AssetCondition, AssetPickerItem, AssetPickerSelection } from "./types";

function toCondition(value: unknown): AssetCondition {
    return value === "RED" || value === "ORANGE" ? value : "GREEN";
}

/** The ops asset row may carry an on_display_image not declared on the Asset type. */
type OpsAssetRow = Asset & { on_display_image?: string | null; code?: string | null };

/** Map a flat ops asset row → AssetPickerItem. Ops rows are never grouped. */
function mapOpsAsset(asset: OpsAssetRow): AssetPickerItem {
    return {
        id: asset.id,
        name: asset.name,
        code: asset.qr_code ?? asset.code ?? null,
        category: asset.category ?? null,
        brand: asset.brand?.name ?? null,
        imageUrl: asset.on_display_image || asset.images?.[0]?.url || null,
        availableQuantity: asset.available_quantity ?? 0,
        condition: toCondition(asset.condition),
        grouped: false,
    };
}

/**
 * A confirmed selection enriched with the chosen asset's display name and its
 * availableQuantity (so a staging editor can bound the staged-add qty stepper).
 */
export interface NamedAssetSelection extends AssetPickerSelection {
    name: string;
    availableQuantity: number;
}

export function OpsAssetPicker({
    companyId,
    alreadyOnEntity,
    entityNoun = "order",
    onConfirm,
}: {
    /** Scopes the ops asset search to the entity's company. */
    companyId: string;
    /** Asset ids already on the entity — marked "already added", not selectable. */
    alreadyOnEntity?: string[];
    /** Verb shown on the confirm button + add labels ("order" / "pickup" / …). */
    entityNoun?: string;
    /** Selections enriched with the chosen asset's display name. */
    onConfirm: (selections: NamedAssetSelection[]) => void;
}) {
    const [searchTerm, setSearchTerm] = useState("");

    // Only fires at searchTerm.length >= 2 (see useSearchAssets). react-query
    // dedupe + 30s staleTime keep this cheap as the term changes.
    const { data, isLoading } = useSearchAssets(searchTerm, companyId);

    const items = useMemo(() => {
        const rows = (data?.data ?? []) as OpsAssetRow[];
        return rows.map(mapOpsAsset);
    }, [data]);

    // Index name + availableQuantity by the asset_id the picker will emit.
    const itemByAssetId = useMemo(() => {
        const map = new Map<string, { name: string; availableQuantity: number }>();
        for (const item of items)
            map.set(item.id, { name: item.name, availableQuantity: item.availableQuantity });
        return map;
    }, [items]);

    return (
        <AssetPicker
            mode="ops"
            items={items}
            isLoading={isLoading && searchTerm.length >= 2}
            onSearch={(term) => setSearchTerm(term)}
            alreadyOnEntity={alreadyOnEntity}
            multiSelect
            withQuantity
            conditionDecision="none"
            entityNoun={entityNoun}
            onConfirm={(selections) => {
                onConfirm(
                    selections.map((s) => {
                        const meta = itemByAssetId.get(s.assetId);
                        return {
                            ...s,
                            name: meta?.name ?? "Asset",
                            availableQuantity: meta?.availableQuantity ?? 0,
                        };
                    })
                );
            }}
        />
    );
}
