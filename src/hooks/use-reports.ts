"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

export type ReportFilterType =
    | "company"
    | "date"
    | "category-include-exclude"
    | "group"
    | "status"
    | "team"
    // multi-select toggle over the four billing entity arms (ORDER /
    // SERVICE_REQUEST / SELF_PICKUP / INBOUND_REQUEST). Absent/empty ⇒ all four.
    | "entity-toggle";

export interface ReportFilterMeta {
    key: string;
    label: string;
    type: ReportFilterType;
    required: boolean;
    scope?: "document" | "item";
    mode?: "include-only" | "include-exclude";
    options?: { value: string; label: string }[];
    /** status-filter only: overrides the default "All" option label (e.g. "Summary"). */
    allLabel?: string;
    default?: unknown;
}

export type ReportSection = "INVENTORY" | "OPERATIONS" | "FINANCIAL";

export interface ReportCardMeta {
    key: string;
    label: string;
    description: string;
    section: ReportSection;
    audience: "ADMIN" | "ADMIN_CLIENT";
    filters: ReportFilterMeta[];
}

/**
 * Fetch the report registry metadata (already permission + audience filtered
 * server-side). Cards render entirely from this — no hardcoded report list.
 */
export function useReports() {
    return useQuery({
        queryKey: ["reports", "registry"],
        queryFn: async () => {
            const res = await apiClient.get("/operations/v1/reports");
            return (res.data?.data?.reports ?? []) as ReportCardMeta[];
        },
        staleTime: 5 * 60 * 1000,
    });
}
