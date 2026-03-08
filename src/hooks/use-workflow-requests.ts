"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export type WorkflowEntityType = "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
export type WorkflowRequestStatus =
    | "REQUESTED"
    | "ACKNOWLEDGED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";

export interface WorkflowRequestRecord {
    id: string;
    platform_id: string;
    entity_type: WorkflowEntityType;
    entity_id: string;
    workflow_kind: "ARTWORK_SUPPORT";
    status: WorkflowRequestStatus;
    title: string;
    description: string | null;
    requested_by: string;
    requested_by_role: "ADMIN" | "LOGISTICS" | "CLIENT";
    assigned_email: string | null;
    requested_at: string;
    acknowledged_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface WorkflowAttachmentInput {
    attachment_type_id: string;
    file_url: string;
    file_name: string;
    mime_type: string;
    file_size_bytes?: number;
    note?: string;
    visible_to_client?: boolean;
}

const entityBasePath: Record<WorkflowEntityType, string> = {
    ORDER: "order",
    INBOUND_REQUEST: "inbound-request",
    SERVICE_REQUEST: "service-request",
};

export function useEntityWorkflowRequests(entityType: WorkflowEntityType, entityId: string | null) {
    return useQuery({
        queryKey: ["workflow-requests", entityType, entityId],
        queryFn: async (): Promise<{ data: WorkflowRequestRecord[] }> => {
            if (!entityId) return { data: [] };
            try {
                const response = await apiClient.get(
                    `/operations/v1/${entityBasePath[entityType]}/${entityId}/workflow-requests`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!entityId,
    });
}

export function useCreateWorkflowRequest(entityType: WorkflowEntityType, entityId: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            workflow_kind?: "ARTWORK_SUPPORT";
            title: string;
            description?: string;
            assigned_email?: string;
            metadata?: Record<string, unknown>;
            attachments?: WorkflowAttachmentInput[];
        }) => {
            if (!entityId) throw new Error("Entity id is required");
            try {
                const response = await apiClient.post(
                    `/operations/v1/${entityBasePath[entityType]}/${entityId}/workflow-requests`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["workflow-requests", entityType, entityId],
            });
        },
    });
}

export function useUpdateWorkflowRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: {
                status?: WorkflowRequestStatus;
                title?: string;
                description?: string;
                assigned_email?: string | null;
                metadata?: Record<string, unknown>;
            };
        }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/workflow-request/${id}`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workflow-requests"] });
        },
    });
}
