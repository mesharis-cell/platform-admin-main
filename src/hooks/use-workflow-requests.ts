"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export type WorkflowEntityType = "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST" | "SELF_PICKUP";
export type WorkflowLifecycleState = "OPEN" | "ACTIVE" | "DONE" | "CANCELLED";
export type WorkflowRole = "ADMIN" | "LOGISTICS" | "CLIENT";

export interface WorkflowFamilyMeta {
    key: string;
    label: string;
    description: string;
    component_key: string;
    supportedStatusModels: string[];
}

export interface WorkflowStatusModelMeta {
    key: string;
    label: string;
    statuses: string[];
    initialStatus: string;
    lifecycleMap: Record<string, WorkflowLifecycleState>;
}

export interface WorkflowDefinitionMetaResponse {
    workflow_families: WorkflowFamilyMeta[];
    status_models: WorkflowStatusModelMeta[];
}

export interface WorkflowDefinitionRecord {
    id: string;
    code: string;
    label: string;
    description: string | null;
    workflow_family: string;
    status_model_key: string;
    allowed_entity_types: WorkflowEntityType[];
    requester_roles: WorkflowRole[];
    viewer_roles: WorkflowRole[];
    actor_roles: WorkflowRole[];
    priority_enabled: boolean;
    sla_hours: number | null;
    blocks_fulfillment_default: boolean;
    intake_schema: Record<string, unknown>;
    is_active: boolean;
    sort_order: number;
    family?: WorkflowFamilyMeta | null;
    status_model?: WorkflowStatusModelMeta | null;
    company_overrides?: Array<{
        company_id: string;
        is_enabled: boolean;
        label_override?: string | null;
        sort_order_override?: number | null;
    }>;
}

export interface WorkflowRequestRecord {
    id: string;
    platform_id: string;
    entity_type: WorkflowEntityType;
    entity_id: string;
    workflow_definition_id: string;
    workflow_code: string;
    workflow_label: string;
    workflow_family: string;
    status_model_key: string;
    status: string;
    lifecycle_state: WorkflowLifecycleState;
    title: string;
    description: string | null;
    requested_by: string;
    requested_by_role: "ADMIN" | "LOGISTICS";
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

export function useEntityWorkflowRequests(
    entityType: WorkflowEntityType,
    entityId: string | null,
    enabled = true
) {
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
        enabled: !!entityId && enabled,
    });
}

export function useAvailableWorkflowDefinitions(
    entityType: WorkflowEntityType,
    entityId: string | null,
    enabled = true
) {
    return useQuery({
        queryKey: ["workflow-definitions", "available", entityType, entityId],
        queryFn: async (): Promise<{ data: WorkflowDefinitionRecord[] }> => {
            if (!entityId) return { data: [] };
            try {
                const response = await apiClient.get(
                    `/operations/v1/workflow-definitions/available?entity_type=${entityType}&entity_id=${entityId}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!entityId && enabled,
    });
}

export function useWorkflowDefinitions() {
    return useQuery({
        queryKey: ["workflow-definitions"],
        queryFn: async (): Promise<{ data: WorkflowDefinitionRecord[] }> => {
            try {
                const response = await apiClient.get("/operations/v1/workflow-definitions");
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

export function useWorkflowDefinitionMeta() {
    return useQuery({
        queryKey: ["workflow-definition-meta"],
        queryFn: async (): Promise<{ data: WorkflowDefinitionMetaResponse }> => {
            try {
                const response = await apiClient.get("/operations/v1/workflow-definitions/meta");
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

export function useWorkflowInbox(filters?: { lifecycle_state?: string; workflow_code?: string }) {
    return useQuery({
        queryKey: ["workflow-inbox", filters],
        queryFn: async (): Promise<{ data: WorkflowRequestRecord[] }> => {
            try {
                const params = new URLSearchParams();
                if (filters?.lifecycle_state)
                    params.append("lifecycle_state", filters.lifecycle_state);
                if (filters?.workflow_code) params.append("workflow_code", filters.workflow_code);
                const response = await apiClient.get(`/operations/v1/workflow-request?${params}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

export function useCreateWorkflowDefinition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Omit<WorkflowDefinitionRecord, "id">) => {
            try {
                const response = await apiClient.post(
                    "/operations/v1/workflow-definitions",
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
        },
    });
}

export function useCreateWorkflowRequest(entityType: WorkflowEntityType, entityId: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            workflow_code: string;
            title: string;
            description?: string;
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
            queryClient.invalidateQueries({ queryKey: ["workflow-inbox"] });
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
                status?: string;
                title?: string;
                description?: string;
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
            queryClient.invalidateQueries({ queryKey: ["workflow-inbox"] });
        },
    });
}

export function useUpdateWorkflowDefinition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: Partial<WorkflowDefinitionRecord>;
        }) => {
            try {
                const response = await apiClient.patch(
                    `/operations/v1/workflow-definitions/${id}`,
                    payload
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
        },
    });
}

export function useReplaceWorkflowCompanyOverrides() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            overrides,
        }: {
            id: string;
            overrides: Array<{
                company_id: string;
                is_enabled: boolean;
                label_override?: string | null;
                sort_order_override?: number | null;
            }>;
        }) => {
            try {
                const response = await apiClient.put(
                    `/operations/v1/workflow-definitions/${id}/company-overrides`,
                    { overrides }
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
        },
    });
}

export function useDeleteWorkflowDefinition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(
                    `/operations/v1/workflow-definitions/${id}`
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
        },
    });
}
