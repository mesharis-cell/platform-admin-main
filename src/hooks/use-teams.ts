"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export interface Team {
    id: string;
    company_id: string;
    name: string;
    description?: string | null;
    can_other_teams_see: boolean;
    can_other_teams_book: boolean;
    created_at: string;
    updated_at: string;
    members: { id: string; user: { id: string; name: string; email: string } }[];
}

export const teamKeys = {
    all: ["teams"] as const,
    list: (params?: Record<string, string>) => [...teamKeys.all, "list", params] as const,
};

async function fetchTeams(params?: Record<string, string>): Promise<{ data: Team[] }> {
    try {
        const searchParams = new URLSearchParams(params);
        const response = await apiClient.get(`/operations/v1/team?${searchParams}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function createTeam(data: {
    company_id: string;
    name: string;
    description?: string;
    can_other_teams_see?: boolean;
    can_other_teams_book?: boolean;
}): Promise<{ data: Team }> {
    try {
        const response = await apiClient.post("/operations/v1/team", data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function updateTeam({
    id,
    data,
}: {
    id: string;
    data: {
        name?: string;
        description?: string | null;
        can_other_teams_see?: boolean;
        can_other_teams_book?: boolean;
    };
}): Promise<{ data: Team }> {
    try {
        const response = await apiClient.patch(`/operations/v1/team/${id}`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function deleteTeam(id: string): Promise<void> {
    try {
        await apiClient.delete(`/operations/v1/team/${id}`);
    } catch (error) {
        throwApiError(error);
    }
}

async function addMember({ teamId, userId }: { teamId: string; userId: string }): Promise<void> {
    try {
        await apiClient.post(`/operations/v1/team/${teamId}/members`, { user_id: userId });
    } catch (error) {
        throwApiError(error);
    }
}

async function removeMember({ teamId, userId }: { teamId: string; userId: string }): Promise<void> {
    try {
        await apiClient.delete(`/operations/v1/team/${teamId}/members/${userId}`);
    } catch (error) {
        throwApiError(error);
    }
}

export function useTeams(params?: Record<string, string>) {
    return useQuery({ queryKey: teamKeys.list(params), queryFn: () => fetchTeams(params) });
}

function useInvalidateTeams() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: teamKeys.all });
}

export function useCreateTeam() {
    const invalidate = useInvalidateTeams();
    return useMutation({ mutationFn: createTeam, onSuccess: invalidate });
}

export function useUpdateTeam() {
    const invalidate = useInvalidateTeams();
    return useMutation({ mutationFn: updateTeam, onSuccess: invalidate });
}

export function useDeleteTeam() {
    const invalidate = useInvalidateTeams();
    return useMutation({ mutationFn: deleteTeam, onSuccess: invalidate });
}

export function useAddTeamMember() {
    const invalidate = useInvalidateTeams();
    return useMutation({ mutationFn: addMember, onSuccess: invalidate });
}

export function useRemoveTeamMember() {
    const invalidate = useInvalidateTeams();
    return useMutation({ mutationFn: removeMember, onSuccess: invalidate });
}
