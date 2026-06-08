"use client";

/**
 * Order Editing — admin PER-SECTION INLINE editor (twin of the client's
 * OrderDetailEdit.tsx, adapted to the admin's editor components + visual
 * language).
 *
 * There is NO master "Edit Details" toggle. Each logical section renders its own
 * inline-editable card — Contact, Venue Contact, Venue & Logistics (with the
 * shared <PermitSection> bundled in the admin DescriptiveFieldsEditor), Event
 * Dates (lead-time-gated + feasibility helper), and Items (bounded <QtyStepper>
 * + 2-step <OpsAssetPicker>). Each section shows its current values with its OWN
 * inline "Edit" affordance; clicking it flips THAT section into its editor in
 * place, with its OWN Save / Cancel. Only one section is open at a time, so a
 * per-section Save's diff naturally carries only that section's keys (gated by
 * SECTION_KEYS). Items are ALWAYS inline (edited directly in the list), with
 * their own save bar shown only when there are item changes.
 *
 * The save contract is unchanged: a shared working `draft` is built from the
 * order snapshot (`original`); `buildPayload()` emits ONLY changed, allowlisted
 * keys; a per-section Save PATCHes that diff to /operations/v1/order/:id (via
 * useOrderEditDetails). No optimistic mutation — a successful save invalidates
 * the detail/history queries and the refetch drives the UI.
 *
 * The card self-gates on `canEdit` (pre-confirmation band + orders:edit_details
 * permission, computed by the parent page) — it renders nothing when locked.
 * Preserved from the prior implementation:
 *   - The save-gate fix: a required permit edited INTO the ambiguous
 *     required-but-no-owner state blocks save ONLY when the payload actually
 *     carries permit_requirements (never a pre-existing one untouched by an
 *     unrelated edit).
 *   - QUOTE_REVISED handling (status_reverted surfaced in the toast).
 *   - job_number is admin-only (canEditJobNumber).
 *   - enable_event_date_inputs per-company gating (reads order.company.features →
 *     platform default). When OFF, the dates section is read-only (no Edit).
 *   - Bounded item quantities (item.asset.available_quantity).
 *   - Feasibility blocks save on a too-soon edited event window.
 */

import { useMemo, useRef, useState } from "react";
import {
    Pencil,
    Save,
    X,
    AlertCircle,
    Loader2,
    User,
    MapPin,
    Building2,
    Calendar,
    Package,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import { useOrderEditDetails, type OrderEditDetailsPayload } from "@/hooks/use-orders";
import { useCities } from "@/hooks/use-cities";
import { usePlatform } from "@/lib/hooks/use-platform";
import { useOpsFeasibilityConfig, useOpsFeasibility } from "@/hooks/use-order-feasibility";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

/** The independently-editable sections (Items are always inline, never here). */
type SectionKey = "contact" | "venueContact" | "descriptive" | "eventDates";

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

function fmtDisplayDate(iso: unknown): string {
    const ymd = toDateInputValue(iso);
    if (!ymd) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!m) return ymd;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
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

/** Which payload keys belong to which section — used to scope per-section diffs. */
const SECTION_KEYS: Record<SectionKey, (keyof OrderEditDetailsPayload)[]> = {
    contact: ["contact_name", "contact_email", "contact_phone"],
    venueContact: ["venue_contact_name", "venue_contact_email", "venue_contact_phone"],
    // The admin DescriptiveFieldsEditor bundles the venue fields AND the shared
    // PermitSection (which owns access_notes), so this one section owns all of
    // venue_location + permit_requirements too.
    descriptive: [
        "venue_name",
        "venue_city_id",
        "venue_location",
        "special_instructions",
        "is_permanent_placement",
        "po_number",
        "job_number",
        "permit_requirements",
    ],
    eventDates: ["event_start_date", "event_end_date"],
};

// ----- small view-mode primitives (admin font-mono read rows) -----

function ReadRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                {label}
            </p>
            <p className="font-mono text-sm break-words">
                {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
            </p>
        </div>
    );
}

function SectionCard({
    icon,
    title,
    editing,
    canEdit = true,
    onEdit,
    children,
    testId,
}: {
    icon: React.ReactNode;
    title: string;
    editing: boolean;
    canEdit?: boolean;
    onEdit: () => void;
    children: React.ReactNode;
    testId?: string;
}) {
    return (
        <Card className={editing ? "border-primary/40" : undefined} data-testid={testId}>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <CardTitle className="font-mono text-sm flex items-center gap-2">
                        <span className="text-primary">{icon}</span>
                        {title}
                    </CardTitle>
                    {!editing && canEdit && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="font-mono text-xs shrink-0"
                            onClick={onEdit}
                            data-testid={testId ? `${testId}-edit` : undefined}
                        >
                            <Pencil className="h-3 w-3 mr-2" />
                            EDIT
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">{children}</CardContent>
        </Card>
    );
}

function SectionFooter({
    onCancel,
    onSave,
    saving,
    canSave,
    testId,
}: {
    onCancel: () => void;
    onSave: () => void;
    saving: boolean;
    canSave: boolean;
    testId?: string;
}) {
    return (
        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
            <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs"
                onClick={onCancel}
                disabled={saving}
            >
                <X className="h-3 w-3 mr-2" />
                CANCEL
            </Button>
            <Button
                size="sm"
                className="font-mono text-xs"
                onClick={onSave}
                disabled={saving || !canSave}
                data-testid={testId}
            >
                {saving ? (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                    <Save className="h-3 w-3 mr-2" />
                )}
                SAVE
            </Button>
        </div>
    );
}

export function EditOrderDetailsCard({
    order,
    canEdit,
    canEditJobNumber = true,
}: EditOrderDetailsCardProps) {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft>(() => buildDraft(order));
    // Only one section is open at a time. Items are ALWAYS inline (never in this
    // state). When a section opens, we reseed the draft from the order so it opens
    // clean and the diff only ever carries that section's changes.
    const [openSection, setOpenSection] = useState<SectionKey | null>(null);
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
    // event-date section is read-only (no inline Edit affordance).
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

    // The pristine snapshot to diff against when saving (reseeds on refetch).
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
    // start date. Only meaningful while the dates section is open + exposed.
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
        enabled: openSection === "eventDates" && eventDateInputsEnabled,
    });

    // --- item ops handlers (always-inline items section) -------------------
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
    const hasItemChanges = "items" in payload;

    // Save-gate fix (preserved): only block on a permit that was EDITED into the
    // ambiguous required-but-no-owner state — never on a pre-existing one that an
    // unrelated edit (e.g. adding an item) didn't touch.
    const permitChangedThisSession = "permit_requirements" in payload;
    const permitOwnerUnresolved =
        permitChangedThisSession &&
        draft.descriptive.permit.requires_permit &&
        draft.descriptive.permit.permit_owner === "UNKNOWN";

    const endBeforeStart =
        !!draft.eventDates.event_start_date &&
        !!draft.eventDates.event_end_date &&
        draft.eventDates.event_end_date < draft.eventDates.event_start_date;

    // Feasibility helper inputs — does the picked start clear the lead floor?
    const floorDate = feasibility?.lead_floor_date ?? null;
    const pickedStart = draft.eventDates.event_start_date;
    const userDateFeasible =
        pickedStart && floorDate ? (pickedStart >= floorDate ? true : false) : null;
    const blockingIssues = (feasibility?.issues ?? []).filter(
        (i) => i.maintenance_mode === "MANDATORY_RED" || i.condition === "RED"
    );
    // Block save when the edited dates aren't feasible (checkout's Next gate).
    const feasibilityBlocks =
        openSection === "eventDates" &&
        eventDateInputsEnabled &&
        SECTION_KEYS.eventDates.some((k) => k in payload) &&
        userDateFeasible === false;

    // ---- open / cancel / save plumbing ----

    const handleOpen = (key: SectionKey) => {
        setDraft(buildDraft(order));
        setErrorMessage(null);
        setOpenSection(key);
    };

    const handleCancelSection = () => {
        setDraft(buildDraft(order));
        setErrorMessage(null);
        setOpenSection(null);
    };

    const handleDiscardItemChanges = () => {
        setDraft((prev) => ({
            ...prev,
            itemRows: buildItemRows(order),
            stagedAdds: [],
        }));
    };

    const saveSection = async (section: SectionKey | "items") => {
        setErrorMessage(null);

        if (!hasChanges) {
            toast.info("No changes to save");
            if (section !== "items") setOpenSection(null);
            return;
        }

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

        if (feasibilityBlocks) {
            const message =
                "This event date is too soon for the selected items. Pick a later date.";
            setErrorMessage(message);
            toast.error(message);
            return;
        }

        try {
            const result = await editDetails.mutateAsync({ orderId: order.id, payload });
            const data = (result as { data?: { status_reverted?: boolean } } | undefined)?.data;
            if (data?.status_reverted) {
                toast.success("Order details updated. The quote was withdrawn for re-review.");
            } else {
                toast.success("Order details updated");
            }
            if (section !== "items") setOpenSection(null);
        } catch (error: unknown) {
            const message =
                (error instanceof Error && error.message) || "Failed to update order details";
            setErrorMessage(message);
            toast.error(message);
        }
    };

    if (!canEdit) return null;

    const saving = editDetails.isPending;
    const cityName = order?.venue_city || order?.venue_location?.city || "";

    return (
        <div className="space-y-4">
            {errorMessage && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-700 font-mono">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Contact */}
            <SectionCard
                icon={<User className="h-4 w-4" />}
                title="EXECUTION CONTACT"
                editing={openSection === "contact"}
                onEdit={() => handleOpen("contact")}
                testId="order-section-contact"
            >
                {openSection === "contact" ? (
                    <>
                        <ContactEditor
                            value={draft.contact}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    contact: { ...prev.contact, ...patch },
                                }))
                            }
                            disabled={saving}
                        />
                        <SectionFooter
                            onCancel={handleCancelSection}
                            onSave={() => saveSection("contact")}
                            saving={saving}
                            canSave={SECTION_KEYS.contact.some((k) => k in payload)}
                            testId="order-section-contact-save"
                        />
                    </>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <ReadRow label="Name" value={order?.contact_name} />
                        <ReadRow label="Email" value={order?.contact_email} />
                        <ReadRow label="Phone" value={order?.contact_phone} />
                    </div>
                )}
            </SectionCard>

            {/* Venue Contact */}
            <SectionCard
                icon={<MapPin className="h-4 w-4" />}
                title="VENUE CONTACT"
                editing={openSection === "venueContact"}
                onEdit={() => handleOpen("venueContact")}
                testId="order-section-venue-contact"
            >
                {openSection === "venueContact" ? (
                    <>
                        <VenueContactEditor
                            value={draft.venueContact}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    venueContact: { ...prev.venueContact, ...patch },
                                }))
                            }
                            disabled={saving}
                        />
                        <SectionFooter
                            onCancel={handleCancelSection}
                            onSave={() => saveSection("venueContact")}
                            saving={saving}
                            canSave={SECTION_KEYS.venueContact.some((k) => k in payload)}
                            testId="order-section-venue-contact-save"
                        />
                    </>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <ReadRow label="Name" value={order?.venue_contact_name} />
                        <ReadRow label="Email" value={order?.venue_contact_email} />
                        <ReadRow label="Phone" value={order?.venue_contact_phone} />
                    </div>
                )}
            </SectionCard>

            {/* Venue & Logistics (incl. the bundled shared PermitSection) */}
            <SectionCard
                icon={<Building2 className="h-4 w-4" />}
                title="VENUE, LOGISTICS & PERMIT"
                editing={openSection === "descriptive"}
                onEdit={() => handleOpen("descriptive")}
                testId="order-section-descriptive"
            >
                {openSection === "descriptive" ? (
                    <>
                        <DescriptiveFieldsEditor
                            value={draft.descriptive}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    descriptive: { ...prev.descriptive, ...patch },
                                }))
                            }
                            disabled={saving}
                            cities={cities as any}
                            companyName={order?.company?.name}
                            canEditJobNumber={canEditJobNumber}
                        />
                        {draft.descriptive.permit.requires_permit &&
                            draft.descriptive.permit.permit_owner === "UNKNOWN" && (
                                <p
                                    role="alert"
                                    className="font-mono text-[11px] font-medium text-destructive"
                                >
                                    Select who arranges the permit before saving.
                                </p>
                            )}
                        <SectionFooter
                            onCancel={handleCancelSection}
                            onSave={() => saveSection("descriptive")}
                            saving={saving}
                            canSave={
                                SECTION_KEYS.descriptive.some((k) => k in payload) &&
                                !permitOwnerUnresolved
                            }
                            testId="order-section-descriptive-save"
                        />
                    </>
                ) : (
                    <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ReadRow label="Venue Name" value={order?.venue_name} />
                            <ReadRow label="City" value={cityName} />
                        </div>
                        <ReadRow label="Address" value={order?.venue_location?.address} />
                        <ReadRow label="Special Instructions" value={order?.special_instructions} />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ReadRow
                                label="Permanent Placement"
                                value={order?.is_permanent_placement ? "Yes" : "No"}
                            />
                            <ReadRow label="PO Number" value={order?.po_number} />
                        </div>
                        {canEditJobNumber && (
                            <ReadRow label="Job Number" value={order?.job_number} />
                        )}
                        <ReadRow
                            label="Permit Required"
                            value={order?.permit_requirements?.requires_permit ? "Yes" : "No"}
                        />
                        {order?.permit_requirements?.requires_permit && (
                            <ReadRow
                                label="Who Arranges"
                                value={
                                    order.permit_requirements.permit_owner === "CLIENT"
                                        ? `${order?.company?.name || "Client"} will arrange it`
                                        : order.permit_requirements.permit_owner === "PLATFORM"
                                          ? "Ops will arrange it"
                                          : "Not decided yet"
                                }
                            />
                        )}
                        <ReadRow label="Access Notes" value={order?.venue_location?.access_notes} />
                    </div>
                )}
            </SectionCard>

            {/* Event Dates — gated on enable_event_date_inputs */}
            <SectionCard
                icon={<Calendar className="h-4 w-4" />}
                title="EVENT DATES"
                editing={openSection === "eventDates"}
                canEdit={eventDateInputsEnabled}
                onEdit={() => handleOpen("eventDates")}
                testId="order-section-event-dates"
            >
                {openSection === "eventDates" ? (
                    <>
                        <EventDatesEditor
                            value={draft.eventDates}
                            onChange={(patch) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    eventDates: { ...prev.eventDates, ...patch },
                                }))
                            }
                            disabled={saving}
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
                        <SectionFooter
                            onCancel={handleCancelSection}
                            onSave={() => saveSection("eventDates")}
                            saving={saving}
                            canSave={
                                SECTION_KEYS.eventDates.some((k) => k in payload) &&
                                !endBeforeStart &&
                                !feasibilityBlocks
                            }
                            testId="order-section-event-dates-save"
                        />
                    </>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ReadRow label="Start" value={fmtDisplayDate(order?.event_start_date)} />
                        <ReadRow label="End" value={fmtDisplayDate(order?.event_end_date)} />
                        {!eventDateInputsEnabled && (
                            <p className="sm:col-span-2 font-mono text-[11px] text-muted-foreground">
                                Event dates are managed by the platform for this account.
                            </p>
                        )}
                    </div>
                )}
            </SectionCard>

            {/* Items — ALWAYS inline (edited directly in the list). */}
            <SectionCard
                icon={<Package className="h-4 w-4" />}
                title="ITEMS"
                editing={false}
                canEdit={false}
                onEdit={() => {}}
                testId="order-section-items"
            >
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
                    disabled={saving}
                />

                {/* Save bar for item ops — only shown when there are item changes. */}
                {hasItemChanges && (
                    <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
                        <Button
                            size="sm"
                            variant="outline"
                            className="font-mono text-xs"
                            onClick={handleDiscardItemChanges}
                            disabled={saving}
                        >
                            <X className="h-3 w-3 mr-2" />
                            DISCARD ITEM CHANGES
                        </Button>
                        <Button
                            size="sm"
                            className="font-mono text-xs"
                            onClick={() => saveSection("items")}
                            disabled={saving}
                            data-testid="order-section-items-save"
                        >
                            {saving ? (
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            ) : (
                                <Check className="h-3 w-3 mr-2" />
                            )}
                            SAVE ITEM CHANGES
                        </Button>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
