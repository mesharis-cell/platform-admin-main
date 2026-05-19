"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, Camera, CheckCircle2, FileText, Loader2, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConditionHistoryTimeline } from "@/components/conditions/condition-history-timeline";
import { PhotoCaptureStrip, type PhotoEntry } from "@/components/shared/photo-capture-strip";
import { useAddMaintenanceNotes, useUpdateAssetCondition } from "@/hooks/use-conditions";
import { uploadImages } from "@/lib/utils/upload-images";
import type { AssetsDetails, Condition } from "@/types/asset";

type Props = {
    asset: AssetsDetails;
};

const CONDITION_META: Record<Condition, { label: string; className: string; icon: ReactNode }> = {
    GREEN: {
        label: "GREEN",
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
        icon: <CheckCircle2 className="h-4 w-4" />,
    },
    ORANGE: {
        label: "ORANGE",
        className: "border-amber-500/30 bg-amber-500/10 text-amber-700",
        icon: <AlertCircle className="h-4 w-4" />,
    },
    RED: {
        label: "RED",
        className: "border-red-500/30 bg-red-500/10 text-red-700",
        icon: <Wrench className="h-4 w-4" />,
    },
};

const getHistoryPhotos = (
    entry?: AssetsDetails["condition_history"][number]
): Array<{ url: string; description?: string }> => {
    if (!entry) return [];
    if (Array.isArray(entry.damage_report_entries) && entry.damage_report_entries.length > 0) {
        return entry.damage_report_entries.filter((item) => !!item?.url);
    }
    return (entry.photos || []).filter(Boolean).map((url) => ({ url }));
};

export function AssetConditionCard({ asset }: Props) {
    const [updateOpen, setUpdateOpen] = useState(false);
    const [observationOpen, setObservationOpen] = useState(false);
    const [targetCondition, setTargetCondition] = useState<Condition>(asset.condition);
    const [notes, setNotes] = useState("");
    const [refurbDays, setRefurbDays] = useState<number | null>(asset.refurb_days_estimate ?? null);
    const [photos, setPhotos] = useState<PhotoEntry[]>([]);
    const [observationNotes, setObservationNotes] = useState("");
    const [uploading, setUploading] = useState(false);

    const updateCondition = useUpdateAssetCondition();
    const addObservation = useAddMaintenanceNotes();

    const latestHistory = asset.condition_history?.[0];
    const latestPhotos = useMemo(() => getHistoryPhotos(latestHistory), [latestHistory]);
    const meta = CONDITION_META[asset.condition];
    const companyId = asset.company_id || asset.company?.id;
    const isTransformed = asset.status === "TRANSFORMED";
    const needsRefurbDays = targetCondition !== "GREEN";
    const hasConditionChanged = targetCondition !== asset.condition;
    const isBusy = updateCondition.isPending || uploading;

    const openUpdate = () => {
        setTargetCondition(asset.condition);
        setNotes("");
        setRefurbDays(asset.refurb_days_estimate ?? null);
        setPhotos([]);
        setUpdateOpen(true);
    };

    const handleConditionSubmit = async () => {
        if (!hasConditionChanged) {
            toast.error("Choose a different condition, or add an observation instead.");
            return;
        }
        if (!notes.trim()) {
            toast.error("Condition notes are required");
            return;
        }
        if (photos.length < 1) {
            toast.error("At least one condition photo is required");
            return;
        }
        if (needsRefurbDays && (!refurbDays || refurbDays < 1)) {
            toast.error("Refurb days are required for Orange and Red conditions");
            return;
        }

        try {
            setUploading(true);
            const newPhotos = photos.filter((photo) => !!photo.file);
            const uploadedUrls =
                newPhotos.length > 0
                    ? await uploadImages({
                          files: newPhotos.map((photo) => photo.file!),
                          companyId,
                          profile: "photo",
                      })
                    : [];

            let uploadedIndex = 0;
            const photoEntries = photos.map((photo) => {
                const url = photo.uploadedUrl || (photo.file ? uploadedUrls[uploadedIndex++] : "");
                if (!url) throw new Error("A condition photo could not be prepared");
                return {
                    url,
                    description: photo.note.trim() || undefined,
                };
            });

            await updateCondition.mutateAsync({
                asset_id: asset.id,
                condition: targetCondition,
                notes: notes.trim(),
                photo_entries: photoEntries,
                refurb_days_estimate: needsRefurbDays ? (refurbDays ?? undefined) : undefined,
            });

            toast.success("Condition updated");
            setUpdateOpen(false);
            setPhotos([]);
            setNotes("");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update condition");
        } finally {
            setUploading(false);
        }
    };

    const handleObservationSubmit = async () => {
        if (!observationNotes.trim()) {
            toast.error("Observation notes are required");
            return;
        }

        try {
            await addObservation.mutateAsync({
                asset_id: asset.id,
                notes: observationNotes.trim(),
            });
            toast.success("Observation added");
            setObservationNotes("");
            setObservationOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to add observation");
        }
    };

    return (
        <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2 font-mono text-sm">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        Condition
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`font-mono ${meta.className}`}>
                            <span className="mr-1 inline-flex align-middle">{meta.icon}</span>
                            {meta.label}
                        </Badge>
                        {asset.stock_mode === "POOLED" && (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                                Whole pooled record
                            </Badge>
                        )}
                        {asset.refurb_days_estimate ? (
                            <Badge variant="outline" className="font-mono text-[10px]">
                                {asset.refurb_days_estimate} refurb day
                                {asset.refurb_days_estimate === 1 ? "" : "s"}
                            </Badge>
                        ) : null}
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="font-mono"
                        onClick={() => setObservationOpen(true)}
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add observation
                    </Button>
                    <Button
                        size="sm"
                        className="font-mono"
                        onClick={openUpdate}
                        disabled={isTransformed}
                    >
                        <Wrench className="mr-1.5 h-3.5 w-3.5" />
                        Update condition
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {isTransformed && (
                    <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground">
                        Transformed assets cannot receive manual condition updates.
                    </div>
                )}
                {asset.stock_mode === "POOLED" && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-mono text-amber-800">
                        This asset is pooled. A manual condition update applies to the whole stock
                        record, not to an individual unit.
                    </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border bg-muted/20 p-3">
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">
                            Latest note
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm">
                            {latestHistory?.notes || asset.condition_notes || "No condition notes"}
                        </p>
                    </div>
                    <div className="rounded-md border bg-muted/20 p-3">
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">
                            Last update
                        </p>
                        <p className="mt-1 text-sm">
                            {latestHistory?.timestamp
                                ? new Date(latestHistory.timestamp).toLocaleString()
                                : "No history yet"}
                        </p>
                    </div>
                    <div className="rounded-md border bg-muted/20 p-3">
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">
                            Evidence
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm">
                            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                            {latestPhotos.length} photo{latestPhotos.length === 1 ? "" : "s"}
                        </p>
                    </div>
                </div>

                <ConditionHistoryTimeline
                    history={asset.condition_history || []}
                    assetName={asset.name}
                />
            </CardContent>

            <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-mono">Update condition</DialogTitle>
                        <DialogDescription>
                            Record a condition change with evidence for operations reporting.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <div className="space-y-2">
                            <Label className="font-mono text-xs">Condition</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["GREEN", "ORANGE", "RED"] as Condition[]).map((condition) => {
                                    const active = targetCondition === condition;
                                    const item = CONDITION_META[condition];
                                    return (
                                        <button
                                            key={condition}
                                            type="button"
                                            onClick={() => setTargetCondition(condition)}
                                            className={`rounded-md border p-3 text-sm font-mono transition ${
                                                active
                                                    ? item.className
                                                    : "border-border hover:border-muted-foreground"
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs">
                                {targetCondition === "GREEN"
                                    ? "Resolution notes *"
                                    : "Condition notes *"}
                            </Label>
                            <Textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                rows={4}
                                className="font-mono text-sm"
                                placeholder={
                                    targetCondition === "GREEN"
                                        ? "Describe the repair or resolution..."
                                        : "Describe the condition or issue..."
                                }
                            />
                        </div>

                        <PhotoCaptureStrip
                            photos={photos}
                            onChange={setPhotos}
                            minPhotos={1}
                            label={
                                targetCondition === "GREEN"
                                    ? "After-repair photos *"
                                    : "Condition photos *"
                            }
                        />

                        {needsRefurbDays && (
                            <div className="space-y-2">
                                <Label className="font-mono text-xs">Estimated refurb days *</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={refurbDays ?? ""}
                                    onChange={(event) =>
                                        setRefurbDays(
                                            event.target.value ? Number(event.target.value) : null
                                        )
                                    }
                                    className="font-mono"
                                    placeholder="e.g. 5"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setUpdateOpen(false)}
                            disabled={isBusy}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleConditionSubmit} disabled={isBusy}>
                            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save condition
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={observationOpen} onOpenChange={setObservationOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="font-mono">Add observation</DialogTitle>
                        <DialogDescription>
                            Add a note to the condition history without changing the current
                            condition.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label className="font-mono text-xs">Observation notes *</Label>
                        <Textarea
                            value={observationNotes}
                            onChange={(event) => setObservationNotes(event.target.value)}
                            rows={6}
                            className="font-mono text-sm"
                            placeholder="Add inspection notes, follow-up actions, or repair context..."
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setObservationOpen(false)}
                            disabled={addObservation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleObservationSubmit}
                            disabled={addObservation.isPending}
                        >
                            {addObservation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            <FileText className="mr-2 h-4 w-4" />
                            Add observation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
