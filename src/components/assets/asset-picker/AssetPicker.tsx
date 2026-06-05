"use client";

/**
 * SYNCED CANONICAL COPY — source-of-truth = client. See types.ts header.
 *
 * AssetPicker — one reusable asset search/select for ADDING assets to an entity
 * (order / self-pickup / inbound / self-booking / handover). The component is
 * DATA-AGNOSTIC: results arrive via the `items` prop already normalized to
 * AssetPickerItem, and search/filter changes are reported via callbacks. Each
 * surface wraps this with its own data adapter (e.g. ClientAssetPicker feeds it
 * from useCatalog).
 *
 * Behavior:
 *  - search + optional facet filters → grid of catalog-style AssetPickerCards
 *  - multi-select with a per-item qty stepper bounded by availableQuantity
 *  - client mode (conditionDecision="require"): selecting an ORANGE asset REQUIRES
 *    a FIX_IN_ORDER / USE_AS_IS decision (reuses checkout's OrangeDecisionCard);
 *    RED is disabled with a reason. The decision rides on the confirmed selection.
 *  - ops mode (conditionDecision="none"): condition shown for awareness; RED /
 *    zero-availability disabled; no decision UI.
 *  - "Add N items" → onConfirm(selections).
 *
 * The picker does NOT mutate anything — the surface owns the save contract.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, PackageCheck, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AssetPickerCard } from "./AssetPickerCard";
import type {
    AssetPickerItem,
    AssetPickerProps,
    AssetPickerSelection,
    AssetPickerSibling,
    MaintenanceDecision,
} from "./types";

const ALL = "_all_";

// Internal per-selection draft. `itemId` is the picker item id (a grouped family
// keeps a single draft and re-targets `assetId` to the chosen sibling).
interface SelectionDraft {
    itemId: string;
    assetId: string;
    quantity: number;
    maintenanceDecision?: MaintenanceDecision;
}

export function AssetPicker({
    mode,
    items,
    isLoading = false,
    onSearch,
    facets,
    filterValues,
    onFilterChange,
    alreadyOnEntity = [],
    multiSelect = true,
    withQuantity = true,
    conditionDecision = mode === "client" ? "require" : "none",
    entityNoun = "order",
    renderDecision,
    onConfirm,
    pagination,
}: AssetPickerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    // Drafts keyed by picker item id.
    const [drafts, setDrafts] = useState<Record<string, SelectionDraft>>({});
    // STEP 1 = pick (search + multi-select + qty). STEP 2 = the dedicated ORANGE
    // decision screen, only ever reachable when there is >=1 selected ORANGE item
    // and conditionDecision === "require". When there are no oranges (or ops mode)
    // the flow stays single-step and confirm is "Add N items".
    const [step, setStep] = useState<"pick" | "decide">("pick");

    const alreadySet = useMemo(() => new Set(alreadyOnEntity), [alreadyOnEntity]);

    // Resolve the concrete target (asset_id, condition, availability, photos) for
    // an item, honoring a chosen sibling for grouped families.
    const resolveTarget = (item: AssetPickerItem, draft?: SelectionDraft) => {
        if (item.grouped && item.siblings && item.siblings.length > 0) {
            const chosen =
                (draft && item.siblings.find((s) => s.id === draft.assetId)) ??
                item.siblings.find((s) => s.availableQuantity > 0 && s.condition !== "RED") ??
                item.siblings[0];
            return {
                assetId: chosen.id,
                condition: chosen.condition,
                available: chosen.availableQuantity,
                conditionNotes: chosen.conditionNotes,
                conditionPhotos: chosen.conditionPhotos,
                refurbDaysEstimate: chosen.refurbDaysEstimate,
                imageUrl: chosen.imageUrl ?? item.imageUrl,
            };
        }
        return {
            assetId: item.id,
            condition: item.condition,
            available: item.availableQuantity,
            conditionNotes: item.conditionNotes,
            conditionPhotos: item.conditionPhotos,
            refurbDaysEstimate: item.refurbDaysEstimate,
            imageUrl: item.imageUrl,
        };
    };

    const toggleSelect = (item: AssetPickerItem) => {
        setDrafts((prev) => {
            const existing = prev[item.id];
            if (existing) {
                const { [item.id]: _removed, ...rest } = prev;
                return rest;
            }
            const target = resolveTarget(item);
            const next: Record<string, SelectionDraft> = multiSelect ? { ...prev } : {};
            next[item.id] = {
                itemId: item.id,
                assetId: target.assetId,
                quantity: 1,
            };
            return next;
        });
    };

    const changeQty = (item: AssetPickerItem, quantity: number) => {
        setDrafts((prev) => {
            const existing = prev[item.id];
            if (!existing) return prev;
            return { ...prev, [item.id]: { ...existing, quantity } };
        });
    };

    const pickSibling = (item: AssetPickerItem, sibling: AssetPickerSibling) => {
        setDrafts((prev) => {
            const existing = prev[item.id];
            if (!existing) return prev;
            // Re-targeting a sibling clears a stale ORANGE decision (the new
            // sibling may be GREEN, or need its own decision).
            return {
                ...prev,
                [item.id]: {
                    ...existing,
                    assetId: sibling.id,
                    maintenanceDecision: undefined,
                    quantity: Math.min(
                        existing.quantity,
                        sibling.availableQuantity > 0 ? sibling.availableQuantity : 1
                    ),
                },
            };
        });
    };

    const setDecision = (itemId: string, decision: MaintenanceDecision) => {
        setDrafts((prev) => {
            const existing = prev[itemId];
            if (!existing) return prev;
            return { ...prev, [itemId]: { ...existing, maintenanceDecision: decision } };
        });
    };

    // Selected items that are ORANGE and (client mode) still owe a decision.
    const selectedDrafts = useMemo(() => Object.values(drafts), [drafts]);

    // Build the list of selected ORANGE items needing a decision (client mode).
    const orangePending = useMemo(() => {
        if (conditionDecision !== "require") return [];
        const out: {
            item: AssetPickerItem;
            target: ReturnType<typeof resolveTarget>;
            draft: SelectionDraft;
        }[] = [];
        for (const draft of selectedDrafts) {
            const item = items.find((i) => i.id === draft.itemId);
            if (!item) continue;
            const target = resolveTarget(item, draft);
            if (target.condition === "ORANGE") out.push({ item, target, draft });
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDrafts, items, conditionDecision]);

    const unresolvedOrange = orangePending.filter((o) => !o.draft.maintenanceDecision).length;
    const selectedCount = selectedDrafts.length;
    // Two-step only when there's at least one selected ORANGE still owing a
    // decision. Once every orange is decided the user can confirm from step 1
    // directly (and is bounced back from step 2 by the guard effect below).
    const needsDecisionStep = unresolvedOrange > 0;
    const canConfirm = selectedCount > 0 && unresolvedOrange === 0;

    // If the user deselects every ORANGE item (or clears the selection) while on
    // the decision screen, fall back to step 1 — there's nothing to render. Note
    // this keys off whether ANY orange remains selected, NOT whether they're all
    // decided: a fully-decided screen must stay open so the user can confirm there.
    useEffect(() => {
        if (step === "decide" && orangePending.length === 0) setStep("pick");
    }, [step, orangePending.length]);

    const handleConfirm = () => {
        if (!canConfirm) return;
        const selections: AssetPickerSelection[] = selectedDrafts.map((d) => ({
            assetId: d.assetId,
            quantity: d.quantity,
            ...(d.maintenanceDecision ? { maintenanceDecision: d.maintenanceDecision } : {}),
        }));
        onConfirm(selections);
    };

    const addLabel =
        selectedCount > 0
            ? `Add ${selectedCount} item${selectedCount === 1 ? "" : "s"} to ${entityNoun}`
            : `Add to ${entityNoun}`;

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        onSearch(value);
    };

    const hasFacets =
        !!facets && (!!facets.brand?.length || !!facets.category?.length || !!facets.team?.length);

    return (
        <div className="flex flex-col">
            {step === "pick" && (
                <>
                    {/* Search + facets strip */}
                    <div className="border-b border-border bg-card px-6 py-4">
                        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Search assets"
                                    value={searchTerm}
                                    data-testid="asset-picker-search"
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </div>

                            {hasFacets && facets?.brand?.length ? (
                                <Select
                                    value={filterValues?.brand || ALL}
                                    onValueChange={(value) =>
                                        onFilterChange?.({
                                            ...filterValues,
                                            brand: value === ALL ? undefined : value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All brands" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All brands</SelectItem>
                                        {facets.brand.map((b) => (
                                            <SelectItem key={b.value} value={b.value}>
                                                {b.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : null}

                            {hasFacets && facets?.category?.length ? (
                                <Select
                                    value={filterValues?.category || ALL}
                                    onValueChange={(value) =>
                                        onFilterChange?.({
                                            ...filterValues,
                                            category: value === ALL ? undefined : value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All categories</SelectItem>
                                        {facets.category.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                <span className="flex items-center gap-2">
                                                    {c.color && (
                                                        <span
                                                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                                            style={{ backgroundColor: c.color }}
                                                        />
                                                    )}
                                                    {c.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : null}
                        </div>

                        {hasFacets && facets?.team?.length ? (
                            <div className="mt-3">
                                <Select
                                    value={filterValues?.team || ALL}
                                    onValueChange={(value) =>
                                        onFilterChange?.({
                                            ...filterValues,
                                            team: value === ALL ? undefined : value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full max-w-[220px]">
                                        <SelectValue placeholder="All departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All departments</SelectItem>
                                        {facets.team.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                    </div>

                    {/* Results grid */}
                    <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
                        {isLoading ? (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <Card key={index}>
                                        <Skeleton className="aspect-[4/3] w-full" />
                                        <CardContent className="space-y-3 p-4">
                                            <Skeleton className="h-4 w-1/3" />
                                            <Skeleton className="h-6 w-2/3" />
                                            <Skeleton className="h-4 w-full" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="py-16 text-center">
                                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                                <p className="text-lg font-semibold">No matching assets</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Adjust the search or filters and try again.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                                data-testid="asset-picker-grid"
                            >
                                {items.map((item) => {
                                    const draft = drafts[item.id];
                                    const target = resolveTarget(item, draft);
                                    return (
                                        <AssetPickerCard
                                            key={item.id}
                                            item={item}
                                            selected={!!draft}
                                            quantity={draft?.quantity ?? 1}
                                            targetId={target.assetId}
                                            targetCondition={target.condition}
                                            targetAvailable={target.available}
                                            withQuantity={withQuantity}
                                            alreadyAdded={alreadySet.has(target.assetId)}
                                            conditionDecision={conditionDecision}
                                            onToggleSelect={() => toggleSelect(item)}
                                            onChangeQty={(next) => changeQty(item, next)}
                                            onPickSibling={(sibling) => pickSibling(item, sibling)}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {pagination && pagination.totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
                                <span>
                                    {pagination.shown ?? items.length} of{" "}
                                    {pagination.total ?? items.length} results
                                </span>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.page <= 1}
                                        onClick={pagination.onPrev}
                                    >
                                        <ChevronLeft className="mr-1 h-4 w-4" />
                                        Previous
                                    </Button>
                                    <span>
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.page >= pagination.totalPages}
                                        onClick={pagination.onNext}
                                    >
                                        Next
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* STEP 2 — dedicated, vertically-scrollable ORANGE decision screen.
                Reachable only when there is >=1 selected ORANGE owing a decision
                (client mode). One OrangeDecisionCard (via renderDecision) per
                selected orange; scrolls cleanly for many oranges. */}
            {step === "decide" && (
                <div className="border-b border-border bg-card px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-amber-900">
                                ORANGE assets need a maintenance decision
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Choose how to handle each flagged asset before adding to{" "}
                                {entityNoun}.
                            </p>
                        </div>
                        <Badge
                            variant={unresolvedOrange > 0 ? "destructive" : "default"}
                            className="whitespace-nowrap"
                        >
                            {unresolvedOrange > 0 ? `${unresolvedOrange} pending` : "All decided"}
                        </Badge>
                    </div>
                </div>
            )}
            {step === "decide" && (
                <div
                    className="max-h-[55vh] space-y-3 overflow-y-auto px-6 py-5"
                    data-testid="asset-picker-decisions"
                >
                    {orangePending.map(({ item, target, draft }) => (
                        <div key={draft.itemId}>
                            {renderDecision?.({
                                assetName: item.name,
                                assetImage: target.imageUrl ?? undefined,
                                conditionNotes: target.conditionNotes ?? undefined,
                                conditionImages: target.conditionPhotos,
                                refurbDaysEstimate: target.refurbDaysEstimate ?? undefined,
                                decision: draft.maintenanceDecision,
                                onDecisionChange: (decision) => setDecision(draft.itemId, decision),
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* Footer bar — present whenever there is a selection. STEP 1 shows
                either "Next: decisions (N)" (if oranges owe a decision) or the
                terminal "Add N items"; STEP 2 shows Back + the terminal add. */}
            {selectedCount > 0 && (
                <div className="border-t border-border bg-card px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                        {step === "decide" ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep("pick")}
                                className="gap-1 text-muted-foreground hover:text-foreground"
                                data-testid="asset-picker-back"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setDrafts({})}
                                disabled={selectedCount === 0}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                                <X className="h-3 w-3" />
                                Clear selection
                            </button>
                        )}

                        {step === "pick" && needsDecisionStep ? (
                            <Button
                                onClick={() => setStep("decide")}
                                className="gap-2 font-mono"
                                data-testid="asset-picker-next"
                            >
                                Next: decisions ({orangePending.length})
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleConfirm}
                                disabled={!canConfirm}
                                className="gap-2 font-mono"
                                data-testid="asset-picker-confirm"
                            >
                                <PackageCheck className="h-4 w-4" />
                                {addLabel}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
