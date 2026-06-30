"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

export interface AssetGroup {
    id: string;
    name: string;
}

/**
 * Distinct {id, name} asset-group pairs for a company — backs the reports "Group"
 * filter picker. company_id is REQUIRED by the API; the query is disabled until a
 * company is selected so the filter stays inert (and disabled) before then.
 *
 * GET /operations/v1/asset/groups?company_id=<id> → { data: [{ id, name }] }
 */
export function useAssetGroups(companyId?: string) {
    return useQuery({
        queryKey: ["asset-groups", companyId ?? "none"],
        enabled: Boolean(companyId),
        staleTime: 5 * 60 * 1000,
        queryFn: async (): Promise<{ data: AssetGroup[] }> => {
            const params = new URLSearchParams({ company_id: companyId as string });
            const response = await apiClient.get(`/operations/v1/asset/groups?${params}`);
            return response.data;
        },
    });
}
