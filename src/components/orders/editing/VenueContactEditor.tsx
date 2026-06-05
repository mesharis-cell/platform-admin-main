"use client";

/**
 * Venue (on-site) contact editor (admin order-edit, per-section twin of the
 * client's VenueContactEditor). These three fields are TOP-LEVEL order columns
 * (venue_contact_name/email/phone) — NOT nested inside permit_requirements.
 * Controlled by the parent EditOrderDetailsCard.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface VenueContactDraft {
    venue_contact_name: string;
    venue_contact_email: string;
    venue_contact_phone: string;
}

export function VenueContactEditor({
    value,
    onChange,
    disabled,
}: {
    value: VenueContactDraft;
    onChange: (patch: Partial<VenueContactDraft>) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-3">
            <p className="font-mono text-[11px] text-muted-foreground">
                The person at the venue who can coordinate arrival, access, unloading, or handover.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                    <Label className="font-mono text-[10px] text-muted-foreground">NAME</Label>
                    <Input
                        className="font-mono text-sm"
                        value={value.venue_contact_name}
                        disabled={disabled}
                        onChange={(e) => onChange({ venue_contact_name: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="font-mono text-[10px] text-muted-foreground">EMAIL</Label>
                    <Input
                        type="email"
                        className="font-mono text-sm"
                        value={value.venue_contact_email}
                        disabled={disabled}
                        onChange={(e) => onChange({ venue_contact_email: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="font-mono text-[10px] text-muted-foreground">PHONE</Label>
                    <Input
                        className="font-mono text-sm"
                        value={value.venue_contact_phone}
                        disabled={disabled}
                        onChange={(e) => onChange({ venue_contact_phone: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
