"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type { NotificationRule } from "@/types/notifications";

const BASE = "/operations/v1/notification-rules";

interface ListParams {
    event_type?: string;
    company_id?: string;
}

interface CreateInput {
    event_type: string;
    recipient_type: string;
    recipient_value?: string;
    template_key: string;
    company_id?: string;
    sort_order?: number;
    is_enabled?: boolean;
}

interface UpdateInput {
    is_enabled?: boolean;
    template_key?: string;
    sort_order?: number;
}

export function useNotificationRules(params?: ListParams) {
    const query = new URLSearchParams();
    if (params?.event_type) query.set("event_type", params.event_type);
    if (params?.company_id) query.set("company_id", params.company_id);

    return useQuery<NotificationRule[]>({
        queryKey: ["notification-rules", params],
        queryFn: async () => {
            const res = await apiClient.get(`${BASE}?${query}`);
            return res.data.data;
        },
    });
}

export function useCreateNotificationRule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: CreateInput) => {
            const res = await apiClient.post(BASE, input);
            return res.data.data as NotificationRule;
        },
        onSuccess: () => {
            toast.success("Rule created");
            qc.invalidateQueries({ queryKey: ["notification-rules"] });
        },
        onError: (err: any) => {
            throwApiError(err);
            toast.error(err.message || "Failed to create rule");
        },
    });
}

export function useUpdateNotificationRule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...input }: UpdateInput & { id: string }) => {
            const res = await apiClient.patch(`${BASE}/${id}`, input);
            return res.data.data as NotificationRule;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notification-rules"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update rule");
        },
    });
}

export function useDeleteNotificationRule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`${BASE}/${id}`);
        },
        onSuccess: () => {
            toast.success("Rule deleted");
            qc.invalidateQueries({ queryKey: ["notification-rules"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to delete rule");
        },
    });
}

export function useResetEventRules() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            event_type,
            company_id,
        }: {
            event_type: string;
            company_id?: string;
        }) => {
            const query = company_id ? `?company_id=${company_id}` : "";
            await apiClient.post(`${BASE}/reset/${event_type}${query}`);
        },
        onSuccess: () => {
            toast.success("Rules reset to defaults");
            qc.invalidateQueries({ queryKey: ["notification-rules"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to reset rules");
        },
    });
}
