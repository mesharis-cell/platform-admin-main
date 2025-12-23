import axios from "axios";

// Store platform ID at module level for interceptor access
let currentPlatformId: string | null = null;

// Setter function to update platform ID from context
export const setPlatformId = (platformId: string | null) => {
    currentPlatformId = platformId;
};

export const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

// Add request interceptor to dynamically inject platform_id header
apiClient.interceptors.request.use((config) => {
    if (currentPlatformId) {
        config.headers["x-platform"] = currentPlatformId;
    }
    return config;
});