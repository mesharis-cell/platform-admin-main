import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Company, CompanyListResponse } from '@/types';

// Query keys
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};

// Fetch companies list
async function fetchCompanies(params?: Record<string, string>): Promise<CompanyListResponse> {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/companies?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch companies');
  }
  return response.json();
}

// Create company
async function createCompany(data: Partial<Company>): Promise<Company> {
  const response = await fetch('/api/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create company');
  }
  return response.json();
}

// Update company
async function updateCompany({ id, data }: { id: string; data: Partial<Company> }): Promise<Company> {
  const response = await fetch(`/api/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update company');
  }
  return response.json();
}

// Archive company
async function archiveCompany(id: string): Promise<void> {
  const response = await fetch(`/api/companies/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to archive company');
  }
}

// Hooks
export function useCompanies(params?: Record<string, string>) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => fetchCompanies(params),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

export function useArchiveCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}
