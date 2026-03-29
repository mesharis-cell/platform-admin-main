"use client";

import { PhotoCaptureStrip, type PhotoEntry } from "@/components/shared/photo-capture-strip";
import type { WizardState } from "./types";

interface Props {
    state: WizardState;
    update: (fields: Partial<WizardState>) => void;
    companyId?: string;
}

export function WizardPhotosForm({ state, update, companyId }: Props) {
    return (
        <div className="py-2 space-y-4">
            <PhotoCaptureStrip
                photos={state.photos}
                onChange={(photos) => update({ photos })}
                label="Add photos of this item"
                companyId={
                    companyId || state.companyId || state.selectedFamily?.company?.id || undefined
                }
            />
            {state.photos.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Photos help identify items during scanning and condition assessments.
                </p>
            )}
        </div>
    );
}
