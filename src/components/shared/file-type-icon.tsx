"use client";

import {
    FileText,
    FileImage,
    FileSpreadsheet,
    FileBarChart,
    FileCode,
    File as FileIcon,
} from "lucide-react";

type Props = {
    mimeType?: string | null;
    fileName?: string | null;
    className?: string;
};

// Item 3 polish — pick a sensible icon per attachment so the list scans
// faster. Falls back to a generic file icon if the MIME is unknown.
export function FileTypeIcon({ mimeType, fileName, className }: Props) {
    const mt = (mimeType || "").toLowerCase();
    const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";

    if (mt.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
        return <FileImage className={className} />;
    }
    if (mt === "application/pdf" || ext === "pdf") {
        return <FileText className={className} />;
    }
    if (
        mt.includes("spreadsheet") ||
        mt.includes("excel") ||
        ["xls", "xlsx", "csv"].includes(ext)
    ) {
        return <FileSpreadsheet className={className} />;
    }
    if (mt.includes("presentation") || ["ppt", "pptx"].includes(ext)) {
        return <FileBarChart className={className} />;
    }
    if (mt.includes("text/") || ["txt", "md", "json", "xml"].includes(ext)) {
        return <FileCode className={className} />;
    }
    return <FileIcon className={className} />;
}
