"use client";

import { createContext, useEffect, useState } from "react";
import { PlatformDomain } from "../types/platform-domain";
import { apiClient, setPlatformId } from "@/lib/api/api-client";
import LoadingState from "@/components/loading-state";

export const PLATFORM_CONTEXT = createContext({
  platform: null,
  setPlatform: (platform: PlatformDomain | null) => { },
});

export const PlatformProvider = ({ children }: { children: React.ReactNode }) => {
  const [platform, setPlatform] = useState<PlatformDomain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hostname = window.location.hostname;

    const fetchPlatform = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/auth/context?hostname=${hostname}`);
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
      setPlatformId(platform.platforms.id);
      // Site primary color takes precedence, fallback to platform primary color
      const sitePrimaryColor = platform.platforms.config.primary_color;
      const siteSecondaryColor = platform.platforms.config.secondary_color;
      const primaryColor = sitePrimaryColor ?? platform.platforms.config.primary_color;
      const secondaryColor = siteSecondaryColor ?? platform.platforms.config.secondary_color;

      if (primaryColor) {
        document.documentElement.style.setProperty('--primary', primaryColor);
        // Also set sidebar primary to match
        document.documentElement.style.setProperty('--sidebar-primary', primaryColor);
        document.documentElement.style.setProperty('--sidebar-ring', primaryColor);
      }

      if (secondaryColor) {
        document.documentElement.style.setProperty('--secondary', secondaryColor);
        // Also set sidebar secondary to match
        document.documentElement.style.setProperty('--sidebar-secondary', secondaryColor);
        document.documentElement.style.setProperty('--sidebar-ring', secondaryColor);
      }
    }
  }, [platform]);

  return (
    <PLATFORM_CONTEXT.Provider value={{ platform, setPlatform }}>
      {loading ? <LoadingState /> : children}
    </PLATFORM_CONTEXT.Provider>
  );
};
