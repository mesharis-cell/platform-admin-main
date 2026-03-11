"use client";

import { apiClient } from "@/lib/api/api-client";

export interface UploadDocumentsInput {
    files: File[];
    companyId?: string;
    draft?: boolean;
}

export interface UploadedDocument {
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
}

export async function uploadDocuments({
    files,
    companyId,
    draft = false,
}: UploadDocumentsInput): Promise<UploadedDocument[]> {
    if (!Array.isArray(files) || files.length === 0) {
        throw new Error("No files provided for document upload");
    }

    const formData = new FormData();
    if (companyId) formData.append("companyId", companyId);
    files.forEach((file) => formData.append("files", file));

    const suffix = draft ? "?draft=true" : "";
    const response = await apiClient.post(`/operations/v1/upload/documents${suffix}`, formData);
    const documents = response.data?.data?.documents;

    if (!Array.isArray(documents)) {
        throw new Error("Invalid upload response: documents missing");
    }

    return documents as UploadedDocument[];
}
