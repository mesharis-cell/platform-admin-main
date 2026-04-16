import type { PlatformDomain } from "@/types/platform-domain";

export const DEFAULT_PLATFORM_FEATURES = {
    enable_inbound_requests: true,
    show_estimate_on_order_creation: true,
    enable_kadence_invoicing: false,
    enable_base_operations: true,
    enable_asset_bulk_upload: false,
    enable_attachments: true,
    enable_workflows: true,
    enable_service_requests: true,
    enable_event_calendar: true,
    enable_client_stock_requests: true,
    enable_self_pickup: false,
} as const;

export type PlatformFeatureKey = keyof typeof DEFAULT_PLATFORM_FEATURES;

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
