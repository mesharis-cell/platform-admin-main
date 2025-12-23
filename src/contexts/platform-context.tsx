"use client";

import { createContext, useEffect, useState } from "react";
import { PlatformDomain } from "../types/platform-domain";
import { apiClient } from "@/lib/api/api-client";

export const PLATFORM_CONTEXT = createContext({
  platform: null,
  setPlatform: (platform: PlatformDomain | null) => { },
});

export const PlatformProvider = ({ children }: { children: React.ReactNode }) => {
  const [platform, setPlatform] = useState<PlatformDomain | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;

    const fetchPlatform = async () => {
      try {
        const response = await apiClient.get(`/auth/context?hostname=${hostname}`);
        setPlatform(response.data);
      } catch (error) {
        console.error("Error fetching platform:", error);
      }
    };
    fetchPlatform();
  }, []);

  return (
    <PLATFORM_CONTEXT.Provider value={{ platform, setPlatform }}>
      {children}
    </PLATFORM_CONTEXT.Provider>
  );
};
