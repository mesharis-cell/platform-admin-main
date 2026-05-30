"use client";

/**
 * Order Editing (Phase 1) — inline editor for descriptive (Tier-A) fields.
 *
 * View mode renders nothing of its own beyond an "EDIT DETAILS" affordance —
 * the surrounding detail page already shows contact / venue / permit cards.
 * Edit mode opens a form covering the Tier-A fields; on save we diff against
 * the original order snapshot and send ONLY the changed keys to
 * PATCH /operations/v1/order/:id (via useOrderEditDetails).
 *
 * The card is only rendered when `canEdit` is true (pre-confirmation band +
 * orders:edit_details permission), computed by the parent page. The API
 * re-checks the band and returns 409 if the order has moved on; we surface
 * that message inline + as a toast.
 */

import { useMemo, useRef, useState } from "react";
import { useOrderEditDetails, type OrderEditDetailsPayload } from "@/hooks/use-orders";
import { useCities } from "@/hooks/use-cities";
import { useSearchAssets } from "@/hooks/use-assets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Pencil,
    Save,
    X,
    AlertCircle,
    Loader2,
    Calendar,
    Minus,
    Plus,
    Package,
    Trash2,
    RotateCcw,
    PlusCircle,
    ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";

interface EditOrderDetailsCardProps {
    order: any;
    canEdit: boolean;
}

type PermitOwner = "CLIENT" | "PLATFORM" | "UNKNOWN";

// One editable row per existing order item. `order_item_id` is the
// `order_item.id` the server reconciles bookings against (NOT the line `item.id`
// or the asset id). `quantity` is the editable value; `original_quantity` lets
// us diff without re-deriving from the order on every keystroke. `pending_remove`
// marks the row for a REMOVE op — a removed row never also emits a quantity UPDATE.
interface ItemQuantityRow {
    order_item_id: string;
    asset_name: string;
    quantity: number;
    original_quantity: number;
    pending_remove: boolean;
}

// One staged ADD — a brand-new asset to attach to the order. `asset_id` is the
// catalog asset id; `quantity` the positive integer to add. `asset_name` is kept
// only for display. Server availability-checks + rejects RED/maintenance assets.
interface StagedAdd {
    // Local stable key for React lists (asset_id can collide pre-dedup, and the
    // user may stage the same asset twice before we merge — server merges anyway).
    key: string;
    asset_id: string;
    asset_name: string;
    quantity: number;
}

// Build the editable item-quantity rows from the order detail payload. The
// order exposes physical items at `order.items[]`, each with a top-level line
// `id`, an `asset` (name) and an `order_item` sub-object (id + quantity). We
// only keep rows that have a resolvable `order_item.id` — that's the handle the
// edit endpoint expects.
function buildItemRows(order: any): ItemQuantityRow[] {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items
        .map((item: any): ItemQuantityRow | null => {
            const orderItemId = item?.order_item?.id;
            if (!orderItemId) return null;
            const qty = Number(item?.order_item?.quantity);
            const quantity = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
            return {
                order_item_id: orderItemId,
                asset_name: item?.asset?.name || item?.order_item?.asset_name || "Item",
                quantity,
                original_quantity: quantity,
                pending_remove: false,
            };
        })
        .filter((row: ItemQuantityRow | null): row is ItemQuantityRow => row !== null);
}

interface FormState {
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    venue_contact_name: string;
    venue_contact_email: string;
    venue_contact_phone: string;
    venue_name: string;
    venue_city_id: string;
    venue_address: string;
    venue_access_notes: string;
    venue_country: string;
    venue_city_text: string;
    special_instructions: string;
    is_permanent_placement: boolean;
    po_number: string;
    job_number: string;
    event_start_date: string;
    event_end_date: string;
    requires_permit: boolean;
    permit_owner: PermitOwner;
    requires_vehicle_docs: boolean;
    requires_staff_ids: boolean;
    permit_notes: string;
}

const NO_CITY = "__none__";

// `<Input type="date">` expects a YYYY-MM-DD value. Order event dates arrive as
// ISO strings (e.g. "2026-02-15T00:00:00.000Z"); slice the calendar-day portion.
function toDateInputValue(iso: unknown): string {
    if (typeof iso !== "string" || iso.length === 0) return "";
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) return "";
    // Use UTC parts — event dates are stored at midnight UTC, so the calendar
    // day must not drift by local timezone.
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function buildFormState(order: any): FormState {
    const loc = order?.venue_location ?? {};
    const permit = order?.permit_requirements ?? {};
    return {
        contact_name: order?.contact_name ?? "",
        contact_email: order?.contact_email ?? "",
        contact_phone: order?.contact_phone ?? "",
        venue_contact_name: order?.venue_contact_name ?? "",
        venue_contact_email: order?.venue_contact_email ?? "",
        venue_contact_phone: order?.venue_contact_phone ?? "",
        venue_name: order?.venue_name ?? "",
        venue_city_id: order?.venue_city_id ?? "",
        venue_address: loc?.address ?? "",
        venue_access_notes: loc?.access_notes ?? "",
        venue_country: loc?.country ?? "",
        venue_city_text: loc?.city ?? "",
        special_instructions: order?.special_instructions ?? "",
        is_permanent_placement: Boolean(order?.is_permanent_placement),
        po_number: order?.po_number ?? "",
        job_number: order?.job_number ?? "",
        event_start_date: toDateInputValue(order?.event_start_date),
        event_end_date: toDateInputValue(order?.event_end_date),
        requires_permit: Boolean(permit?.requires_permit),
        permit_owner: (permit?.permit_owner as PermitOwner) ?? "UNKNOWN",
        requires_vehicle_docs: Boolean(permit?.requires_vehicle_docs),
        requires_staff_ids: Boolean(permit?.requires_staff_ids),
        permit_notes: permit?.notes ?? "",
    };
}

export function EditOrderDetailsCard({ order, canEdit }: EditOrderDetailsCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(() => buildFormState(order));
    const [itemRows, setItemRows] = useState<ItemQuantityRow[]>(() => buildItemRows(order));
    const [stagedAdds, setStagedAdds] = useState<StagedAdd[]>([]);

    // Monotonic key generator for staged-add rows (stable React keys).
    const addKeySeq = useRef(0);

    const editDetails = useOrderEditDetails();
    const { data: citiesResponse } = useCities();
    const cities = Array.isArray(citiesResponse?.data) ? citiesResponse.data : [];

    // The pristine snapshot to diff against when saving.
    const original = useMemo(() => buildFormState(order), [order]);

    if (!canEdit) return null;

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleEdit = () => {
        setForm(buildFormState(order));
        setItemRows(buildItemRows(order));
        setStagedAdds([]);
        setErrorMessage(null);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setForm(buildFormState(order));
        setItemRows(buildItemRows(order));
        setStagedAdds([]);
        setErrorMessage(null);
        setIsEditing(false);
    };

    // Clamp to a positive integer (min 1). The server is authoritative on
    // availability; this just keeps the input well-formed.
    const setItemQuantity = (orderItemId: string, raw: number) => {
        const next = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
        setItemRows((prev) =>
            prev.map((row) =>
                row.order_item_id === orderItemId ? { ...row, quantity: next } : row
            )
        );
    };

    // Count of existing rows NOT pending removal. Used to keep at least one item
    // on the order (the server also blocks removing the last item — this is a
    // friendlier client-side guard). Staged adds count too: removing the last
    // existing item is fine if the admin staged a replacement add.
    const remainingItemCount =
        itemRows.filter((row) => !row.pending_remove).length + stagedAdds.length;

    const toggleItemRemove = (orderItemId: string, remove: boolean) => {
        setItemRows((prev) =>
            prev.map((row) =>
                row.order_item_id === orderItemId ? { ...row, pending_remove: remove } : row
            )
        );
    };

    const addStagedAsset = (asset: { id: string; name: string }) => {
        // If the same asset is already staged, bump its quantity instead of
        // adding a duplicate row (server would merge anyway).
        setStagedAdds((prev) => {
            const existing = prev.find((s) => s.asset_id === asset.id);
            if (existing) {
                return prev.map((s) =>
                    s.asset_id === asset.id ? { ...s, quantity: s.quantity + 1 } : s
                );
            }
            addKeySeq.current += 1;
            return [
                ...prev,
                {
                    key: `add-${addKeySeq.current}`,
                    asset_id: asset.id,
                    asset_name: asset.name,
                    quantity: 1,
                },
            ];
        });
    };

    const setStagedAddQuantity = (key: string, raw: number) => {
        const next = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
        setStagedAdds((prev) => prev.map((s) => (s.key === key ? { ...s, quantity: next } : s)));
    };

    const removeStagedAdd = (key: string) => {
        setStagedAdds((prev) => prev.filter((s) => s.key !== key));
    };

    const buildPayload = (): OrderEditDetailsPayload => {
        const payload: OrderEditDetailsPayload = {};

        // Top-level string fields — only include when changed.
        const simpleFields: Array<[keyof FormState, keyof OrderEditDetailsPayload]> = [
            ["contact_name", "contact_name"],
            ["contact_email", "contact_email"],
            ["contact_phone", "contact_phone"],
            ["venue_contact_name", "venue_contact_name"],
            ["venue_contact_email", "venue_contact_email"],
            ["venue_contact_phone", "venue_contact_phone"],
            ["venue_name", "venue_name"],
            ["special_instructions", "special_instructions"],
            ["po_number", "po_number"],
            ["job_number", "job_number"],
        ];
        for (const [formKey, payloadKey] of simpleFields) {
            if (form[formKey] !== original[formKey]) {
                (payload as Record<string, unknown>)[payloadKey] = form[formKey];
            }
        }

        if (form.venue_city_id !== original.venue_city_id) {
            payload.venue_city_id = form.venue_city_id;
        }

        if (form.is_permanent_placement !== original.is_permanent_placement) {
            payload.is_permanent_placement = form.is_permanent_placement;
        }

        // Event dates (Tier C) — send the YYYY-MM-DD string only when changed.
        // The server re-derives the booking window and may 409 on availability.
        if (form.event_start_date !== original.event_start_date) {
            payload.event_start_date = form.event_start_date;
        }
        if (form.event_end_date !== original.event_end_date) {
            payload.event_end_date = form.event_end_date;
        }

        // venue_location — send the whole object if any sub-field changed.
        if (
            form.venue_address !== original.venue_address ||
            form.venue_access_notes !== original.venue_access_notes ||
            form.venue_country !== original.venue_country ||
            form.venue_city_text !== original.venue_city_text
        ) {
            payload.venue_location = {
                country: form.venue_country,
                city: form.venue_city_text,
                address: form.venue_address,
                access_notes: form.venue_access_notes,
            };
        }

        // permit_requirements — send the whole object if any sub-field changed.
        if (
            form.requires_permit !== original.requires_permit ||
            form.permit_owner !== original.permit_owner ||
            form.requires_vehicle_docs !== original.requires_vehicle_docs ||
            form.requires_staff_ids !== original.requires_staff_ids ||
            form.permit_notes !== original.permit_notes
        ) {
            payload.permit_requirements = {
                requires_permit: form.requires_permit,
                permit_owner: form.permit_owner,
                requires_vehicle_docs: form.requires_vehicle_docs,
                requires_staff_ids: form.requires_staff_ids,
                notes: form.permit_notes,
            };
        }

        // Item ops (Tier C) — a mix of REMOVE / UPDATE / ADD. The server
        // reconciles bookings (availability-checked), cancels any bundled
        // maintenance SR on remove, and reprices BASE_OPS; any op on a QUOTED
        // order bounces it to PRICING_REVIEW. Omit `items` when there is no op.
        const itemOps: NonNullable<OrderEditDetailsPayload["items"]> = [];

        for (const row of itemRows) {
            if (row.pending_remove) {
                // REMOVE wins — never also emit a quantity UPDATE for a removed row.
                itemOps.push({ op: "REMOVE", order_item_id: row.order_item_id });
            } else if (row.quantity !== row.original_quantity) {
                itemOps.push({
                    op: "UPDATE",
                    order_item_id: row.order_item_id,
                    quantity: row.quantity,
                });
            }
        }

        for (const add of stagedAdds) {
            itemOps.push({ op: "ADD", asset_id: add.asset_id, quantity: add.quantity });
        }

        if (itemOps.length > 0) {
            payload.items = itemOps;
        }

        return payload;
    };

    const handleSave = async () => {
        setErrorMessage(null);

        // Basic client guard — end must be on/after start. The server is
        // authoritative (and additionally enforces not-in-the-past + availability),
        // so we keep this minimal and let the API 409 carry the detailed reasons.
        if (
            form.event_start_date &&
            form.event_end_date &&
            form.event_end_date < form.event_start_date
        ) {
            const message = "Event end date must be on or after the start date";
            setErrorMessage(message);
            toast.error(message);
            return;
        }

        const payload = buildPayload();

        if (Object.keys(payload).length === 0) {
            toast.info("No changes to save");
            setIsEditing(false);
            return;
        }

        try {
            await editDetails.mutateAsync({ orderId: order.id, payload });
            toast.success("Order details updated");
            setIsEditing(false);
        } catch (error: unknown) {
            // useOrderEditDetails → throwApiError rethrows a plain Error whose
            // message is already error.response.data.message (incl. the 409
            // editable-band message). Surface it inline + as a toast.
            const message =
                (error instanceof Error && error.message) || "Failed to update order details";
            setErrorMessage(message);
            toast.error(message);
        }
    };

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
                                disabled={editDetails.isPending}
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
            <CardContent className="space-y-4">
                {!isEditing ? (
                    <p className="font-mono text-xs text-muted-foreground">
                        Edit contact, venue, permit, and reference fields while the order is
                        pre-confirmation. Changes are logged in the edit history.
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
                        <div className="space-y-3">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Execution Contact
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        NAME
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.contact_name}
                                        onChange={(e) => set("contact_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        EMAIL
                                    </Label>
                                    <Input
                                        type="email"
                                        className="font-mono text-sm"
                                        value={form.contact_email}
                                        onChange={(e) => set("contact_email", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        PHONE
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.contact_phone}
                                        onChange={(e) => set("contact_phone", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Venue Contact */}
                        <div className="space-y-3">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Venue Contact
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        NAME
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.venue_contact_name}
                                        onChange={(e) => set("venue_contact_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        EMAIL
                                    </Label>
                                    <Input
                                        type="email"
                                        className="font-mono text-sm"
                                        value={form.venue_contact_email}
                                        onChange={(e) => set("venue_contact_email", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        PHONE
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.venue_contact_phone}
                                        onChange={(e) => set("venue_contact_phone", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Venue */}
                        <div className="space-y-3">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Venue
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        VENUE NAME
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.venue_name}
                                        onChange={(e) => set("venue_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        CITY (REGISTERED)
                                    </Label>
                                    <Select
                                        value={form.venue_city_id || NO_CITY}
                                        onValueChange={(value) =>
                                            set("venue_city_id", value === NO_CITY ? "" : value)
                                        }
                                    >
                                        <SelectTrigger className="font-mono text-sm">
                                            <SelectValue placeholder="Select city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_CITY}>—</SelectItem>
                                            {cities.map((city: any) => (
                                                <SelectItem key={city.id} value={city.id}>
                                                    {city.name}
                                                    {city.country?.name
                                                        ? `, ${city.country.name}`
                                                        : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        ADDRESS
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.venue_address}
                                        onChange={(e) => set("venue_address", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        COUNTRY (FREE TEXT)
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.venue_country}
                                        onChange={(e) => set("venue_country", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        CITY (FREE TEXT)
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.venue_city_text}
                                        onChange={(e) => set("venue_city_text", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="font-mono text-[10px] text-muted-foreground">
                                    ACCESS NOTES
                                </Label>
                                <Textarea
                                    className="font-mono text-sm"
                                    rows={2}
                                    value={form.venue_access_notes}
                                    onChange={(e) => set("venue_access_notes", e.target.value)}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Event dates (Tier C — re-derives the booking window) */}
                        <div className="space-y-3">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Event
                            </Label>
                            <p className="font-mono text-[10px] text-muted-foreground">
                                Changing the event dates re-derives the asset booking window. If
                                inventory isn&apos;t available for the new dates the change is
                                rejected. Editing a quoted order&apos;s dates returns it to pricing
                                review.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        EVENT START DATE
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            className="font-mono text-sm pl-10"
                                            value={form.event_start_date}
                                            onChange={(e) =>
                                                set("event_start_date", e.target.value)
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        EVENT END DATE
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            className="font-mono text-sm pl-10"
                                            min={form.event_start_date || undefined}
                                            value={form.event_end_date}
                                            onChange={(e) => set("event_end_date", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Item ops (Tier C — reconciles bookings + reprices) */}
                        <div className="space-y-3">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Items
                            </Label>
                            <p className="font-mono text-[10px] text-muted-foreground">
                                Adjust quantities, remove items, or add new assets. Changes
                                reconcile the asset bookings. If inventory isn&apos;t available for
                                the requested dates and quantities the change is rejected. Assets
                                requiring maintenance cannot be added. An order must keep at least
                                one item. Editing a quoted order&apos;s items returns it to pricing
                                review.
                            </p>
                            {itemRows.length === 0 && stagedAdds.length === 0 ? (
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    No editable items on this order.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {itemRows.map((row) => (
                                        <div
                                            key={row.order_item_id}
                                            className={`flex items-center justify-between gap-3 rounded border px-3 py-2 ${
                                                row.pending_remove
                                                    ? "border-red-500/40 bg-red-500/5"
                                                    : "border-border bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <span
                                                    className={`font-mono text-sm truncate ${
                                                        row.pending_remove
                                                            ? "line-through text-muted-foreground"
                                                            : ""
                                                    }`}
                                                >
                                                    {row.asset_name}
                                                </span>
                                                {row.pending_remove && (
                                                    <span className="font-mono text-[10px] uppercase tracking-wide text-red-600 shrink-0">
                                                        Will be removed
                                                    </span>
                                                )}
                                            </div>
                                            {row.pending_remove ? (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 font-mono text-[11px]"
                                                        onClick={() =>
                                                            toggleItemRemove(
                                                                row.order_item_id,
                                                                false
                                                            )
                                                        }
                                                    >
                                                        <RotateCcw className="h-3 w-3 mr-1" />
                                                        UNDO
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7"
                                                        disabled={row.quantity <= 1}
                                                        onClick={() =>
                                                            setItemQuantity(
                                                                row.order_item_id,
                                                                row.quantity - 1
                                                            )
                                                        }
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        step={1}
                                                        inputMode="numeric"
                                                        className="h-7 w-16 text-center font-mono text-sm"
                                                        value={row.quantity}
                                                        onChange={(e) =>
                                                            setItemQuantity(
                                                                row.order_item_id,
                                                                parseInt(e.target.value, 10)
                                                            )
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7"
                                                        onClick={() =>
                                                            setItemQuantity(
                                                                row.order_item_id,
                                                                row.quantity + 1
                                                            )
                                                        }
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                        // Block removing the only remaining item
                                                        // (server also enforces this).
                                                        disabled={remainingItemCount <= 1}
                                                        onClick={() =>
                                                            toggleItemRemove(
                                                                row.order_item_id,
                                                                true
                                                            )
                                                        }
                                                        aria-label="Remove item"
                                                        title={
                                                            remainingItemCount <= 1
                                                                ? "An order must keep at least one item"
                                                                : "Remove item"
                                                        }
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Staged ADDs — new assets not yet on the order */}
                                    {stagedAdds.map((add) => (
                                        <div
                                            key={add.key}
                                            className="flex items-center justify-between gap-3 rounded border border-emerald-500/40 bg-emerald-500/5 px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <PlusCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                                                <span className="font-mono text-sm truncate">
                                                    {add.asset_name}
                                                </span>
                                                <span className="font-mono text-[10px] uppercase tracking-wide text-emerald-700 shrink-0">
                                                    New
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-7 w-7"
                                                    disabled={add.quantity <= 1}
                                                    onClick={() =>
                                                        setStagedAddQuantity(
                                                            add.key,
                                                            add.quantity - 1
                                                        )
                                                    }
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    inputMode="numeric"
                                                    className="h-7 w-16 text-center font-mono text-sm"
                                                    value={add.quantity}
                                                    onChange={(e) =>
                                                        setStagedAddQuantity(
                                                            add.key,
                                                            parseInt(e.target.value, 10)
                                                        )
                                                    }
                                                />
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-7 w-7"
                                                    onClick={() =>
                                                        setStagedAddQuantity(
                                                            add.key,
                                                            add.quantity + 1
                                                        )
                                                    }
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                    onClick={() => removeStagedAdd(add.key)}
                                                    aria-label="Discard staged item"
                                                    title="Discard staged item"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add-item picker — searches assets scoped to the order's company */}
                            <AddItemPicker
                                companyId={order?.company?.id}
                                stagedAssetIds={stagedAdds.map((s) => s.asset_id)}
                                onAdd={addStagedAsset}
                            />
                        </div>

                        <Separator />

                        {/* Special instructions */}
                        <div className="space-y-1">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Special Instructions
                            </Label>
                            <Textarea
                                className="font-mono text-sm"
                                rows={3}
                                value={form.special_instructions}
                                onChange={(e) => set("special_instructions", e.target.value)}
                            />
                        </div>

                        <Separator />

                        {/* Reference numbers + permanent placement */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="font-mono text-[10px] text-muted-foreground">
                                    CLIENT PO NUMBER
                                </Label>
                                <Input
                                    className="font-mono text-sm"
                                    value={form.po_number}
                                    onChange={(e) => set("po_number", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-mono text-[10px] text-muted-foreground">
                                    PLATFORM JOB NUMBER
                                </Label>
                                <Input
                                    className="font-mono text-sm"
                                    value={form.job_number}
                                    onChange={(e) => set("job_number", e.target.value)}
                                />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                                checked={form.is_permanent_placement}
                                onCheckedChange={(checked) =>
                                    set("is_permanent_placement", checked === true)
                                }
                            />
                            <span className="font-mono text-xs">Permanent placement</span>
                        </label>

                        <Separator />

                        {/* Permit requirements */}
                        <div className="space-y-3">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Permit / Access
                            </Label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={form.requires_permit}
                                    onCheckedChange={(checked) =>
                                        set("requires_permit", checked === true)
                                    }
                                />
                                <span className="font-mono text-xs">Requires permit</span>
                            </label>

                            {form.requires_permit && (
                                <div className="space-y-3 border-l-2 border-border pl-4">
                                    <div className="space-y-1">
                                        <Label className="font-mono text-[10px] text-muted-foreground">
                                            PERMIT OWNER
                                        </Label>
                                        <Select
                                            value={form.permit_owner}
                                            onValueChange={(value) =>
                                                set("permit_owner", value as PermitOwner)
                                            }
                                        >
                                            <SelectTrigger className="font-mono text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CLIENT">
                                                    Client will arrange permits
                                                </SelectItem>
                                                <SelectItem value="PLATFORM">
                                                    Ops will arrange permits
                                                </SelectItem>
                                                <SelectItem value="UNKNOWN">
                                                    Not specified
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={form.requires_vehicle_docs}
                                            onCheckedChange={(checked) =>
                                                set("requires_vehicle_docs", checked === true)
                                            }
                                        />
                                        <span className="font-mono text-xs">
                                            Requires vehicle docs
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={form.requires_staff_ids}
                                            onCheckedChange={(checked) =>
                                                set("requires_staff_ids", checked === true)
                                            }
                                        />
                                        <span className="font-mono text-xs">
                                            Requires staff IDs
                                        </span>
                                    </label>
                                    <div className="space-y-1">
                                        <Label className="font-mono text-[10px] text-muted-foreground">
                                            PERMIT NOTES
                                        </Label>
                                        <Textarea
                                            className="font-mono text-sm"
                                            rows={2}
                                            value={form.permit_notes}
                                            onChange={(e) => set("permit_notes", e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// Asset add affordance for the Items section. Reuses the app's `useSearchAssets`
// hook (server-side debounced search, gated to >=2 chars + a company id, the
// same hook the inbound-request editor uses) and renders the Popover + Command
// combobox shape from AssetSearchSelect. Scoped to the order's company so the
// admin only sees the tenant's catalog. Selecting an asset stages an ADD op in
// the parent; the server is authoritative on availability + rejects
// maintenance-requiring (RED) assets, so no maintenance UI lives here.
interface AddItemPickerProps {
    companyId?: string;
    stagedAssetIds: string[];
    onAdd: (asset: { id: string; name: string }) => void;
}

function AddItemPicker({ companyId, stagedAssetIds, onAdd }: AddItemPickerProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onSearchChange = (value: string) => {
        setSearchTerm(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedTerm(value), 300);
    };

    // useSearchAssets only fires for term length >= 2 AND a company id.
    const { data: searchResponse, isLoading } = useSearchAssets(debouncedTerm, companyId);
    const assets: any[] = Array.isArray(searchResponse?.data) ? searchResponse.data : [];

    if (!companyId) {
        return (
            <p className="font-mono text-[11px] text-muted-foreground">
                Cannot add items — order has no associated company.
            </p>
        );
    }

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setSearchTerm("");
                    setDebouncedTerm("");
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between gap-2 font-mono text-xs"
                >
                    <span className="flex items-center gap-2">
                        <PlusCircle className="h-3.5 w-3.5" />
                        ADD ITEM
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search assets..."
                        value={searchTerm}
                        onValueChange={onSearchChange}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {searchTerm.trim().length < 2
                                ? "Type at least 2 characters to search."
                                : isLoading
                                  ? "Searching…"
                                  : "No matching assets."}
                        </CommandEmpty>
                        {assets.length > 0 && (
                            <CommandGroup>
                                {assets.map((asset) => {
                                    const alreadyStaged = stagedAssetIds.includes(asset.id);
                                    return (
                                        <CommandItem
                                            key={asset.id}
                                            value={asset.id}
                                            onSelect={() => {
                                                onAdd({ id: asset.id, name: asset.name });
                                                setOpen(false);
                                                setSearchTerm("");
                                                setDebouncedTerm("");
                                            }}
                                            className="items-center gap-2"
                                        >
                                            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-mono text-sm">
                                                    {asset.name}
                                                </span>
                                                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                                                    {asset.qr_code || "—"} ·{" "}
                                                    {asset.category || "Uncategorized"}
                                                    {alreadyStaged ? " · already staged" : ""}
                                                </span>
                                            </span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
