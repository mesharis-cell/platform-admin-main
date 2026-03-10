"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type { AccessPolicy, UserRole } from "@/types/auth";

export function useAccessPolicies(role?: UserRole) {
    return useQuery({
        queryKey: ["access-policies", role || "all"],
        queryFn: async (): Promise<{ data: AccessPolicy[] }> => {
            try {
                const query = role ? `?role=${role}` : "";
                const response = await apiClient.get(`/operations/v1/access-policy${query}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

export function useCreateAccessPolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<AccessPolicy>) => {
            try {
                const response = await apiClient.post("/operations/v1/access-policy", payload);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["access-policies"] });
        },
    });
}

export function useUpdateAccessPolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<AccessPolicy> }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/access-policy/${id}`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["access-policies"] });
        },
    });
}

export function useDeleteAccessPolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(`/operations/v1/access-policy/${id}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["access-policies"] });
        },
    });
}
