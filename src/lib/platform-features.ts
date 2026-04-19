import type { PlatformDomain } from "@/types/platform-domain";

/**
 * Feature flag registry for the admin UI.
 *
 * The canonical source of truth is the API:
 * `api/src/app/constants/common.ts` → `featureRegistry`. It's served to the
 * admin on every `/auth/context` load as `platform.feature_registry`.
 *
 * This file is just runtime accessors. Adding a new flag requires ONE edit
 * on the API (add to featureRegistry). The admin picks it up automatically
 * on next page load — no frontend deploy needed. See CLAUDE.md
 * <feature_flag_discipline>.
 */

export interface FeatureMeta {
    default: boolean;
    label: string;
    description: string;
    comingSoon?: boolean;
}

export type PlatformFeatureKey = string;
export type FeatureRegistry = Record<PlatformFeatureKey, FeatureMeta>;

/**
 * Pull the registry off the loaded platform context. Returns {} if the API
 * hasn't shipped the feature_registry field yet (older deployment) or if
 * platform is not loaded. Consumers must handle the empty-registry case
 * — UIs should render nothing rather than crash.
 */
export function getFeatureRegistry(
    platform: PlatformDomain | null | undefined
): FeatureRegistry {
    return (platform?.feature_registry as FeatureRegistry | undefined) ?? {};
}

export function getPlatformFeatureKeys(
    platform: PlatformDomain | null | undefined
): PlatformFeatureKey[] {
    return Object.keys(getFeatureRegistry(platform));
}

export function getDefaultPlatformFeatures(
    platform: PlatformDomain | null | undefined
): Record<string, boolean> {
    const registry = getFeatureRegistry(platform);
    return Object.keys(registry).reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = registry[key].default;
        return acc;
    }, {});
}

export function isPlatformFeatureEnabled(
    platform: PlatformDomain | null | undefined,
    featureKey?: PlatformFeatureKey
): boolean {
    if (!featureKey) return true;

    const featureValue = platform?.features?.[featureKey];
    if (featureValue === undefined) {
        const registry = getFeatureRegistry(platform);
        return Boolean(registry[featureKey]?.default);
    }

    return Boolean(featureValue);
}

/**
 * Admin-side feature availability: true if the platform default is on OR
 * any company on the platform has overridden the flag to true. Mirrors the
 * API featureValidator middleware union check for ADMIN/LOGISTICS roles.
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
