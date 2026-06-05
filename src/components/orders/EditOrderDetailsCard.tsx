"use client";

/**
 * Order Editing — admin inline editor, restructured to PER-SECTION editing
 * (twin of the client's OrderEditPanel).
 *
 * "Edit Details" reveals controlled section editors — Contact, Venue Contact,
 * Venue & Logistics (with the shared <PermitSection> 1:1 twin of the client's),
 * Event Dates (lead-time-gated + feasibility helper), and Items (bounded
 * <QtyStepper> + 2-step <OpsAssetPicker>). On save we diff the working draft
 * against the original order snapshot and PATCH ONLY the changed keys to
 * /operations/v1/order/:id (via useOrderEditDetails). No optimistic mutation —
 * a successful save invalidates the detail/history queries and the refetch
 * drives the UI.
 *
 * The card self-gates on `canEdit` (pre-confirmation band + orders:edit_details
 * permission, computed by the parent page) — it renders nothing when locked.
 * The API re-checks the band and 409s if the order has moved on; we surface that
 * message inline + as a toast. The save-gate fix (only block on a permit edited
 * INTO the ambiguous required-but-no-owner state, not pre-existing) is preserved.
 */

import { useMemo, useRef, useState } from "react";
import { Pencil, Save, X, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOrderEditDetails, type OrderEditDetailsPayload } from "@/hooks/use-orders";
import { useCities } from "@/hooks/use-cities";
import { usePlatform } from "@/lib/hooks/use-platform";
import { useOpsFeasibilityConfig, useOpsFeasibility } from "@/hooks/use-order-feasibility";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type PermitSectionValue } from "@/components/permits/PermitSection";
import { ContactEditor, type ContactDraft } from "./editing/ContactEditor";
import { VenueContactEditor, type VenueContactDraft } from "./editing/VenueContactEditor";
import { DescriptiveFieldsEditor, type DescriptiveDraft } from "./editing/DescriptiveFieldsEditor";
import { EventDatesEditor, type EventDatesDraft } from "./editing/EventDatesEditor";
import {
    OrderItemsQuantityEditor,
    type ItemQuantityRow,
    type StagedAdd,
} from "./editing/OrderItemsQuantityEditor";
import { OrderEditFeasibilityHelper } from "./editing/OrderEditFeasibilityHelper";
import type { NamedAssetSelection } from "@/components/assets/asset-picker/OpsAssetPicker";

interface EditOrderDetailsCardProps {
    order: any;
    canEdit: boolean;
    /** Whether the admin may edit the platform job number (admin-only field). */
    canEditJobNumber?: boolean;
}

const s = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

// `<Input type="date">` expects YYYY-MM-DD. Event dates arrive as ISO strings;
// take the calendar-day portion in UTC so the day never drifts by timezone.
function toDateInputValue(iso: unknown): string {
    if (typeof iso !== "string" || iso.length === 0) return "";
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
    if (m) return m[1];
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) return "";
    const y = parsed.getUTCFullYear();
    const mo = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
}

interface Draft {
    contact: ContactDraft;
    venueContact: VenueContactDraft;
    descriptive: DescriptiveDraft;
    eventDates: EventDatesDraft;
    itemRows: ItemQuantityRow[];
    stagedAdds: StagedAdd[];
}

// Build the editable item-quantity rows from the order detail payload. Each row's
// `max` bound is available_quantity + currently-booked qty (the most the order can
// hold without exceeding stock); 0 = unbounded above when availability isn't
// exposed on the item (server stays authoritative).
function buildItemRows(order: any): ItemQuantityRow[] {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items
        .map((item: any): ItemQuantityRow | null => {
            const orderItemId = item?.order_item?.id;
            if (!orderItemId) return null;
            const qty = Number(item?.order_item?.quantity);
            const quantity = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
            const availRaw = Number(item?.asset?.available_quantity);
            // available_quantity is the stock NOT already booked; the rows current
            // booked qty is held out, so the ceiling is avail + this row's booking.
            const max = Number.isFinite(availRaw) ? availRaw + quantity : 0;
            return {
                order_item_id: orderItemId,
                asset_name: item?.asset?.name || item?.order_item?.asset_name || "Item",
                quantity,
                original_quantity: quantity,
                pending_remove: false,
                max,
            };
        })
        .filter((row: ItemQuantityRow | null): row is ItemQuantityRow => row !== null);
}

function buildPermit(order: any): PermitSectionValue {
    const permit = order?.permit_requirements ?? null;
    const requires = Boolean(permit?.requires_permit);
    return {
        // permit_decision is null only when the order never answered the permit
        // question; an existing requires_permit flag implies a "yes" decision.
        permit_decision: permit == null ? null : requires ? "yes" : "no",
        requires_permit: requires,
        permit_owner: (permit?.permit_owner as PermitSectionValue["permit_owner"]) ?? "UNKNOWN",
        requires_vehicle_docs: Boolean(permit?.requires_vehicle_docs),
        requires_staff_ids: Boolean(permit?.requires_staff_ids),
        permit_notes: s(permit?.notes),
        venue_access_notes: s(order?.venue_location?.access_notes),
    };
}

function buildDraft(order: any): Draft {
    const loc = order?.venue_location ?? {};
    return {
        contact: {
            contact_name: s(order?.contact_name),
            contact_email: s(order?.contact_email),
            contact_phone: s(order?.contact_phone),
        },
        venueContact: {
            venue_contact_name: s(order?.venue_contact_name),
            venue_contact_email: s(order?.venue_contact_email),
            venue_contact_phone: s(order?.venue_contact_phone),
        },
        descriptive: {
            venue_name: s(order?.venue_name),
            venue_city_id: s(order?.venue_city_id),
            venue_address: s(loc?.address),
            venue_country: s(loc?.country),
            venue_city_text: s(loc?.city),
            special_instructions: s(order?.special_instructions),
            is_permanent_placement: Boolean(order?.is_permanent_placement),
            po_number: s(order?.po_number),
            job_number: s(order?.job_number),
            permit: buildPermit(order),
        },
        eventDates: {
            event_start_date: toDateInputValue(order?.event_start_date),
            event_end_date: toDateInputValue(order?.event_end_date),
        },
        itemRows: buildItemRows(order),
        stagedAdds: [],
    };
}

// Compute the lead-time floor (YYYY-MM-DD) from the resolved feasibility config —
// the earliest the event start can be picked. Mirrors checkout's calculateMinDate.
function computeMinDate(
    config:
        | {
              minimum_lead_hours?: number;
              exclude_weekends?: boolean;
              weekend_days?: number[];
          }
        | null
        | undefined
): string | undefined {
    if (!config) return undefined;
    const leadHours = config.minimum_lead_hours ?? 24;
    const date = new Date();
    date.setTime(date.getTime() + leadHours * 60 * 60 * 1000);
    if (config.exclude_weekends) {
        const weekendDays = new Set(config.weekend_days ?? [0, 6]);
        while (weekendDays.has(date.getDay())) date.setDate(date.getDate() + 1);
    }
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
}

export function EditOrderDetailsCard({
    order,
    canEdit,
    canEditJobNumber = true,
}: EditOrderDetailsCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft>(() => buildDraft(order));
    const addKeySeq = useRef(0);

    const editDetails = useOrderEditDetails();
    const { data: citiesResponse } = useCities();
    const cities = Array.isArray(citiesResponse?.data) ? citiesResponse.data : [];
    const { data: platform } = usePlatform();

    // Lead-time + weekend rules scoped to the order's company. Drives the date
    // `min` and the feasibility helper's floor copy.
    const { data: feasibilityConfig } = useOpsFeasibilityConfig(canEdit ? order?.id : null);
    const minDate = useMemo(() => computeMinDate(feasibilityConfig), [feasibilityConfig]);

    // enable_event_date_inputs per-company → platform default. When OFF, the
    // event-date section is hidden (task #10).
    const eventDateInputsEnabled = useMemo(() => {
        const companyFeatures = (order?.company?.features ?? null) as Record<
            string,
            unknown
        > | null;
        if (companyFeatures && typeof companyFeatures.enable_event_date_inputs === "boolean") {
            return companyFeatures.enable_event_date_inputs;
        }
        const platformValue = (platform?.features as Record<string, unknown> | undefined)?.[
            "enable_event_date_inputs"
        ];
        return platformValue === true;
    }, [order?.company?.features, platform?.features]);

    // The pristine snapshot to diff against when saving.
    const original = useMemo(() => buildDraft(order), [order]);

    // Asset ids the picker should mark "already added": assets currently on the
    // order (excluding rows pending removal) + already-staged adds.
    const alreadyOnEntityAssetIds = useMemo(() => {
        const ids = new Set<string>();
        const items = Array.isArray(order?.items) ? order.items : [];
        const pendingRemovedItemIds = new Set(
            draft.itemRows.filter((r) => r.pending_remove).map((r) => r.order_item_id)
        );
        for (const item of items) {
            const orderItemId = item?.order_item?.id;
            if (orderItemId && pendingRemovedItemIds.has(orderItemId)) continue;
            const assetId = item?.asset?.id ?? item?.order_item?.asset_id;
            if (assetId) ids.add(assetId);
        }
        for (const add of draft.stagedAdds) ids.add(add.asset_id);
        return Array.from(ids);
    }, [order, draft.itemRows, draft.stagedAdds]);

    // Feasibility subscription — fires on the staged item set + the picked event
    // start date. Only meaningful when the date section is shown.
    const feasibilityItems = useMemo(() => {
        const items = Array.isArray(order?.items) ? order.items : [];
        const removed = new Set(
            draft.itemRows.filter((r) => r.pending_remove).map((r) => r.order_item_id)
        );
        const out: Array<{ asset_id: string }> = [];
        for (const item of items) {
            const orderItemId = item?.order_item?.id;
            if (orderItemId && removed.has(orderItemId)) continue;
            const assetId = item?.asset?.id ?? item?.order_item?.asset_id;
            if (assetId) out.push({ asset_id: assetId });
        }
        for (const add of draft.stagedAdds) out.push({ asset_id: add.asset_id });
        return out;
    }, [order, draft.itemRows, draft.stagedAdds]);

    const { data: feasibility, isFetching: feasibilityLoading } = useOpsFeasibility({
        orderId: order?.id,
        items: feasibilityItems,
        eventStartDate: draft.eventDates.event_start_date || null,
        enabled: isEditing && eventDateInputsEnabled,
    });

    if (!canEdit) return null;

    const handleEdit = () => {
        setDraft(buildDraft(order));
        setErrorMessage(null);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setDraft(buildDraft(order));
        setErrorMessage(null);
        setIsEditing(false);
    };

    // --- item ops handlers -------------------------------------------------
    const setItemQuantity = (orderItemId: string, next: number) => {
        const qty = Number.isFinite(next) ? Math.max(1, Math.floor(next)) : 1;
        setDraft((prev) => ({
            ...prev,
            itemRows: prev.itemRows.map((row) =>
                row.order_item_id === orderItemId ? { ...row, quantity: qty } : row
            ),
        }));
    };

    const toggleItemRemove = (orderItemId: string, remove: boolean) => {
        setDraft((prev) => ({
            ...prev,
            itemRows: prev.itemRows.map((row) =>
                row.order_item_id === orderItemId ? { ...row, pending_remove: remove } : row
            ),
        }));
    };

    const addStagedAssets = (selections: NamedAssetSelection[]) => {
        if (selections.length === 0) return;
        setDraft((prev) => {
            const next = [...prev.stagedAdds];
            for (const sel of selections) {
                const qty = Number.isFinite(sel.quantity)
                    ? Math.max(1, Math.floor(sel.quantity))
                    : 1;
                const idx = next.findIndex((a) => a.asset_id === sel.assetId);
                if (idx >= 0) {
                    next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
                } else {
                    addKeySeq.current += 1;
                    next.push({
                        key: `add-${addKeySeq.current}`,
                        asset_id: sel.assetId,
                        asset_name: sel.name,
                        quantity: qty,
                        max: Number.isFinite(sel.availableQuantity) ? sel.availableQuantity : 0,
                    });
                }
            }
            return { ...prev, stagedAdds: next };
        });
    };

    const setStagedAddQuantity = (key: string, next: number) => {
        const qty = Number.isFinite(next) ? Math.max(1, Math.floor(next)) : 1;
        setDraft((prev) => ({
            ...prev,
            stagedAdds: prev.stagedAdds.map((a) => (a.key === key ? { ...a, quantity: qty } : a)),
        }));
    };

    const removeStagedAdd = (key: string) => {
        setDraft((prev) => ({
            ...prev,
            stagedAdds: prev.stagedAdds.filter((a) => a.key !== key),
        }));
    };

    // --- diff → payload ----------------------------------------------------
    const buildPayload = (): OrderEditDetailsPayload => {
        const payload: OrderEditDetailsPayload = {};
        const d = draft;
        const o = original;

        // Contact + venue contact + simple descriptive (changed-only).
        if (d.contact.contact_name !== o.contact.contact_name)
            payload.contact_name = d.contact.contact_name;
        if (d.contact.contact_email !== o.contact.contact_email)
            payload.contact_email = d.contact.contact_email;
        if (d.contact.contact_phone !== o.contact.contact_phone)
            payload.contact_phone = d.contact.contact_phone;

        if (d.venueContact.venue_contact_name !== o.venueContact.venue_contact_name)
            payload.venue_contact_name = d.venueContact.venue_contact_name;
        if (d.venueContact.venue_contact_email !== o.venueContact.venue_contact_email)
            payload.venue_contact_email = d.venueContact.venue_contact_email;
        if (d.venueContact.venue_contact_phone !== o.venueContact.venue_contact_phone)
            payload.venue_contact_phone = d.venueContact.venue_contact_phone;

        const dd = d.descriptive;
        const od = o.descriptive;
        if (dd.venue_name !== od.venue_name) payload.venue_name = dd.venue_name;
        if (dd.venue_city_id !== od.venue_city_id) payload.venue_city_id = dd.venue_city_id;
        if (dd.special_instructions !== od.special_instructions)
            payload.special_instructions = dd.special_instructions;
        if (dd.po_number !== od.po_number) payload.po_number = dd.po_number;
        if (canEditJobNumber && dd.job_number !== od.job_number) payload.job_number = dd.job_number;
        if (dd.is_permanent_placement !== od.is_permanent_placement)
            payload.is_permanent_placement = dd.is_permanent_placement;

        // venue_location — send the whole object if address/country/free-text-city
        // OR the in-permit access notes changed (access_notes lives here).
        const accessNotesChanged = dd.permit.venue_access_notes !== od.permit.venue_access_notes;
        if (
            dd.venue_address !== od.venue_address ||
            dd.venue_country !== od.venue_country ||
            dd.venue_city_text !== od.venue_city_text ||
            accessNotesChanged
        ) {
            payload.venue_location = {
                country: dd.venue_country,
                city: dd.venue_city_text,
                address: dd.venue_address,
                access_notes: dd.permit.venue_access_notes,
            };
        }

        // permit_requirements — send the whole object if any permit sub-field
        // changed. Map PermitSection's shape → the wire shape.
        const p = dd.permit;
        const op = od.permit;
        const permitChanged =
            p.requires_permit !== op.requires_permit ||
            p.permit_owner !== op.permit_owner ||
            p.requires_vehicle_docs !== op.requires_vehicle_docs ||
            p.requires_staff_ids !== op.requires_staff_ids ||
            p.permit_notes !== op.permit_notes;
        if (permitChanged) {
            payload.permit_requirements = {
                requires_permit: p.requires_permit,
                permit_owner: p.permit_owner,
                requires_vehicle_docs: p.requires_vehicle_docs,
                requires_staff_ids: p.requires_staff_ids,
                notes: p.permit_notes,
            };
        }

        // Event dates (Tier C) — only when the inputs are exposed + changed.
        if (eventDateInputsEnabled) {
            if (d.eventDates.event_start_date !== o.eventDates.event_start_date)
                payload.event_start_date = d.eventDates.event_start_date;
            if (d.eventDates.event_end_date !== o.eventDates.event_end_date)
                payload.event_end_date = d.eventDates.event_end_date;
        }

        // Item ops (Tier C) — REMOVE / UPDATE / ADD. A removed row never also
        // emits a quantity UPDATE.
        const itemOps: NonNullable<OrderEditDetailsPayload["items"]> = [];
        for (const row of d.itemRows) {
            if (row.pending_remove) {
                itemOps.push({ op: "REMOVE", order_item_id: row.order_item_id });
            } else if (row.quantity !== row.original_quantity) {
                itemOps.push({
                    op: "UPDATE",
                    order_item_id: row.order_item_id,
                    quantity: row.quantity,
                });
            }
        }
        for (const add of d.stagedAdds) {
            itemOps.push({ op: "ADD", asset_id: add.asset_id, quantity: add.quantity });
        }
        if (itemOps.length > 0) payload.items = itemOps;

        return payload;
    };

    const payload = buildPayload();
    const hasChanges = Object.keys(payload).length > 0;

    // Save-gate fix (preserved): only block on a permit that was EDITED into the
    // ambiguous required-but-no-owner state — never on a pre-existing one that an
    // unrelated edit (e.g. adding an item) didn't touch.
    const permitChangedThisSession = "permit_requirements" in payload;
    const permitOwnerUnresolved =
        permitChangedThisSession &&
        draft.descriptive.permit.requires_permit &&
        draft.descriptive.permit.permit_owner === "UNKNOWN";

    const handleSave = async () => {
        setErrorMessage(null);

        if (permitOwnerUnresolved) {
            const message = "Select who arranges the permit before saving";
            setErrorMessage(message);
            toast.error(message);
            return;
        }

        if (
            eventDateInputsEnabled &&
            draft.eventDates.event_start_date &&
            draft.eventDates.event_end_date &&
            draft.eventDates.event_end_date < draft.eventDates.event_start_date
        ) {
            const message = "Event end date must be on or after the start date";
            setErrorMessage(message);
            toast.error(message);
            return;
        }

        if (!hasChanges) {
            toast.info("No changes to save");
            setIsEditing(false);
            return;
        }

        try {
            await editDetails.mutateAsync({ orderId: order.id, payload });
            toast.success("Order details updated");
            setIsEditing(false);
        } catch (error: unknown) {
            const message =
                (error instanceof Error && error.message) || "Failed to update order details";
            setErrorMessage(message);
            toast.error(message);
        }
    };

    // Feasibility helper inputs — does the picked start clear the lead floor?
    const floorDate = feasibility?.lead_floor_date ?? null;
    const pickedStart = draft.eventDates.event_start_date;
    const userDateFeasible =
        pickedStart && floorDate ? (pickedStart >= floorDate ? true : false) : null;
    const blockingIssues = (feasibility?.issues ?? []).filter(
        (i) => i.maintenance_mode === "MANDATORY_RED" || i.condition === "RED"
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-sm flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-primary" />
                        EDIT ORDER DETAILS
                    </CardTitle>
                    {!isEditing ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="font-mono text-xs"
                            onClick={handleEdit}
                        >
                            <Pencil className="h-3 w-3 mr-2" />
                            EDIT
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="font-mono text-xs"
                                onClick={handleCancel}
                                disabled={editDetails.isPending}
                            >
                                <X className="h-3 w-3 mr-2" />
                                CANCEL
                            </Button>
                            <Button
                                size="sm"
                                className="font-mono text-xs"
                                onClick={handleSave}
                                disabled={
                                    editDetails.isPending || !hasChanges || permitOwnerUnresolved
                                }
                            >
                                {editDetails.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-3 w-3 mr-2" />
                                )}
                                SAVE
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {!isEditing ? (
                    <p className="font-mono text-xs text-muted-foreground">
                        Edit contact, venue, permit, dates, items, and reference fields while the
                        order is pre-confirmation. Changes are logged in the edit history.
                    </p>
                ) : (
                    <>
                        {errorMessage && (
                            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-700 font-mono">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Execution Contact */}
                        <section className="space-y-3">
                            <p className="font-mono text-xs font-bold uppercase tracking-wide">
                                Execution Contact
                            </p>
                            <ContactEditor
                                value={draft.contact}
                                onChange={(patch) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        contact: { ...prev.contact, ...patch },
                                    }))
                                }
                                disabled={editDetails.isPending}
                            />
                        </section>

                        <Separator />

                        {/* Venue Contact */}
                        <section className="space-y-3">
                            <p className="font-mono text-xs font-bold uppercase tracking-wide">
                                Venue Contact
                            </p>
                            <VenueContactEditor
                                value={draft.venueContact}
                                onChange={(patch) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        venueContact: { ...prev.venueContact, ...patch },
                                    }))
                                }
                                disabled={editDetails.isPending}
                            />
                        </section>

                        <Separator />

                        {/* Venue & Logistics (incl. the shared PermitSection) */}
                        <section className="space-y-3">
                            <DescriptiveFieldsEditor
                                value={draft.descriptive}
                                onChange={(patch) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        descriptive: { ...prev.descriptive, ...patch },
                                    }))
                                }
                                disabled={editDetails.isPending}
                                cities={cities as any}
                                companyName={order?.company?.name}
                                canEditJobNumber={canEditJobNumber}
                            />
                        </section>

                        {/* Event Dates — gated on enable_event_date_inputs (#10) */}
                        {eventDateInputsEnabled && (
                            <>
                                <Separator />
                                <section className="space-y-3">
                                    <p className="font-mono text-xs font-bold uppercase tracking-wide">
                                        Event
                                    </p>
                                    <EventDatesEditor
                                        value={draft.eventDates}
                                        onChange={(patch) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                eventDates: { ...prev.eventDates, ...patch },
                                            }))
                                        }
                                        disabled={editDetails.isPending}
                                        minDate={minDate}
                                        helper={
                                            <OrderEditFeasibilityHelper
                                                isLoading={feasibilityLoading}
                                                floorDate={floorDate}
                                                userEventDate={pickedStart}
                                                userDateFeasible={userDateFeasible}
                                                blockingItems={blockingIssues}
                                                config={feasibility?.config ?? null}
                                                onUseFloorDate={() =>
                                                    floorDate &&
                                                    setDraft((prev) => ({
                                                        ...prev,
                                                        eventDates: {
                                                            ...prev.eventDates,
                                                            event_start_date: floorDate,
                                                        },
                                                    }))
                                                }
                                            />
                                        }
                                    />
                                </section>
                            </>
                        )}

                        <Separator />

                        {/* Items — bounded QtyStepper + 2-step OpsAssetPicker */}
                        <section className="space-y-3">
                            <p className="font-mono text-xs font-bold uppercase tracking-wide">
                                Items
                            </p>
                            <OrderItemsQuantityEditor
                                items={draft.itemRows}
                                onSetItemQuantity={setItemQuantity}
                                onToggleRemove={toggleItemRemove}
                                stagedAdds={draft.stagedAdds}
                                onAddAssets={addStagedAssets}
                                onChangeAddQty={setStagedAddQuantity}
                                onRemoveAdd={removeStagedAdd}
                                companyId={order?.company?.id}
                                alreadyOnEntity={alreadyOnEntityAssetIds}
                                disabled={editDetails.isPending}
                            />
                        </section>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
