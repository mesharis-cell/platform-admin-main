import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

// Token cookie names
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// Cookie options for tokens
const TOKEN_COOKIE_OPTIONS: Cookies.CookieAttributes = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
};

// Store platform ID at module level for interceptor access
let currentPlatformId: string | null = null;

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

// Process queued requests after token refresh
const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Token management functions
export const getAccessToken = (): string | undefined => {
    return Cookies.get(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | undefined => {
    return Cookies.get(REFRESH_TOKEN_KEY);
};

export const setTokens = (
    accessToken: string,
    refreshToken: string,
    expiresInDays: number = 7
): void => {
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, {
        ...TOKEN_COOKIE_OPTIONS,
        expires: 1, // Access token expires in 1 day
    });
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
        ...TOKEN_COOKIE_OPTIONS,
        expires: expiresInDays, // Refresh token expires in specified days
    });
};

export const clearTokens = (): void => {
    Cookies.remove(ACCESS_TOKEN_KEY, { path: "/" });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: "/" });
};

// Setter function to update platform ID from context
export const setPlatformId = (platformId: string | null) => {
    currentPlatformId = platformId;
};

export const apiClient = axios.create({
    // baseURL: "http://localhost:6001/api",
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

// Add request interceptor to dynamically inject platform_id header and access token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Inject platform ID if available
    if (currentPlatformId) {
        config.headers["x-platform"] = currentPlatformId;
    }

    // Inject access token if available
    const accessToken = getAccessToken();
    if (accessToken) {
        config.headers["Authorization"] = `Bearer ${accessToken}`;
    }

    return config;
});

// Add response interceptor to handle token refresh on 401 errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Skip refresh for auth endpoints to prevent infinite loop
            if (
                originalRequest.url?.includes("/auth/login") ||
                originalRequest.url?.includes("/auth/refresh") ||
                originalRequest.url?.includes("/auth/context") ||
                originalRequest.url?.includes("/auth/reset-password")
            ) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    if (token && originalRequest.headers) {
                        originalRequest.headers["Authorization"] = `Bearer ${token}`;
                    }
                    return apiClient(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                // No refresh token available, clear tokens and redirect to login
                clearTokens();
                isRefreshing = false;
                processQueue(error, null);
                // Redirect to login page
                if (typeof window !== "undefined") {
                    window.location.href = "/";
                }
                return Promise.reject(error);
            }

            try {
                // Attempt to refresh the token
                const response = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api"}/auth/refresh`,
                    { refresh_token: refreshToken },
                    { headers: { "Content-Type": "application/json" } }
                );

                const { access_token: newAccessToken, refresh_token: newRefreshToken } =
                    response.data.data;

                // Store new tokens
                setTokens(newAccessToken, newRefreshToken);

                // Update the failed request with new token
                if (originalRequest.headers) {
                    originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
                }

                processQueue(null, newAccessToken);
                isRefreshing = false;

                // Retry the original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                clearTokens();
                processQueue(refreshError as AxiosError, null);
                isRefreshing = false;

                if (typeof window !== "undefined") {
                    window.location.href = "/";
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
