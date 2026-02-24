"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

const BASE = "/operations/v1/company-domain";
const PLATFORM_BASE = "/operations/v1/platform";

export interface CompanyDomain {
    id: string;
    platform_id: string;
    company_id: string;
    company_name: string;
    hostname: string;
    type: "VANITY" | "CUSTOM";
    is_verified: boolean | null;
    is_active: boolean | null;
    created_at: string;
    updated_at: string;
}

export interface CreateCompanyDomainPayload {
    company_id: string;
    hostname: string;
    type: "VANITY" | "CUSTOM";
    is_verified?: boolean;
    is_active?: boolean;
}

export interface UpdateCompanyDomainPayload {
    hostname?: string;
    type?: "VANITY" | "CUSTOM";
    is_verified?: boolean;
    is_active?: boolean;
}

export function useCompanyDomains() {
    return useQuery<CompanyDomain[]>({
        queryKey: ["company-domains"],
        queryFn: async () => {
            const res = await apiClient.get(BASE);
            return res.data.data;
        },
    });
}

export function useCreateCompanyDomain() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateCompanyDomainPayload) => {
            const res = await apiClient.post(BASE, payload);
            return res.data.data as CompanyDomain;
        },
        onSuccess: () => {
            toast.success("Domain added");
            qc.invalidateQueries({ queryKey: ["company-domains"] });
        },
        onError: (err: any) => throwApiError(err),
    });
}

export function useUpdateCompanyDomain() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }: UpdateCompanyDomainPayload & { id: string }) => {
            const res = await apiClient.put(`${BASE}/${id}`, payload);
            return res.data.data as CompanyDomain;
        },
        onSuccess: () => {
            toast.success("Domain updated");
            qc.invalidateQueries({ queryKey: ["company-domains"] });
        },
        onError: (err: any) => throwApiError(err),
    });
}

export function useDeleteCompanyDomain() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`${BASE}/${id}`);
        },
        onSuccess: () => {
            toast.success("Domain deleted");
            qc.invalidateQueries({ queryKey: ["company-domains"] });
        },
        onError: (err: any) => throwApiError(err),
    });
}

export function useUpdatePlatformDomain() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (domain: string) => {
            const res = await apiClient.patch(`${PLATFORM_BASE}/domain`, { domain });
            return res.data.data;
        },
        onSuccess: () => {
            toast.success("Platform domain updated");
            qc.invalidateQueries({ queryKey: ["platform"] });
        },
        onError: (err: any) => throwApiError(err),
    });
}
