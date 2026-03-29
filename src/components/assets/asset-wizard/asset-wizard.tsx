"use client";

import { useReducer, useEffect } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCreateAssetFamily, useAssetFamily } from "@/hooks/use-asset-families";
import { useCreateAsset, useUploadImage } from "@/hooks/use-assets";

import { wizardReducer, INITIAL_STATE, getSteps, STEP_LABELS } from "./types";
import type { WizardState, FamilySummary } from "./types";
import { WizardChoiceScreen } from "./wizard-choice-screen";
import { WizardFamilySearch } from "./wizard-family-search";
import { WizardTypeSelect } from "./wizard-type-select";
import { WizardFamilyForm } from "./wizard-family-form";
import { WizardLocationForm } from "./wizard-location-form";
import { WizardPhotosForm } from "./wizard-photos-form";
import { WizardSpecsForm } from "./wizard-specs-form";
import { WizardConditionForm } from "./wizard-condition-form";
import { WizardReview } from "./wizard-review";

interface AssetWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    preselectedFamilyId?: string;
}

function canAdvance(state: WizardState, stepKey: string): boolean {
    switch (stepKey) {
        case "search":
            return !!state.selectedFamily;
        case "type":
            return !!state.stockMode;
        case "family":
            return !!(state.companyId && state.itemName.trim() && state.category);
        case "location": {
            const base = !!(state.warehouseId && state.zoneId && state.quantity >= 1);
            if (state.stockMode === "POOLED") return base && !!state.packaging.trim();
            return base;
        }
        case "photos":
            return true;
        case "specs":
            return !!(state.weightPerUnit && state.dimLength && state.dimWidth && state.dimHeight);
        case "condition":
            if (
                (state.condition === "ORANGE" || state.condition === "RED") &&
                (!state.refurbDaysEstimate || state.conditionNotes.trim().length < 10)
            )
                return false;
            return true;
        case "review":
            return true;
        default:
            return false;
    }
}

export function AssetWizard({
    open,
    onOpenChange,
    onSuccess,
    preselectedFamilyId,
}: AssetWizardProps) {
    const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE);
    const createFamilyMutation = useCreateAssetFamily();
    const createAssetMutation = useCreateAsset();
    const uploadMutation = useUploadImage();

    const { data: preselectedData } = useAssetFamily(preselectedFamilyId || "");
    useEffect(() => {
        if (!preselectedFamilyId || !preselectedData?.data || state.selectedFamily) return;
        const f = preselectedData.data;
        const summary: FamilySummary = {
            id: f.id,
            name: f.name,
            category: f.category,
            stockMode: f.stock_mode,
            images: f.images || [],
            brand: f.brand,
            company: f.company,
            availableQuantity: Number(f.available_quantity || 0),
            totalQuantity: Number(f.total_quantity || 0),
            dimensions: f.dimensions,
            weightPerUnit: f.weight_per_unit ? Number(f.weight_per_unit) : undefined,
            volumePerUnit: f.volume_per_unit ? Number(f.volume_per_unit) : undefined,
            packaging: f.packaging,
            handlingTags: f.handling_tags,
            description: f.description,
        };
        dispatch({ type: "SET_BRANCH", branch: "existing" });
        dispatch({ type: "SELECT_FAMILY", family: summary });
    }, [preselectedFamilyId, preselectedData?.data, state.selectedFamily]);

    useEffect(() => {
        if (!open) dispatch({ type: "RESET" });
    }, [open]);

    const steps = getSteps(state.branch);
    const currentStepKey = steps[state.currentStep] || "";
    const isLastStep = state.currentStep === steps.length - 1;
    const isChoiceScreen = state.branch === null;

    function update(fields: Partial<WizardState>) {
        dispatch({ type: "UPDATE", fields });
    }

    async function handleSubmit() {
        dispatch({ type: "UPDATE", fields: { isSubmitting: true } });
        try {
            const itemName = state.selectedFamily?.name || state.itemName.trim();
            const companyId = state.companyId || state.selectedFamily?.company?.id || "";

            // Upload photos
            let imageUrls: string[] = [];
            const filesToUpload = state.photos.filter((p) => p.file).map((p) => p.file!);
            const alreadyUploaded = state.photos
                .filter((p) => p.uploadedUrl)
                .map((p) => p.uploadedUrl!);
            if (filesToUpload.length > 0) {
                const uploadResult = await uploadMutation.mutateAsync({
                    files: filesToUpload,
                    companyId,
                    profile: "photo",
                });
                imageUrls = [...alreadyUploaded, ...(uploadResult?.data?.imageUrls || [])];
            } else {
                imageUrls = alreadyUploaded;
            }
            const imagePayload = imageUrls.map((url) => ({ url }));
            let familyId = state.selectedFamily?.id;

            // Branch B: create family first with images
            if (state.branch === "new" && !familyId) {
                const familyResult = await createFamilyMutation.mutateAsync({
                    company_id: companyId,
                    brand_id: state.brandId || undefined,
                    team_id: state.teamId || undefined,
                    name: state.itemName.trim(),
                    description: state.itemDescription.trim() || undefined,
                    category: state.category,
                    stock_mode: state.stockMode === "POOLED" ? "POOLED" : "SERIALIZED",
                    packaging: state.packaging.trim() || undefined,
                    weight_per_unit: state.weightPerUnit || undefined,
                    volume_per_unit: state.volumePerUnit || undefined,
                    handling_tags: state.handlingTags,
                    images: imagePayload,
                } as any);
                familyId = familyResult?.data?.id;
            }

            // Create stock record
            await createAssetMutation.mutateAsync({
                family_id: familyId,
                company_id: companyId,
                warehouse_id: state.warehouseId,
                zone_id: state.zoneId,
                brand_id: state.brandId || state.selectedFamily?.brand?.id || undefined,
                name: itemName,
                category: state.category || state.selectedFamily?.category,
                description:
                    state.itemDescription.trim() || state.selectedFamily?.description || undefined,
                tracking_method: state.stockMode === "POOLED" ? "BATCH" : "INDIVIDUAL",
                total_quantity: state.quantity,
                available_quantity:
                    state.stockMode === "SERIALIZED" ? state.quantity : state.availableQuantity,
                images: imagePayload,
                dimensions: {
                    length: state.dimLength,
                    width: state.dimWidth,
                    height: state.dimHeight,
                },
                weight_per_unit: state.weightPerUnit,
                volume_per_unit: state.volumePerUnit,
                condition: state.condition,
                condition_notes: state.conditionNotes.trim() || undefined,
                refurb_days_estimate: state.refurbDaysEstimate || undefined,
                handling_tags: state.handlingTags,
                packaging: state.packaging.trim() || undefined,
                status: state.status || "AVAILABLE",
            } as any);

            const unitCount =
                state.stockMode === "SERIALIZED" && state.quantity > 1
                    ? `${state.quantity} units`
                    : "asset";
            toast.success(`${itemName} created`, {
                description:
                    state.branch === "new"
                        ? `New item registered with ${unitCount}`
                        : `${unitCount} added to ${state.selectedFamily?.name}`,
            });
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create asset");
        } finally {
            dispatch({ type: "UPDATE", fields: { isSubmitting: false } });
        }
    }

    function renderStep() {
        if (isChoiceScreen)
            return (
                <WizardChoiceScreen onSelect={(b) => dispatch({ type: "SET_BRANCH", branch: b })} />
            );
        switch (currentStepKey) {
            case "search":
                return (
                    <WizardFamilySearch
                        onSelect={(f) => dispatch({ type: "SELECT_FAMILY", family: f })}
                    />
                );
            case "type":
                return (
                    <WizardTypeSelect
                        onSelect={(m) => {
                            dispatch({ type: "UPDATE", fields: { stockMode: m } });
                            dispatch({ type: "NEXT_STEP" });
                        }}
                    />
                );
            case "family":
                return <WizardFamilyForm state={state} update={update} />;
            case "location":
                return <WizardLocationForm state={state} update={update} />;
            case "photos":
                return <WizardPhotosForm state={state} update={update} />;
            case "specs":
                return <WizardSpecsForm state={state} update={update} />;
            case "condition":
                return <WizardConditionForm state={state} update={update} />;
            case "review":
                return <WizardReview state={state} />;
            default:
                return null;
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <div className="px-6 pt-6 pb-4 border-b border-border">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-lg">
                            {isChoiceScreen
                                ? "Create Asset"
                                : STEP_LABELS[currentStepKey] || "Create Asset"}
                        </DialogTitle>
                    </DialogHeader>
                    {!isChoiceScreen && steps.length > 0 && (
                        <div className="flex items-center gap-1 mt-3">
                            {steps.map((s, i) => (
                                <div
                                    key={s}
                                    className={`h-1.5 flex-1 rounded-full transition-colors ${i < state.currentStep ? "bg-primary" : i === state.currentStep ? "bg-primary/60" : "bg-border"}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto px-6">{renderStep()}</div>
                {!isChoiceScreen && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dispatch({ type: "PREV_STEP" })}
                            disabled={state.isSubmitting}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            {state.currentStep === 0 ? "Back" : "Previous"}
                        </Button>
                        {isLastStep ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={state.isSubmitting}
                                data-testid="wizard-submit"
                            >
                                {state.isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        {state.branch === "new"
                                            ? "Create Item & Stock"
                                            : "Add Stock"}
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => dispatch({ type: "NEXT_STEP" })}
                                disabled={!canAdvance(state, currentStepKey)}
                                data-testid="wizard-next"
                            >
                                Continue
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
