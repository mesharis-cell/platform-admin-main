"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export type CommerceRuleTarget = { kind: "ASSET"; asset_id: string };

export type CommerceRulePredicate =
    | { kind: "QUANTITY_LT"; threshold: number }
    | { kind: "QUANTITY_GT"; threshold: number }
    | { kind: "COMPANION_REQUIRED"; companion_target: CommerceRuleTarget };

export type CommerceRule = {
    id: string;
    platform_id: string;
    company_id: string | null;
    name: string;
    description: string | null;
    rule_type: "QUANTITY" | "COMPANION";
    severity: "WARN";
    target: CommerceRuleTarget;
    predicate: CommerceRulePredicate;
    message: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export function useCommerceRulesForAsset(assetId: string | null, enabled = true) {
    return useQuery({
        queryKey: ["commerce-rules", "asset", assetId],
        queryFn: async (): Promise<{ data: CommerceRule[] }> => {
            try {
                const response = await apiClient.get(
                    `/operations/v1/commerce-rules?asset_id=${assetId}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!assetId && enabled,
        staleTime: 15000,
    });
}

type CreatePayload = {
    company_id?: string | null;
    name: string;
    description?: string;
    rule_type: "QUANTITY" | "COMPANION";
    severity?: "WARN";
    target: CommerceRuleTarget;
    predicate: CommerceRulePredicate;
    message: string;
};

export function useCreateCommerceRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreatePayload) => {
            try {
                const response = await apiClient.post("/operations/v1/commerce-rules", payload);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["commerce-rules"] });
        },
    });
}

export function useDeleteCommerceRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(`/operations/v1/commerce-rules/${id}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["commerce-rules"] });
        },
    });
}
