"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/auth";
import { apiClient } from "@/lib/api/api-client";

// Query keys
export const userKeys = {
    all: ["users"] as const,
    lists: () => [...userKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...userKeys.lists(), params] as const,
    details: () => [...userKeys.all, "detail"] as const,
    detail: (id: string) => [...userKeys.details(), id] as const,
};

// Fetch users list
async function fetchUsers(
    params?: Record<string, string>
): Promise<{
    success: boolean;
    meta: { total: number; page: number; limit: number };
    data: User[];
}> {
    const searchParams = new URLSearchParams(params);
    const response = await apiClient.get(`/operations/v1/user?${searchParams}`);
    return response.data;
}

// Create user
async function createUser(data: Partial<User> & { password: string }): Promise<User> {
    const response = await apiClient.post("/operations/v1/user", data);
    return response.data;
}

// Update user
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
    const response = await apiClient.patch(`/operations/v1/user/${userId}`, data);
    return response.data;
}

// Hooks
export function useUsers(params?: Record<string, string>) {
    return useQuery({
        queryKey: userKeys.list(params),
        queryFn: () => fetchUsers(params),
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
            updateUser(userId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        },
    });
}
