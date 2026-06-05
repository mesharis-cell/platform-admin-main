"use client";

/**
 * PermitSection — the shared, controlled permit-requirements block.
 *
 * Extracted VERBATIM from checkout's venue step so that the order-edit flow can
 * reuse the EXACT same inputs (control types, options, labels, copy, helper text,
 * bordered cards, the PermitWarningAlert). DO NOT diverge this from checkout — a
 * prior hand-rewrite caused the two to drift. Checkout renders this component in
 * place of its old inline JSX, so this file is now the single source of truth for
 * the permit inputs across both surfaces.
 *
 * Fully controlled: the parent owns the values and applies the emitted patches.
 * The component renders no venue-contact fields (those are first-class and stay
 * outside the permit block) — only the permit decision, owner, doc toggles,
 * permit notes, and the in-block access notes.
 */

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PermitWarningAlert, derivePermitChoice } from "@/components/permits/permit-warning-alert";

export interface PermitSectionValue {
    /** Explicit Yes/No answer; null = unanswered (required). */
    permit_decision: "yes" | "no" | null;
    requires_permit: boolean;
    permit_owner: "CLIENT" | "PLATFORM" | "UNKNOWN";
    requires_vehicle_docs: boolean;
    requires_staff_ids: boolean;
    permit_notes: string;
    venue_access_notes: string;
}

export interface PermitSectionProps {
    value: PermitSectionValue;
    /** Emits a partial patch of the value; the parent merges it into its state. */
    onChange: (patch: Partial<PermitSectionValue>) => void;
    /** Name shown in the "who handles the permit?" CLIENT option + warning copy. */
    companyName?: string | null;
    disabled?: boolean;
}

export function PermitSection({ value, onChange, companyName, disabled }: PermitSectionProps) {
    return (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
            {/* Required: explicit Yes/No to permit requirement.
                No default state — client must answer. */}
            <div className="space-y-2">
                <Label className="font-mono uppercase text-xs tracking-wide">
                    Is a permit required for this delivery? *
                </Label>
                <RadioGroup
                    value={value.permit_decision ?? ""}
                    onValueChange={(v) => {
                        const decision = v as "yes" | "no";
                        onChange({
                            permit_decision: decision,
                            requires_permit: decision === "yes",
                            // Reset owner when toggling to "no".
                            permit_owner: decision === "no" ? "UNKNOWN" : value.permit_owner,
                        });
                    }}
                    disabled={disabled}
                    className="flex gap-3"
                >
                    <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2 cursor-pointer flex-1">
                        <RadioGroupItem value="yes" id="permitYes" />
                        <span className="text-sm font-medium">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2 cursor-pointer flex-1">
                        <RadioGroupItem value="no" id="permitNo" />
                        <span className="text-sm font-medium">No</span>
                    </label>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                    Confirm with the venue if you're unsure — this decision is binding.
                </p>
            </div>

            {/* Contextual warning — three variants per the
                locked spec. Re-shown on quote approval too. */}
            <PermitWarningAlert
                choice={derivePermitChoice(
                    value.requires_permit,
                    value.permit_decision === null ? null : value.permit_owner
                )}
                companyName={companyName ?? null}
            />

            {value.requires_permit && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="font-mono uppercase text-xs tracking-wide">
                            Who will handle the permit? *
                        </Label>
                        <RadioGroup
                            value={value.permit_owner === "UNKNOWN" ? "" : value.permit_owner}
                            onValueChange={(v) =>
                                onChange({
                                    permit_owner: v as "CLIENT" | "PLATFORM",
                                })
                            }
                            disabled={disabled}
                            className="flex gap-3"
                        >
                            <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2 cursor-pointer flex-1">
                                <RadioGroupItem value="CLIENT" id="permitOwnerClient" />
                                <span className="text-sm font-medium">
                                    {companyName || "We"} will arrange it
                                </span>
                            </label>
                            <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2 cursor-pointer flex-1">
                                <RadioGroupItem value="PLATFORM" id="permitOwnerPlatform" />
                                <span className="text-sm font-medium">Ops should arrange it</span>
                            </label>
                        </RadioGroup>
                    </div>

                    {/* Visual separator + section label —
                        the docs-required toggles are an
                        independent concern from "who handles
                        the permit", but they live in the same
                        permit-required branch. */}
                    <Separator className="my-2" />
                    <div className="space-y-1">
                        <Label className="font-mono uppercase text-xs tracking-wide">
                            Additional documentation requirements
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Tick anything the venue asks for ahead of access.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-start gap-3 rounded-md border border-border/60 bg-background/70 p-3">
                            <Checkbox
                                checked={value.requires_vehicle_docs}
                                disabled={disabled}
                                onCheckedChange={(checked) =>
                                    onChange({
                                        requires_vehicle_docs: checked === true,
                                    })
                                }
                            />
                            <div>
                                <p className="text-sm font-medium">Vehicle documents required</p>
                                <p className="text-xs text-muted-foreground">
                                    Use this if venue access needs truck registration or driver
                                    docs.
                                </p>
                            </div>
                        </label>
                        <label className="flex items-start gap-3 rounded-md border border-border/60 bg-background/70 p-3">
                            <Checkbox
                                checked={value.requires_staff_ids}
                                disabled={disabled}
                                onCheckedChange={(checked) =>
                                    onChange({
                                        requires_staff_ids: checked === true,
                                    })
                                }
                            />
                            <div>
                                <p className="text-sm font-medium">Staff IDs required</p>
                                <p className="text-xs text-muted-foreground">
                                    Use this if crew names, IDs, or passes are needed before entry.
                                </p>
                            </div>
                        </label>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-mono uppercase text-xs tracking-wide">
                            Permit Notes
                        </Label>
                        <Textarea
                            value={value.permit_notes}
                            disabled={disabled}
                            onChange={(e) =>
                                onChange({
                                    permit_notes: e.target.value,
                                })
                            }
                            placeholder="Permit timing, loading bay rules, access windows, or anything the team should know."
                            rows={3}
                            className="font-mono text-sm"
                        />
                    </div>
                </div>
            )}

            {/* Access notes — always visible in permit section */}
            <div className="space-y-2">
                <Label
                    htmlFor="venueAccessNotes"
                    className="font-mono uppercase text-xs tracking-wide"
                >
                    Access Notes (Optional)
                </Label>
                <Textarea
                    id="venueAccessNotes"
                    value={value.venue_access_notes}
                    disabled={disabled}
                    onChange={(e) =>
                        onChange({
                            venue_access_notes: e.target.value,
                        })
                    }
                    placeholder="Loading dock info, access codes, gate instructions, etc."
                    rows={2}
                    className="font-mono text-sm"
                />
            </div>
        </div>
    );
}
