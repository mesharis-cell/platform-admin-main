"use client";

/**
 * Admin self-pickup editor (Order Editing — Phase 4 retrofit).
 *
 * The admin analogue of EditOrderDetailsCard, scoped to the self-pickup field
 * set: collector contact, descriptive fields (notes / special instructions /
 * PO / permanent-placement), the admin-only platform job number, the pickup
 * window + expected return (Tier C — drives the booking window), and item ops
 * (qty / add / remove). Self-pickups have NO permit and NO venue, so those
 * blocks are absent.
 *
 * View mode renders an "EDIT" affordance only — the surrounding detail page
 * already shows collector / items cards. Edit mode opens a form; on save we diff
 * against the original snapshot and send ONLY the changed keys to
 * PATCH /operations/v1/self-pickup/:id (via useEditSelfPickupDetails). The API
 * re-checks the editable band + scope and returns 409/400 if the pickup has moved
 * on; we surface that message inline + as a toast.
 *
 * The card is only rendered when `canEdit` is true (pre-confirmation band +
 * self_pickups:edit_details permission), computed by the parent page.
 */

import { useMemo, useRef, useState } from "react";
import {
    useEditSelfPickupDetails,
    type SelfPickupEditDetailsPayload,
} from "@/hooks/use-self-pickups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    OpsAssetPicker,
    type NamedAssetSelection,
} from "@/components/assets/asset-picker/OpsAssetPicker";
import {
    Pencil,
    Save,
    X,
    AlertCircle,
    Loader2,
    Clock,
    Minus,
    Plus,
    Package,
    Trash2,
    RotateCcw,
    PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

interface EditSelfPickupDetailsCardProps {
    pickup: any;
    canEdit: boolean;
}

// One editable row per existing self-pickup item. SP items are FLAT (no nested
// `order_item` like orders): `self_pickup_item_id` is the self_pickup_items PK the
// server reconciles bookings against, sent on the wire as `order_item_id`.
interface ItemQuantityRow {
    self_pickup_item_id: string;
    asset_name: string;
    quantity: number;
    original_quantity: number;
    pending_remove: boolean;
}

// One staged ADD — a brand-new asset to attach. `asset_id` is the catalog asset
// id; server availability-checks + rejects unavailable assets.
interface StagedAdd {
    // Local stable key for React lists (server merges duplicate ADDs anyway).
    key: string;
    asset_id: string;
    asset_name: string;
    quantity: number;
}

// Build editable item-quantity rows from the SP detail payload. SP exposes items
// at `pickup.items[]`, each a flat row with `id`, `asset_name`, `quantity`. We
// only keep rows with a resolvable `id` — the handle the edit endpoint expects.
function buildItemRows(pickup: any): ItemQuantityRow[] {
    const items = Array.isArray(pickup?.items) ? pickup.items : [];
    return items
        .map((item: any): ItemQuantityRow | null => {
            const itemId = item?.id;
            if (!itemId) return null;
            const qty = Number(item?.quantity);
            const quantity = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
            return {
                self_pickup_item_id: itemId,
                asset_name: item?.asset_name || "Item",
                quantity,
                original_quantity: quantity,
                pending_remove: false,
            };
        })
        .filter((row: ItemQuantityRow | null): row is ItemQuantityRow => row !== null);
}

interface FormState {
    collector_name: string;
    collector_phone: string;
    collector_email: string;
    notes: string;
    special_instructions: string;
    is_permanent_placement: boolean;
    po_number: string;
    // Admin-only platform reference.
    job_number: string;
    // Native datetime-local values ("YYYY-MM-DDTHH:mm", local time).
    pickup_start: string;
    pickup_end: string;
    expected_return_at: string;
}

// Normalise an ISO datetime string to "YYYY-MM-DDTHH:mm" for the native
// datetime-local input (local time). Returns "" when absent/unparseable.
function toDateTimeLocal(iso: unknown): string {
    if (typeof iso !== "string" || iso.length === 0) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

// Convert a "YYYY-MM-DDTHH:mm" local-input value to a full ISO string. Returns
// "" when empty/unparseable so the caller can decide how to treat it.
function fromDateTimeLocal(v: string): string {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
}

function buildFormState(pickup: any): FormState {
    const win = pickup?.pickup_window ?? {};
    return {
        collector_name: pickup?.collector_name ?? "",
        collector_phone: pickup?.collector_phone ?? "",
        collector_email: pickup?.collector_email ?? "",
        notes: pickup?.notes ?? "",
        special_instructions: pickup?.special_instructions ?? "",
        is_permanent_placement: Boolean(pickup?.is_permanent_placement),
        po_number: pickup?.po_number ?? "",
        job_number: pickup?.job_number ?? "",
        pickup_start: toDateTimeLocal(win?.start),
        pickup_end: toDateTimeLocal(win?.end),
        expected_return_at: toDateTimeLocal(pickup?.expected_return_at),
    };
}

// Empty string → null for nullable fields so a cleared field is actually cleared
// server-side; non-empty → trimmed value.
const nullable = (v: string): string | null => (v.trim() === "" ? null : v.trim());

export function EditSelfPickupDetailsCard({ pickup, canEdit }: EditSelfPickupDetailsCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(() => buildFormState(pickup));
    const [itemRows, setItemRows] = useState<ItemQuantityRow[]>(() => buildItemRows(pickup));
    const [stagedAdds, setStagedAdds] = useState<StagedAdd[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Monotonic key generator for staged-add rows (stable React keys).
    const addKeySeq = useRef(0);

    const editDetails = useEditSelfPickupDetails();

    // The pristine snapshot to diff against when saving.
    const original = useMemo(() => buildFormState(pickup), [pickup]);

    // Asset ids the picker should mark "already added" (not selectable): assets
    // currently on the pickup (excluding rows pending removal) + already-staged adds.
    const alreadyOnEntityAssetIds = useMemo(() => {
        const ids = new Set<string>();
        const items = Array.isArray(pickup?.items) ? pickup.items : [];
        const pendingRemovedItemIds = new Set(
            itemRows.filter((r) => r.pending_remove).map((r) => r.self_pickup_item_id)
        );
        for (const item of items) {
            if (item?.id && pendingRemovedItemIds.has(item.id)) continue;
            const assetId = item?.asset_id;
            if (assetId) ids.add(assetId);
        }
        for (const add of stagedAdds) ids.add(add.asset_id);
        return Array.from(ids);
    }, [pickup, itemRows, stagedAdds]);

    if (!canEdit) return null;

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleEdit = () => {
        setForm(buildFormState(pickup));
        setItemRows(buildItemRows(pickup));
        setStagedAdds([]);
        setErrorMessage(null);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setForm(buildFormState(pickup));
        setItemRows(buildItemRows(pickup));
        setStagedAdds([]);
        setErrorMessage(null);
        setIsEditing(false);
    };

    // Clamp to a positive integer (min 1). The server is authoritative on
    // availability; this just keeps the input well-formed.
    const setItemQuantity = (itemId: string, raw: number) => {
        const next = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
        setItemRows((prev) =>
            prev.map((row) =>
                row.self_pickup_item_id === itemId ? { ...row, quantity: next } : row
            )
        );
    };

    // Count of existing rows NOT pending removal + staged adds. Used to keep at
    // least one item on the pickup (the server also blocks removing the last item).
    const remainingItemCount =
        itemRows.filter((row) => !row.pending_remove).length + stagedAdds.length;

    const toggleItemRemove = (itemId: string, remove: boolean) => {
        setItemRows((prev) =>
            prev.map((row) =>
                row.self_pickup_item_id === itemId ? { ...row, pending_remove: remove } : row
            )
        );
    };

    // Stage a batch of picker selections (multi-select + per-item qty). If an
    // asset is already staged we bump its quantity (server merges anyway).
    const addStagedAssets = (selections: NamedAssetSelection[]) => {
        if (selections.length === 0) return;
        setStagedAdds((prev) => {
            const next = [...prev];
            for (const sel of selections) {
                const qty = Number.isFinite(sel.quantity)
                    ? Math.max(1, Math.floor(sel.quantity))
                    : 1;
                const idx = next.findIndex((s) => s.asset_id === sel.assetId);
                if (idx >= 0) {
                    next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
                } else {
                    addKeySeq.current += 1;
                    next.push({
                        key: `add-${addKeySeq.current}`,
                        asset_id: sel.assetId,
                        asset_name: sel.name,
                        quantity: qty,
                    });
                }
            }
            return next;
        });
    };

    const setStagedAddQuantity = (key: string, raw: number) => {
        const next = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
        setStagedAdds((prev) => prev.map((s) => (s.key === key ? { ...s, quantity: next } : s)));
    };

    const removeStagedAdd = (key: string) => {
        setStagedAdds((prev) => prev.filter((s) => s.key !== key));
    };

    const buildPayload = (): SelfPickupEditDetailsPayload => {
        const payload: SelfPickupEditDetailsPayload = {};

        // Collector — name + phone are required server-side (send trimmed value);
        // email is nullable (empty → null clears it).
        if (form.collector_name.trim() !== original.collector_name.trim()) {
            payload.collector_name = form.collector_name.trim();
        }
        if (form.collector_phone.trim() !== original.collector_phone.trim()) {
            payload.collector_phone = form.collector_phone.trim();
        }
        if (form.collector_email.trim() !== original.collector_email.trim()) {
            payload.collector_email = nullable(form.collector_email);
        }

        // Descriptive — nullable text fields.
        if (form.notes.trim() !== original.notes.trim()) {
            payload.notes = nullable(form.notes);
        }
        if (form.special_instructions.trim() !== original.special_instructions.trim()) {
            payload.special_instructions = nullable(form.special_instructions);
        }
        if (form.is_permanent_placement !== original.is_permanent_placement) {
            payload.is_permanent_placement = form.is_permanent_placement;
        }
        if (form.po_number.trim() !== original.po_number.trim()) {
            payload.po_number = nullable(form.po_number);
        }
        // Admin-only platform job number.
        if (form.job_number.trim() !== original.job_number.trim()) {
            payload.job_number = nullable(form.job_number);
        }

        // Pickup window (Tier C) — send the whole object if either bound changed,
        // but only when BOTH bounds are present (the server requires start + end).
        const windowChanged =
            form.pickup_start !== original.pickup_start || form.pickup_end !== original.pickup_end;
        if (windowChanged && form.pickup_start && form.pickup_end) {
            payload.pickup_window = {
                start: fromDateTimeLocal(form.pickup_start),
                end: fromDateTimeLocal(form.pickup_end),
            };
        }

        // Expected return — clearable. Empty draft → null (clear it server-side).
        if (form.expected_return_at !== original.expected_return_at) {
            payload.expected_return_at = form.expected_return_at
                ? fromDateTimeLocal(form.expected_return_at)
                : null;
        }

        // Item ops (Tier C) — a mix of REMOVE / UPDATE / ADD. The server reconciles
        // bookings (availability-checked) and reprices; any op on a QUOTED pickup
        // bounces it to PRICING_REVIEW. Omit `items` when there is no op.
        const itemOps: NonNullable<SelfPickupEditDetailsPayload["items"]> = [];

        for (const row of itemRows) {
            if (row.pending_remove) {
                // REMOVE wins — never also emit a quantity UPDATE for a removed row.
                itemOps.push({ op: "REMOVE", order_item_id: row.self_pickup_item_id });
            } else if (row.quantity !== row.original_quantity) {
                itemOps.push({
                    op: "UPDATE",
                    order_item_id: row.self_pickup_item_id,
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

        // Basic client guard — pickup end must be on/after start. The server is
        // authoritative (and additionally enforces availability), so we keep this
        // minimal and let the API carry the detailed reasons.
        if (form.pickup_start && form.pickup_end && form.pickup_end < form.pickup_start) {
            const message = "Pickup window end must be on or after the start";
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
            await editDetails.mutateAsync({ selfPickupId: pickup.id, payload });
            toast.success("Self-pickup details updated");
            setIsEditing(false);
        } catch (error: unknown) {
            // useEditSelfPickupDetails → throwApiError rethrows a plain Error whose
            // message is already error.response.data.message (incl. the editable-band
            // / availability message). Surface it inline + as a toast.
            const message =
                (error instanceof Error && error.message) || "Failed to update self-pickup details";
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
                        EDIT PICKUP DETAILS
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
                        Edit collector, pickup window, items, and reference fields while the pickup
                        is pre-confirmation. Changes are logged in the edit history.
                    </p>
                ) : (
                    <>
                        {errorMessage && (
                            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-700 font-mono">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Collector */}
                        <div className="space-y-3">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Collector
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        NAME
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.collector_name}
                                        onChange={(e) => set("collector_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        PHONE
                                    </Label>
                                    <Input
                                        className="font-mono text-sm"
                                        value={form.collector_phone}
                                        onChange={(e) => set("collector_phone", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        EMAIL
                                    </Label>
                                    <Input
                                        type="email"
                                        className="font-mono text-sm"
                                        value={form.collector_email}
                                        onChange={(e) => set("collector_email", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Pickup window (Tier C — re-derives the booking window) */}
                        <div className="space-y-3">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Pickup Window
                            </Label>
                            <p className="font-mono text-[10px] text-muted-foreground">
                                Changing the pickup window re-derives the asset booking window. If
                                inventory isn&apos;t available for the new window the change is
                                rejected. Editing a quoted pickup&apos;s window returns it to
                                pricing review.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        PICKUP START
                                    </Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="datetime-local"
                                            className="font-mono text-sm pl-10"
                                            value={form.pickup_start}
                                            onChange={(e) => set("pickup_start", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-mono text-[10px] text-muted-foreground">
                                        PICKUP END
                                    </Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="datetime-local"
                                            className="font-mono text-sm pl-10"
                                            min={form.pickup_start || undefined}
                                            value={form.pickup_end}
                                            onChange={(e) => set("pickup_end", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="font-mono text-[10px] text-muted-foreground">
                                    EXPECTED RETURN (OPTIONAL)
                                </Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="datetime-local"
                                        className="font-mono text-sm pl-10"
                                        value={form.expected_return_at}
                                        onChange={(e) => set("expected_return_at", e.target.value)}
                                    />
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
                                the requested window and quantities the change is rejected. A pickup
                                must keep at least one item. Editing a quoted pickup&apos;s items
                                returns it to pricing review.
                            </p>
                            {itemRows.length === 0 && stagedAdds.length === 0 ? (
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    No editable items on this pickup.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {itemRows.map((row) => (
                                        <div
                                            key={row.self_pickup_item_id}
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
                                                                row.self_pickup_item_id,
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
                                                                row.self_pickup_item_id,
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
                                                                row.self_pickup_item_id,
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
                                                                row.self_pickup_item_id,
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
                                                                row.self_pickup_item_id,
                                                                true
                                                            )
                                                        }
                                                        aria-label="Remove item"
                                                        title={
                                                            remainingItemCount <= 1
                                                                ? "A pickup must keep at least one item"
                                                                : "Remove item"
                                                        }
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Staged ADDs — new assets not yet on the pickup */}
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

                            {/* Add-item picker — the canonical AssetPicker (ops adapter)
                                in a dialog, scoped to the pickup's company. Selecting
                                assets stages ADD ops. */}
                            {pickup?.company?.id ? (
                                <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full justify-center gap-2 font-mono text-xs"
                                        >
                                            <PlusCircle className="h-3.5 w-3.5" />
                                            ADD ITEMS
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
                                        <DialogHeader className="border-b border-border px-6 py-4">
                                            <DialogTitle className="font-mono text-sm font-bold uppercase tracking-wide">
                                                Add Items
                                            </DialogTitle>
                                            <DialogDescription className="font-mono text-xs">
                                                Search the tenant catalog and select assets to add
                                                to this pickup.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <OpsAssetPicker
                                            companyId={pickup.company.id}
                                            alreadyOnEntity={alreadyOnEntityAssetIds}
                                            entityNoun="pickup"
                                            onConfirm={(selections) => {
                                                addStagedAssets(selections);
                                                setPickerOpen(false);
                                            }}
                                        />
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    Cannot add items — pickup has no associated company.
                                </p>
                            )}
                        </div>

                        <Separator />

                        {/* Special instructions + notes */}
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
                        <div className="space-y-1">
                            <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                                Notes
                            </Label>
                            <Textarea
                                className="font-mono text-sm"
                                rows={2}
                                value={form.notes}
                                onChange={(e) => set("notes", e.target.value)}
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
                    </>
                )}
            </CardContent>
        </Card>
    );
}
