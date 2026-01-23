"use client";

/**
 * Maintenance Completion Dialog Component (Phase 12)
 * Industrial form for marking maintenance as complete
 */

import { useState } from "react";
import { useCompleteMaintenance } from "@/hooks/use-conditions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Wrench, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface MaintenanceCompletionDialogProps {
    assetId: string;
    assetName: string;
    currentCondition: "RED" | "ORANGE" | "GREEN";
    onSuccess?: () => void;
}

export function MaintenanceCompletionDialog({
    assetId,
    assetName,
    currentCondition,
    onSuccess,
}: MaintenanceCompletionDialogProps) {
    const [open, setOpen] = useState(false);
    const [maintenanceNotes, setMaintenanceNotes] = useState("");
    const completeMaintenance = useCompleteMaintenance();

    const handleSubmit = async () => {
        if (!maintenanceNotes.trim()) {
            toast.error("Maintenance notes are required");
            return;
        }

        try {
            await completeMaintenance.mutateAsync({
                assetId,
                maintenanceNotes,
            });

            toast.success("Maintenance completed successfully", {
                description: `${assetName} is now available for use`,
            });

            setMaintenanceNotes("");
            setOpen(false);
            onSuccess?.();
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to complete maintenance";
            toast.error(message);
        }
    };

    // Only show button if asset is RED (in maintenance)
    if (currentCondition !== "RED") {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    size="sm"
                    className="gap-2 font-mono uppercase tracking-wider text-xs shrink-0"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Complete Maintenance</span>
                    <span className="sm:hidden">Complete</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl font-mono">
                <DialogHeader>
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                        <Wrench className="h-4 w-4" />
                        <span>Maintenance / Completion</span>
                    </div>
                    <DialogTitle className="text-2xl">Complete Maintenance</DialogTitle>
                    <DialogDescription>
                        Document repairs performed and return asset to available inventory
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Asset Info */}
                    <div className="rounded-lg border-l-4 border-l-destructive bg-muted/50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="font-mono text-xs uppercase tracking-wider text-destructive">
                                Currently in Maintenance
                            </span>
                        </div>
                        <p className="font-semibold">{assetName}</p>
                    </div>

                    {/* Maintenance Notes */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="maintenanceNotes"
                            className="text-xs uppercase tracking-wider text-muted-foreground"
                        >
                            Maintenance Report *
                        </Label>
                        <Textarea
                            id="maintenanceNotes"
                            placeholder="Describe repairs performed, parts replaced, tests conducted, etc."
                            value={maintenanceNotes}
                            onChange={(e) => setMaintenanceNotes(e.target.value)}
                            rows={8}
                            className="resize-none font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Detailed notes required to complete maintenance
                        </p>
                    </div>

                    {/* Status Change Info */}
                    <div className="rounded-lg border bg-card p-4">
                        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                            Status Changes
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <span className="font-mono text-sm">Red / In Maintenance</span>
                            </div>
                            <div className="text-muted-foreground">→</div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="font-mono text-sm">Green / Available</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={completeMaintenance.isPending}
                        className="font-mono"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={completeMaintenance.isPending || !maintenanceNotes.trim()}
                        className="gap-2 font-mono"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        {completeMaintenance.isPending ? "Completing..." : "Complete Maintenance"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
