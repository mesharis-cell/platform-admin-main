"use client";

/**
 * Phase 14: Analytics React Query Hooks
 */

import { useQuery } from "@tanstack/react-query";
import type {
    RevenueSummary,
    MarginSummary,
    CompanyBreakdown,
    TimeSeries,
    RevenueQueryParams,
    MarginQueryParams,
    CompanyBreakdownQueryParams,
    TimeSeriesQueryParams,
} from "@/types/analytics";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { apiClient } from "@/lib/api/api-client";

/**
 * Fetch revenue summary
 */
export function useRevenueSummary(params: RevenueQueryParams = {}) {
    return useQuery({
        queryKey: ["analytics", "revenue", params],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();

                if (params.companyId) searchParams.set("company_id", params.companyId);
                if (params.startDate) searchParams.set("start_date", params.startDate);
                if (params.endDate) searchParams.set("end_date", params.endDate);
                if (params.timePeriod) searchParams.set("time_period", params.timePeriod);

                const response = await apiClient.get<RevenueSummary>(
                    `/operations/v1/analytics/revenue-summary?${searchParams.toString()}`
                );

                console.log("response.data", response.data);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
}

/**
 * Fetch margin summary
 */
export function useMarginSummary(params: MarginQueryParams = {}) {
    return useQuery({
        queryKey: ["analytics", "margins", params],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();

                if (params.companyId) searchParams.set("companyId", params.companyId);
                if (params.startDate) searchParams.set("startDate", params.startDate);
                if (params.endDate) searchParams.set("endDate", params.endDate);
                if (params.timePeriod) searchParams.set("timePeriod", params.timePeriod);

                const response = await apiClient.get<MarginSummary>(
                    `/operations/v1/analytics/margin-summary?${searchParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
}

/**
 * Fetch company breakdown
 */
export function useCompanyBreakdown(params: CompanyBreakdownQueryParams = {}) {
    return useQuery({
        queryKey: ["analytics", "company-breakdown", params],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();

                if (params.startDate) searchParams.set("startDate", params.startDate);
                if (params.endDate) searchParams.set("endDate", params.endDate);
                if (params.timePeriod) searchParams.set("timePeriod", params.timePeriod);
                if (params.sortBy) searchParams.set("sortBy", params.sortBy);
                if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

                const response = await apiClient.get<CompanyBreakdown>(
                    `/operations/v1/analytics/company-breakdown?${searchParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
}

/**
 * Fetch time series data
 */
export function useTimeSeries(params: TimeSeriesQueryParams) {
    return useQuery({
        queryKey: ["analytics", "time-series", params],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();

                searchParams.set("groupBy", params.groupBy); // Required parameter

                if (params.companyId) searchParams.set("companyId", params.companyId);
                if (params.startDate) searchParams.set("startDate", params.startDate);
                if (params.endDate) searchParams.set("endDate", params.endDate);

                const response = await apiClient.get<TimeSeries>(
                    `/operations/v1/analytics/time-series?${searchParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        enabled: !!params.groupBy, // Only run query if groupBy is provided
    });
}
