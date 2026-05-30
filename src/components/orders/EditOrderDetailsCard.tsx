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

import { useMemo, useState } from "react";
import { useOrderEditDetails, type OrderEditDetailsPayload } from "@/hooks/use-orders";
import { useCities } from "@/hooks/use-cities";
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
import { Pencil, Save, X, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditOrderDetailsCardProps {
    order: any;
    canEdit: boolean;
}

type PermitOwner = "CLIENT" | "PLATFORM" | "UNKNOWN";

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
    requires_permit: boolean;
    permit_owner: PermitOwner;
    requires_vehicle_docs: boolean;
    requires_staff_ids: boolean;
    permit_notes: string;
}

const NO_CITY = "__none__";

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
        setErrorMessage(null);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setForm(buildFormState(order));
        setErrorMessage(null);
        setIsEditing(false);
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

        return payload;
    };

    const handleSave = async () => {
        setErrorMessage(null);
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
