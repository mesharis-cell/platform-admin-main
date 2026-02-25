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

export const PlatformProvider = ({ children }: { children: React.ReactNode }) => {
    const [platform, setPlatform] = useState<PlatformDomain | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlatform = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get(`/auth/context`);
                setPlatform(response.data.data);
            } catch (error) {
                console.error("Error fetching platform:", error);
            } finally {
                setLoading(false);
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
