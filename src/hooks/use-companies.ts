"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Company, CompanyListResponse } from '@/types';
import { apiClient } from '@/lib/api/api-client';

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
  const response = await apiClient.get(`/operations/v1/company?${searchParams}`);
  return response.data;
}

// Create company
async function createCompany(data: Partial<Company>): Promise<Company> {
  const response = await apiClient.post('/companies', data);
  return response.data;
}

// Update company
async function updateCompany({ id, data }: { id: string; data: Partial<Company> }): Promise<Company> {
  const response = await apiClient.put(`/companies/${id}`, data);
  return response.data;
}

// Archive company
async function archiveCompany(id: string): Promise<void> {
  const response = await apiClient.delete(`/companies/${id}`);
  return response.data;
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
