"use client";

/**
 * Execution-contact editor (admin order-edit, per-section twin of the client's
 * ContactEditor). Controlled inputs — the parent EditOrderDetailsCard owns the
 * draft state and diffing. Admin visual language (font-mono labels).
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ContactDraft {
    contact_name: string;
    contact_email: string;
    contact_phone: string;
}

export function ContactEditor({
    value,
    onChange,
    disabled,
}: {
    value: ContactDraft;
    onChange: (patch: Partial<ContactDraft>) => void;
    disabled?: boolean;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
                <Label className="font-mono text-[10px] text-muted-foreground">NAME</Label>
                <Input
                    className="font-mono text-sm"
                    value={value.contact_name}
                    disabled={disabled}
                    onChange={(e) => onChange({ contact_name: e.target.value })}
                />
            </div>
            <div className="space-y-1">
                <Label className="font-mono text-[10px] text-muted-foreground">EMAIL</Label>
                <Input
                    type="email"
                    className="font-mono text-sm"
                    value={value.contact_email}
                    disabled={disabled}
                    onChange={(e) => onChange({ contact_email: e.target.value })}
                />
            </div>
            <div className="space-y-1">
                <Label className="font-mono text-[10px] text-muted-foreground">PHONE</Label>
                <Input
                    className="font-mono text-sm"
                    value={value.contact_phone}
                    disabled={disabled}
                    onChange={(e) => onChange({ contact_phone: e.target.value })}
                />
            </div>
        </div>
    );
}
