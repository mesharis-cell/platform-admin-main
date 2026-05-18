"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { PlatformDomain } from "../types/platform-domain";
import { apiClient, setPlatformId } from "@/lib/api/api-client";
import { LoadingState } from "@/components/loading-state";

interface PlatformContextType {
    platform: PlatformDomain | null;
    setPlatform: (platform: PlatformDomain | null) => void;
    isLoading: boolean;
}

export const PLATFORM_CONTEXT = createContext<PlatformContextType | undefined>(undefined);

const buildMaintenancePath = (maintenance: NonNullable<PlatformDomain["maintenance"]>) => {
    const params = new URLSearchParams();
    if (maintenance.message) params.set("message", maintenance.message);
    if (maintenance.until) params.set("until", maintenance.until);
    return `/maintenance${params.toString() ? `?${params.toString()}` : ""}`;
};

const redirectToMaintenanceIfNeeded = (platform: PlatformDomain | null) => {
    const maintenance = platform?.maintenance;
    if (!maintenance?.enabled) return false;
    const location =
        typeof globalThis !== "undefined"
            ? (globalThis as typeof globalThis & { location?: Location }).location
            : undefined;
    if (!location || location.pathname === "/maintenance") {
        return false;
    }
    location.href = buildMaintenancePath(maintenance);
    return true;
};

export const PlatformProvider = ({ children }: { children: React.ReactNode }) => {
    const [platform, setPlatform] = useState<PlatformDomain | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlatform = async () => {
            let redirected = false;
            try {
                setLoading(true);
                const devHost = process.env.NEXT_PUBLIC_DEV_HOST_OVERRIDE;
                const response = await apiClient.get(`/auth/context`, {
                    headers: devHost ? { "x-dev-host": devHost } : undefined,
                });
                const platformData = (response.data.data ?? null) as PlatformDomain | null;
                setPlatform(platformData);
                if (platformData?.platform_id) {
                    setPlatformId(platformData.platform_id);
                }
                redirected = redirectToMaintenanceIfNeeded(platformData);
            } catch (error) {
                console.error("Error fetching platform:", error);
            } finally {
                if (!redirected) {
                    setLoading(false);
                }
            }
        };
        fetchPlatform();
    }, []);

    // Apply platform primary color to CSS variables
    useEffect(() => {
        if (platform) {
            // Set platform ID for API client
            setPlatformId(platform.platform_id);

            const primaryColor = platform.primary_color;
            const secondaryColor = platform.secondary_color;

            if (primaryColor) {
                document.documentElement.style.setProperty("--primary", primaryColor);
                document.documentElement.style.setProperty("--sidebar-primary", primaryColor);
                document.documentElement.style.setProperty("--sidebar-ring", primaryColor);
            }

            if (secondaryColor) {
                document.documentElement.style.setProperty("--secondary", secondaryColor);
                document.documentElement.style.setProperty("--sidebar-secondary", secondaryColor);
                document.documentElement.style.setProperty("--sidebar-ring", secondaryColor);
            }
        }
    }, [platform]);

    return (
        <PLATFORM_CONTEXT.Provider value={{ platform, setPlatform, isLoading: loading }}>
            {loading ? <LoadingState /> : children}
        </PLATFORM_CONTEXT.Provider>
    );
};

export const usePlatform = () => {
    const context = useContext(PLATFORM_CONTEXT);
    if (context === undefined) {
        throw new Error("usePlatform must be used within a PlatformProvider");
    }
    return context;
};
