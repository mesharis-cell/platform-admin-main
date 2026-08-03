"use client";

/**
 * The operational half of the service-request detail header: named decisions,
 * not a status picker.
 *
 * Shape follows the two templates the platform already uses for this job:
 *
 *   - the ADMIN order page, where the whole commercial band collapses into ONE
 *     named action posting an empty body
 *     (`orders/[id]/hybrid-sections.tsx:73-82`);
 *   - the warehouse service-request page, which puts START WORK / MARK COMPLETE
 *     in the header with hardcoded targets and no dropdown
 *     (`warehouse .../service-requests/[id]/page.tsx:388-408`).
 *
 * What is available comes from `serviceRequestOpsActions`, which mirrors the
 * API's transition map and its route-level refusals. Where a state has one
 * legal forward edge this renders one button; where it has a genuine branch it
 * renders the outcomes side by side; on a terminal request, an uplift, or
 * without `service_requests:update` it renders nothing.
 *
 * Only two edges need input, and only those two open a dialog:
 *   - `IN_PROGRESS -> COMPLETED` captures completion notes, mandatory on a
 *     Repair Before Event task (`service-request.services.ts:718-733`);
 *   - `IN_REVIEW -> SUBMITTED` is the single step back and demands a note
 *     saying what happened — the same treatment the warehouse order control
 *     gives its own backward edge.
 * Every other action fires straight off the button, as the order page's approve
 * and the warehouse's START WORK do.
 */

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, CheckCircle2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateServiceRequestStatus } from "@/hooks/use-service-requests";
import {
    serviceRequestOpsActions,
    type ServiceRequestOpsAction,
} from "@/lib/service-request-actions";
import type { ServiceRequest } from "@/types/service-request";

const NOTE_MIN_LENGTH = 5;
const NOTE_MAX_LENGTH = 1000;

/** One glyph per decision shape. Presentation only. */
function actionIcon(action: ServiceRequestOpsAction) {
    if (action.toStatus === "COMPLETED") return CheckCircle2;
    if (action.intent === "secondary" && action.requiresNote) return ArrowLeftRight;
    return PlayCircle;
}

interface ServiceRequestOpsActionsProps {
    request: ServiceRequest;
    /** `service_requests:update` — the key all three write routes carry. */
    canAct: boolean;
    onChanged: () => void;
}

export function ServiceRequestOpsActions({
    request,
    canAct,
    onChanged,
}: ServiceRequestOpsActionsProps) {
    const updateStatus = useUpdateServiceRequestStatus();
    const [pendingAction, setPendingAction] = useState<ServiceRequestOpsAction | null>(null);
    const [note, setNote] = useState("");

    // `photos` is on the detail response but not on the shared type; the count
    // is the only part of it this control needs.
    const workPhotoCount = Array.isArray((request as { photos?: unknown[] }).photos)
        ? ((request as { photos?: unknown[] }).photos as unknown[]).length
        : 0;

    const actions = serviceRequestOpsActions(request, { canAct, workPhotoCount });

    const isRepairBeforeEvent = request.is_repair_before_event === true;
    const noteTrimmed = note.trim();
    // Completion notes are mandatory only on a Repair Before Event task; the
    // step back always needs one. Both rules are the server's
    // (`service-request.services.ts:718-733` and RL-036's dedicated route).
    const noteRequired = pendingAction
        ? pendingAction.requiresNote ||
          (pendingAction.capturesCompletionNotes && isRepairBeforeEvent)
        : false;
    const noteInvalid =
        noteRequired &&
        (noteTrimmed.length < NOTE_MIN_LENGTH || noteTrimmed.length > NOTE_MAX_LENGTH);

    const submit = async (action: ServiceRequestOpsAction, capturedNote: string) => {
        try {
            await updateStatus.mutateAsync({
                id: request.id,
                payload: {
                    to_status: action.toStatus,
                    note:
                        !action.capturesCompletionNotes && capturedNote ? capturedNote : undefined,
                    completion_notes:
                        action.capturesCompletionNotes && capturedNote ? capturedNote : undefined,
                },
            });
            setPendingAction(null);
            setNote("");
            toast.success(`${action.label} — done`);
            onChanged();
        } catch (error) {
            toast.error((error as Error)?.message || `Failed to ${action.label.toLowerCase()}`);
        }
    };

    const handleClick = (action: ServiceRequestOpsAction) => {
        if (action.blockedReason) return;
        if (action.requiresNote || action.capturesCompletionNotes) {
            setPendingAction(action);
            setNote("");
            return;
        }
        void submit(action, "");
    };

    if (actions.length === 0) return null;

    return (
        <>
            {actions.map((action) => {
                const Icon = actionIcon(action);
                return (
                    <Button
                        key={action.key}
                        size="sm"
                        variant={action.intent === "primary" ? "default" : "outline"}
                        className="gap-2 font-mono text-xs disabled:pointer-events-auto disabled:cursor-not-allowed"
                        // The blocked reason is the tooltip rather than a line of
                        // body copy: this control lives in a header run that
                        // already carries five items, and the desk banner
                        // underneath states the same thing in prose.
                        title={action.blockedReason || action.description}
                        disabled={!!action.blockedReason || updateStatus.isPending}
                        onClick={() => handleClick(action)}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {action.label.toUpperCase()}
                    </Button>
                );
            })}

            <Dialog
                open={!!pendingAction}
                onOpenChange={(open) => {
                    if (updateStatus.isPending) return;
                    if (!open) {
                        setPendingAction(null);
                        setNote("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-mono">
                            {pendingAction?.label.toUpperCase()}
                        </DialogTitle>
                        <DialogDescription>{pendingAction?.description}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <Label className="font-mono text-xs">
                            {pendingAction?.capturesCompletionNotes
                                ? "WHAT WAS DONE"
                                : "WHY IS IT GOING BACK"}
                            {noteRequired && <span className="text-destructive"> *</span>}
                        </Label>
                        <Textarea
                            value={note}
                            maxLength={NOTE_MAX_LENGTH}
                            rows={4}
                            className="font-mono text-sm"
                            placeholder={
                                pendingAction?.capturesCompletionNotes
                                    ? "Describe the work that was carried out."
                                    : "State what logistics needs to change."
                            }
                            onChange={(event) => setNote(event.target.value)}
                        />
                        {/* Stated before the click, not in the toast that rejects it. */}
                        <p
                            className={`font-mono text-[11px] ${
                                noteInvalid ? "text-destructive" : "text-muted-foreground"
                            }`}
                        >
                            {noteRequired
                                ? `Required, ${NOTE_MIN_LENGTH}–${NOTE_MAX_LENGTH} characters.`
                                : "Optional."}
                            {pendingAction?.capturesCompletionNotes && isRepairBeforeEvent
                                ? ` Saved work photos: ${workPhotoCount}.`
                                : ""}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="font-mono text-xs"
                            disabled={updateStatus.isPending}
                            onClick={() => {
                                setPendingAction(null);
                                setNote("");
                            }}
                        >
                            BACK
                        </Button>
                        <Button
                            className="font-mono text-xs"
                            disabled={updateStatus.isPending || noteInvalid}
                            onClick={() => {
                                if (!pendingAction || noteInvalid) return;
                                void submit(pendingAction, noteTrimmed);
                            }}
                        >
                            {updateStatus.isPending
                                ? "WORKING..."
                                : pendingAction?.label.toUpperCase()}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
