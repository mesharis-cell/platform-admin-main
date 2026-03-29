export type WizardBranch = "existing" | "new" | null;
export type StockModeChoice = "SERIALIZED" | "POOLED" | null;
export type Condition = "GREEN" | "ORANGE" | "RED";

export interface PhotoEntry {
    previewUrl: string;
    note: string;
    file?: File;
    uploadedUrl?: string;
}

export interface FamilySummary {
    id: string;
    name: string;
    category: string;
    stockMode: string;
    images: Array<{ url: string }>;
    brand?: { id: string; name: string } | null;
    company?: { id: string; name: string } | null;
    availableQuantity: number;
    totalQuantity: number;
    dimensions?: { length?: number; width?: number; height?: number };
    weightPerUnit?: number;
    volumePerUnit?: number;
    packaging?: string | null;
    handlingTags?: string[];
    description?: string | null;
}

export interface WizardState {
    branch: WizardBranch;
    currentStep: number;

    // Branch A: selected family
    selectedFamily: FamilySummary | null;

    // Shared: stock mode
    stockMode: StockModeChoice;

    // Company / brand / team
    companyId: string;
    brandId: string;
    teamId: string;

    // Item name — single field, used for both family and stock record
    itemName: string;
    itemDescription: string;
    category: string;

    // Stock record fields
    warehouseId: string;
    zoneId: string;
    quantity: number;
    availableQuantity: number;
    packaging: string;
    status: string;

    // Photos (using PhotoEntry for compatibility with PhotoCaptureStrip)
    photos: PhotoEntry[];

    // Specs
    dimLength: number;
    dimWidth: number;
    dimHeight: number;
    weightPerUnit: number;
    volumePerUnit: number;

    // Condition
    condition: Condition;
    conditionNotes: string;
    refurbDaysEstimate: number | null;

    // Tags
    handlingTags: string[];

    // Submit
    isSubmitting: boolean;
}

export type WizardAction =
    | { type: "SET_BRANCH"; branch: WizardBranch }
    | { type: "NEXT_STEP" }
    | { type: "PREV_STEP" }
    | { type: "GO_TO_STEP"; step: number }
    | { type: "UPDATE"; fields: Partial<WizardState> }
    | { type: "SELECT_FAMILY"; family: FamilySummary }
    | { type: "RESET" };

export const BRANCH_A_STEPS = [
    "search",
    "location",
    "photos",
    "specs",
    "condition",
    "review",
] as const;
export const BRANCH_B_STEPS = [
    "type",
    "family",
    "location",
    "photos",
    "specs",
    "condition",
    "review",
] as const;

export const STEP_LABELS: Record<string, string> = {
    search: "Find Item",
    type: "Item Type",
    family: "Item Details",
    location: "Location & Quantity",
    photos: "Photos",
    specs: "Specifications",
    condition: "Condition",
    review: "Review",
};

export const INITIAL_STATE: WizardState = {
    branch: null,
    currentStep: 0,
    selectedFamily: null,
    stockMode: null,
    companyId: "",
    brandId: "",
    teamId: "",
    itemName: "",
    itemDescription: "",
    category: "",
    warehouseId: "",
    zoneId: "",
    quantity: 1,
    availableQuantity: 1,
    packaging: "",
    status: "AVAILABLE",
    photos: [],
    dimLength: 0,
    dimWidth: 0,
    dimHeight: 0,
    weightPerUnit: 0,
    volumePerUnit: 0,
    condition: "GREEN",
    conditionNotes: "",
    refurbDaysEstimate: null,
    handlingTags: [],
    isSubmitting: false,
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
        case "SET_BRANCH":
            return { ...state, branch: action.branch, currentStep: 0 };
        case "NEXT_STEP":
            return { ...state, currentStep: state.currentStep + 1 };
        case "PREV_STEP":
            if (state.currentStep === 0) return { ...state, branch: null };
            return { ...state, currentStep: state.currentStep - 1 };
        case "GO_TO_STEP":
            return { ...state, currentStep: action.step };
        case "UPDATE":
            return { ...state, ...action.fields };
        case "SELECT_FAMILY": {
            const f = action.family;
            return {
                ...state,
                selectedFamily: f,
                stockMode: f.stockMode === "POOLED" ? "POOLED" : "SERIALIZED",
                companyId: f.company?.id || state.companyId,
                brandId: f.brand?.id || state.brandId,
                category: f.category || state.category,
                itemName: f.name || state.itemName,
                dimLength: Number(f.dimensions?.length) || state.dimLength,
                dimWidth: Number(f.dimensions?.width) || state.dimWidth,
                dimHeight: Number(f.dimensions?.height) || state.dimHeight,
                weightPerUnit: Number(f.weightPerUnit) || state.weightPerUnit,
                volumePerUnit: Number(f.volumePerUnit) || state.volumePerUnit,
                packaging: f.packaging || state.packaging,
                handlingTags: f.handlingTags?.length ? f.handlingTags : state.handlingTags,
                currentStep: state.currentStep + 1,
            };
        }
        case "RESET":
            return { ...INITIAL_STATE };
        default:
            return state;
    }
}

export function getSteps(branch: WizardBranch) {
    if (branch === "existing") return [...BRANCH_A_STEPS];
    if (branch === "new") return [...BRANCH_B_STEPS];
    return [];
}
