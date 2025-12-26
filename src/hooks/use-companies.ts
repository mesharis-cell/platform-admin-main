"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Company, CompanyListResponse, CreateCompanyRequest } from '@/types';
import { apiClient } from '@/lib/api/api-client';
import { throwApiError } from '@/lib/utils/throw-api-error';

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
  try {
    const response = await apiClient.get(`/operations/v1/company?${searchParams}`);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Create company
async function createCompany(data: Partial<CreateCompanyRequest>): Promise<Company> {
  try {
    const response = await apiClient.post('/operations/v1/company', data);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Update company
async function updateCompany({ id, data }: { id: string; data: Partial<Company> }): Promise<Company> {
  try {
    const response = await apiClient.patch(`/operations/v1/company/${id}`, data);
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
}

// Archive company
async function archiveUnarchiveCompany(id: string): Promise<void> {
  try {
    const response = await apiClient.delete(`/operations/v1/company/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error);
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
    mutationFn: archiveUnarchiveCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}



export function useUnarchiveCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveUnarchiveCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}
