"use client";

/**
 * Descriptive-fields editor (admin order-edit, per-section twin of the client's
 * DescriptiveFieldsEditor). Venue name / city / address / country, special
 * instructions, reference numbers (PO + admin-only job number), permanent
 * placement, and the permit block.
 *
 * The permit controls are NOT hand-rolled here — they are the shared
 * <PermitSection> (1:1 twin of the client's, same control types / options /
 * labels / copy), which also owns the in-block venue access notes. The parent
 * maps PermitSection's emitted patch (permit_decision / requires_permit /
 * permit_owner / docs / permit_notes / venue_access_notes) back onto the draft.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PermitSection, type PermitSectionValue } from "@/components/permits/PermitSection";

const NO_CITY = "__none__";

export interface DescriptiveDraft {
    venue_name: string;
    venue_city_id: string;
    venue_address: string;
    venue_country: string;
    venue_city_text: string;
    special_instructions: string;
    is_permanent_placement: boolean;
    po_number: string;
    job_number: string;
    permit: PermitSectionValue;
}

interface CityOption {
    id: string;
    name: string;
    country?: { name?: string } | null;
}

export function DescriptiveFieldsEditor({
    value,
    onChange,
    disabled,
    cities,
    companyName,
    canEditJobNumber = true,
}: {
    value: DescriptiveDraft;
    onChange: (patch: Partial<DescriptiveDraft>) => void;
    disabled?: boolean;
    cities: CityOption[];
    companyName?: string | null;
    canEditJobNumber?: boolean;
}) {
    const updatePermit = (patch: Partial<PermitSectionValue>) =>
        onChange({ permit: { ...value.permit, ...patch } });

    return (
        <div className="space-y-5">
            {/* Venue */}
            <div className="space-y-3">
                <Label className="font-mono text-xs font-bold uppercase tracking-wide">Venue</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="font-mono text-[10px] text-muted-foreground">
                            VENUE NAME
                        </Label>
                        <Input
                            className="font-mono text-sm"
                            value={value.venue_name}
                            disabled={disabled}
                            onChange={(e) => onChange({ venue_name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-mono text-[10px] text-muted-foreground">
                            CITY (REGISTERED)
                        </Label>
                        <Select
                            value={value.venue_city_id || NO_CITY}
                            disabled={disabled}
                            onValueChange={(v) =>
                                onChange({ venue_city_id: v === NO_CITY ? "" : v })
                            }
                        >
                            <SelectTrigger className="font-mono text-sm">
                                <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_CITY}>—</SelectItem>
                                {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                        {city.name}
                                        {city.country?.name ? `, ${city.country.name}` : ""}
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
                            value={value.venue_address}
                            disabled={disabled}
                            onChange={(e) => onChange({ venue_address: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-mono text-[10px] text-muted-foreground">
                            COUNTRY (FREE TEXT)
                        </Label>
                        <Input
                            className="font-mono text-sm"
                            value={value.venue_country}
                            disabled={disabled}
                            onChange={(e) => onChange({ venue_country: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-mono text-[10px] text-muted-foreground">
                            CITY (FREE TEXT)
                        </Label>
                        <Input
                            className="font-mono text-sm"
                            value={value.venue_city_text}
                            disabled={disabled}
                            onChange={(e) => onChange({ venue_city_text: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Special instructions */}
            <div className="space-y-1">
                <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                    Special Instructions
                </Label>
                <Textarea
                    className="font-mono text-sm"
                    rows={3}
                    value={value.special_instructions}
                    disabled={disabled}
                    onChange={(e) => onChange({ special_instructions: e.target.value })}
                />
            </div>

            {/* Reference numbers + permanent placement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="font-mono text-[10px] text-muted-foreground">
                        CLIENT PO NUMBER
                    </Label>
                    <Input
                        className="font-mono text-sm"
                        value={value.po_number}
                        disabled={disabled}
                        onChange={(e) => onChange({ po_number: e.target.value })}
                    />
                </div>
                {canEditJobNumber && (
                    <div className="space-y-1">
                        <Label className="font-mono text-[10px] text-muted-foreground">
                            PLATFORM JOB NUMBER
                        </Label>
                        <Input
                            className="font-mono text-sm"
                            value={value.job_number}
                            disabled={disabled}
                            onChange={(e) => onChange({ job_number: e.target.value })}
                        />
                    </div>
                )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                    checked={value.is_permanent_placement}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                        onChange({ is_permanent_placement: checked === true })
                    }
                />
                <span className="font-mono text-xs">Permanent placement</span>
            </label>

            {/* Permit / Access — the shared PermitSection (1:1 twin of the client). */}
            <div className="space-y-2">
                <Label className="font-mono text-xs font-bold uppercase tracking-wide">
                    Permit / Access
                </Label>
                <PermitSection
                    value={value.permit}
                    onChange={updatePermit}
                    companyName={companyName}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}
