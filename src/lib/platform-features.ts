import type { PlatformDomain } from "@/types/platform-domain";

/**
 * Single source of truth for admin-side feature flag metadata.
 *
 * Adding a new flag? ONLY touch this file (plus api/src/app/constants/common.ts
 * on the backend). Every UI that renders feature toggles + every check that
 * asks "is feature X on?" derives from this registry. Do NOT hand-code flag
 * lists in page components, Zod schemas, or sanitizers — see CLAUDE.md
 * <feature_flag_discipline>.
 */
export const FEATURE_META = {
    enable_inbound_requests: {
        default: true,
        label: "Enable Inbound Requests",
        description: "Allow inbound request workflows",
    },
    show_estimate_on_order_creation: {
        default: true,
        label: "Show Estimate on Order Creation",
        description: "Display estimate immediately in order creation flow",
    },
    enable_kadence_invoicing: {
        default: false,
        label: "Enable Invoicing",
        description: "Enable invoice generation and payment confirmation flows",
        comingSoon: true,
    },
    enable_base_operations: {
        default: true,
        label: "Enable Picking & Handling",
        description: "Include Picking & Handling (base operations) in pricing calculations",
    },
    enable_asset_bulk_upload: {
        default: false,
        label: "Enable Asset Bulk Upload",
        description: "Allow bulk uploading of assets via spreadsheet import",
    },
    enable_attachments: {
        default: true,
        label: "Enable Attachments",
        description:
            "Allow typed documents across order, inbound, service request, and workflow records",
    },
    enable_workflows: {
        default: true,
        label: "Enable Internal Workflows",
        description: "Expose workflow sections, workflow inboxes, and workflow request creation",
    },
    enable_service_requests: {
        default: true,
        label: "Enable Service Requests",
        description: "Show service requests section in client portal",
    },
    enable_event_calendar: {
        default: true,
        label: "Enable Event Calendar",
        description: "Show event calendar page in client portal",
    },
    enable_client_stock_requests: {
        default: true,
        label: "Enable Client Stock Requests",
        description: "Allow clients to submit new stock / inbound requests",
    },
    enable_self_pickup: {
        default: false,
        label: "Enable Self Pickup",
        description:
            "Allow clients to choose self-pickup at checkout. Adds a separate commercial flow with collector details, pickup window, and warehouse handover scanning.",
    },
} as const satisfies Record<
    string,
    { default: boolean; label: string; description: string; comingSoon?: boolean }
>;

export type PlatformFeatureKey = keyof typeof FEATURE_META;

export const PLATFORM_FEATURE_KEYS = Object.keys(FEATURE_META) as PlatformFeatureKey[];

export const DEFAULT_PLATFORM_FEATURES = PLATFORM_FEATURE_KEYS.reduce(
    (acc, key) => {
        acc[key] = FEATURE_META[key].default;
        return acc;
    },
    {} as Record<PlatformFeatureKey, boolean>
);

export function isPlatformFeatureEnabled(
    platform: PlatformDomain | null | undefined,
    featureKey?: PlatformFeatureKey
): boolean {
    if (!featureKey) return true;

    const featureValue = platform?.features?.[featureKey];
    if (featureValue === undefined) {
        return DEFAULT_PLATFORM_FEATURES[featureKey];
    }

    return Boolean(featureValue);
}

/**
 * Admin-side feature availability: true if the platform default is on OR any
 * company on the platform has overridden the flag to true. Mirrors the API
 * featureValidator middleware union check for ADMIN/LOGISTICS roles.
 *
 * Use this for admin nav visibility + page guards. Use isPlatformFeatureEnabled
 * only when you specifically need the platform default (e.g. settings UI).
 */
export function isAdminFeatureAvailable(
    platform: PlatformDomain | null | undefined,
    featureKey?: PlatformFeatureKey
): boolean {
    if (!featureKey) return true;

    if (isPlatformFeatureEnabled(platform, featureKey)) return true;

    return Boolean(platform?.effective_admin_features?.[featureKey]);
}
