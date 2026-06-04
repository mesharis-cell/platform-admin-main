"use client";

import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type PermitChoice =
    | "NO_PERMIT" // requires_permit=false
    | "CLIENT_HANDLES" // requires_permit=true + permit_owner=CLIENT
    | "PLATFORM_HANDLES" // requires_permit=true + permit_owner=PLATFORM
    | "UNSELECTED"; // requires_permit=true + permit_owner=UNKNOWN (must resolve)

type Props = {
    choice: PermitChoice;
    companyName?: string | null;
};

/**
 * Admin-side mirror of the client permit-warning-alert. Surfaces the same three
 * context-sensitive consequence messages so logistics/admin edits carry the same
 * downstream framing the client saw at checkout, plus a blocking message when the
 * owner is still UNKNOWN.
 *
 *   NO_PERMIT        — red, blocks delivery if a permit is needed at the venue
 *   CLIENT_HANDLES   — amber, surcharge if not provided by delivery day
 *   PLATFORM_HANDLES — info, charge line item will be added to the quote
 *   UNSELECTED       — amber, permit owner must be chosen before save
 *
 * Light-only — dark-mode overrides removed deliberately (matches client).
 */
export function PermitWarningAlert({ choice, companyName }: Props) {
    if (choice === "UNSELECTED") {
        return (
            <Alert
                role="alert"
                className="border-amber-500/70 bg-amber-50 text-amber-900 [&>svg]:text-amber-600 ring-2 ring-amber-200"
            >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                    A permit is required but no owner is selected. Choose who arranges the permit
                    before saving.
                </AlertDescription>
            </Alert>
        );
    }

    if (choice === "NO_PERMIT") {
        return (
            <Alert
                role="alert"
                className="border-red-500/70 bg-red-50 text-red-900 [&>svg]:text-red-600 ring-2 ring-red-200"
            >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                    If a permit is required at the venue and the crew arrives without one,{" "}
                    <strong>delivery cannot proceed</strong>.
                </AlertDescription>
            </Alert>
        );
    }

    if (choice === "CLIENT_HANDLES") {
        const who = companyName ? `${companyName}` : "the client";
        return (
            <Alert
                role="alert"
                className="border-amber-500/70 bg-amber-50 text-amber-900 [&>svg]:text-amber-600 ring-2 ring-amber-200"
            >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                    {who} will handle the permit. Permits must be provided before delivery. If the
                    crew arrives without permits in hand,{" "}
                    <strong>a surcharge and additional fees will apply</strong>, and delivery may be
                    delayed or cancelled.
                </AlertDescription>
            </Alert>
        );
    }

    // PLATFORM_HANDLES
    return (
        <Alert
            role="alert"
            className="border-blue-500/60 bg-blue-50 text-blue-900 [&>svg]:text-blue-600"
        >
            <Info className="h-4 w-4" />
            <AlertDescription>
                Ops will handle the venue permit on the client&apos;s behalf.{" "}
                <strong>An additional cost line item will be added to the quote</strong> for permit
                handling.
            </AlertDescription>
        </Alert>
    );
}

export function derivePermitChoice(
    requiresPermit: boolean,
    permitOwner: "CLIENT" | "PLATFORM" | "UNKNOWN" | null | undefined
): PermitChoice {
    if (!requiresPermit) return "NO_PERMIT";
    if (permitOwner === "CLIENT") return "CLIENT_HANDLES";
    if (permitOwner === "PLATFORM") return "PLATFORM_HANDLES";
    return "UNSELECTED";
}
