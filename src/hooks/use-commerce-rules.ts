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

export type CommerceRuleAcknowledgement = {
    id: string;
    entity_type: "ORDER" | "SELF_PICKUP";
    entity_id: string;
    rule_id: string | null;
    rule_name: string;
    rule_type: "QUANTITY" | "COMPANION";
    severity: "WARN";
    message: string;
    related_asset_id: string | null;
    acknowledged: boolean;
    acknowledged_at: string | null;
    created_at: string;
    acknowledged_by_user?: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
};

type CommerceRuleFilters = {
    assetId?: string | null;
    includeInactive?: boolean;
    enabled?: boolean;
};

export function useCommerceRulesForAsset(assetId: string | null, enabled = true) {
    return useCommerceRules({ assetId, enabled, includeInactive: true });
}

export function useCommerceRules(filters?: CommerceRuleFilters) {
    const assetId = filters?.assetId;
    const includeInactive = filters?.includeInactive ?? false;
    const enabled = filters?.enabled ?? true;
    return useQuery({
        queryKey: ["commerce-rules", "list", assetId || "all", includeInactive],
        queryFn: async (): Promise<{ data: CommerceRule[] }> => {
            try {
                const params = new URLSearchParams();
                if (assetId) params.set("asset_id", assetId);
                if (includeInactive) params.set("include_inactive", "true");
                const query = params.toString();
                const response = await apiClient.get(
                    `/operations/v1/commerce-rules${query ? `?${query}` : ""}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled,
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

type UpdatePayload = Partial<CreatePayload> & {
    is_active?: boolean;
};

export function useUpdateCommerceRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdatePayload }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/commerce-rules/${id}`,
                    payload
                );
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

export function useCommerceRuleAcknowledgements(
    entityType: "ORDER" | "SELF_PICKUP",
    entityId: string | null,
    enabled = true
) {
    return useQuery({
        queryKey: ["commerce-rule-acknowledgements", entityType, entityId],
        queryFn: async (): Promise<{ data: CommerceRuleAcknowledgement[] }> => {
            if (!entityId) return { data: [] };
            try {
                const params = new URLSearchParams({
                    entity_type: entityType,
                    entity_id: entityId,
                });
                const response = await apiClient.get(
                    `/operations/v1/commerce-rules/acknowledgements?${params}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!entityId && enabled,
    });
}
