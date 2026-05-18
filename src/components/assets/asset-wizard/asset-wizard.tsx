"use client";

import { useEffect, useReducer } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAssetCategories } from "@/hooks/use-asset-categories";
import { useCreateAsset, useUploadImage } from "@/hooks/use-assets";
import { wizardReducer, INITIAL_STATE, getSteps, STEP_LABELS } from "./types";
import type { WizardState } from "./types";
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
        case "type":
            return !!state.stockMode;
        case "family":
            return !!(
                state.companyId &&
                state.itemName.trim() &&
                (state.category_id || state.new_category)
            );
        case "location": {
            const base = !!(state.warehouseId && state.zoneId && state.quantity >= 1);
            return state.stockMode === "POOLED" ? base && !!state.packaging.trim() : base;
        }
        case "photos":
            return true;
        case "specs":
            return !!(state.weightPerUnit && state.dimLength && state.dimWidth && state.dimHeight);
        case "condition":
            if (
                (state.condition === "ORANGE" || state.condition === "RED") &&
                (!state.refurbDaysEstimate || state.conditionNotes.trim().length < 10)
            ) {
                return false;
            }
            return true;
        case "review":
            return true;
        default:
            return false;
    }
}

export function AssetWizard({ open, onOpenChange, onSuccess }: AssetWizardProps) {
    const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE);
    const createAssetMutation = useCreateAsset();
    const uploadMutation = useUploadImage();
    const { data: categoriesData } = useAssetCategories(state.companyId || undefined, {
        allScopes: !state.companyId,
    });

    useEffect(() => {
        if (!open) dispatch({ type: "RESET" });
    }, [open]);

    const steps = getSteps(state.branch);
    const currentStepKey = steps[state.currentStep] || "";
    const isLastStep = state.currentStep === steps.length - 1;

    function update(fields: Partial<WizardState>) {
        dispatch({ type: "UPDATE", fields });
    }

    function resolveCategoryName() {
        if (state.new_category?.name) return state.new_category.name;
        const category = (categoriesData?.data || []).find((item) => item.id === state.category_id);
        return category?.name || "Uncategorized";
    }

    async function handleSubmit() {
        dispatch({ type: "UPDATE", fields: { isSubmitting: true } });
        try {
            const itemName = state.itemName.trim();
            const companyId = state.companyId;
            const filesToUpload = state.photos
                .filter((photo) => photo.file)
                .map((photo) => photo.file!);
            const alreadyUploaded = state.photos
                .filter((photo) => photo.uploadedUrl)
                .map((photo) => photo.uploadedUrl!);
            let imageUrls = [...alreadyUploaded];

            if (filesToUpload.length > 0) {
                const uploadResult = await uploadMutation.mutateAsync({
                    files: filesToUpload,
                    companyId,
                    profile: "photo",
                });
                imageUrls = [...imageUrls, ...(uploadResult?.data?.imageUrls || [])];
            }

            const imagePayload = imageUrls.map((url) => ({ url }));
            const shouldCreateGroup = state.stockMode === "SERIALIZED" && state.quantity > 1;

            await createAssetMutation.mutateAsync({
                company_id: companyId,
                warehouse_id: state.warehouseId,
                zone_id: state.zoneId,
                brand_id: state.brandId || undefined,
                group_id: null,
                is_part_of_group: shouldCreateGroup,
                group_name: shouldCreateGroup ? itemName : null,
                group_images: shouldCreateGroup ? imagePayload : [],
                group_on_display_image: shouldCreateGroup ? imagePayload[0]?.url || null : null,
                name: itemName,
                category: resolveCategoryName() as any,
                description: state.itemDescription.trim() || undefined,
                stock_mode: state.stockMode === "POOLED" ? "POOLED" : "SERIALIZED",
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
                status: (state.status || "AVAILABLE") as any,
            });

            toast.success(`${itemName} created`);
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create asset");
        } finally {
            dispatch({ type: "UPDATE", fields: { isSubmitting: false } });
        }
    }

    function renderStep() {
        switch (currentStepKey) {
            case "type":
                return (
                    <WizardTypeSelect
                        onSelect={(stockMode) => {
                            dispatch({ type: "UPDATE", fields: { stockMode } });
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
                            {STEP_LABELS[currentStepKey] || "Create Asset"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-1 mt-3">
                        {steps.map((step, index) => (
                            <div
                                key={step}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    index < state.currentStep
                                        ? "bg-primary"
                                        : index === state.currentStep
                                          ? "bg-primary/60"
                                          : "bg-border"
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6">{renderStep()}</div>

                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            state.currentStep === 0
                                ? onOpenChange(false)
                                : dispatch({ type: "PREV_STEP" })
                        }
                        disabled={state.isSubmitting}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        {state.currentStep === 0 ? "Close" : "Previous"}
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
                                    Create Asset
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
            </DialogContent>
        </Dialog>
    );
}
