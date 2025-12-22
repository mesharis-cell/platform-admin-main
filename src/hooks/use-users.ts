import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types/auth';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Fetch users list
async function fetchUsers(params?: Record<string, string>): Promise<{ users: User[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/users?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

// Create user
async function createUser(data: Partial<User> & { password: string }): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user');
  }
  return response.json();
}

// Deactivate user
async function deactivateUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}/deactivate`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to deactivate user');
  }
}

// Reactivate user
async function reactivateUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}/reactivate`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to reactivate user');
  }
}

// Update user
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user');
  }
  return response.json();
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

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reactivateUser,
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
