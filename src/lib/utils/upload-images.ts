/* global globalThis */
"use client";

import { apiClient } from "@/lib/api/api-client";

export type UploadProfile = "photo" | "logo";

export interface UploadImagesInput {
    files: File[];
    companyId?: string;
    draft?: boolean;
    profile?: UploadProfile;
}

const PHOTO_MAX_DIMENSION = 1920;
const PHOTO_JPEG_QUALITY = 0.85;
const LOGO_MAX_DIMENSION = 2048;
const LOGO_MAX_FILE_BYTES = 1_500_000;

const PHOTO_LIKE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/heic",
    "image/heif",
]);

const loadImage = (file: File): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const ImageCtor = globalThis.Image;
        if (!ImageCtor) {
            reject(new Error("Image compression is unavailable in this runtime"));
            return;
        }

        const url = URL.createObjectURL(file);
        const img = new ImageCtor();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image "${file.name}"`));
        };
        img.src = url;
    });

const replaceExtension = (name: string, nextExt: "jpg" | "png") =>
    name.replace(/\.[^.]+$/, `.${nextExt}`) || `upload.${nextExt}`;

const canvasEncode = async (
    file: File,
    options: {
        maxDimension: number;
        format: "image/jpeg" | "image/png";
        quality?: number;
    }
): Promise<File> => {
    const img = await loadImage(file);
    const maxSide = Math.max(img.width, img.height);
    const scale = maxSide > 0 ? Math.min(1, options.maxDimension / maxSide) : 1;
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const doc = globalThis.document;
    if (!doc) {
        throw new Error("Image compression is unavailable in this runtime");
    }
    const canvas = doc.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Unable to initialize image compression canvas");
    }

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (result) => {
                if (!result) {
                    reject(new Error(`Failed to encode image "${file.name}"`));
                    return;
                }
                resolve(result);
            },
            options.format,
            options.quality
        );
    });

    const extension = options.format === "image/png" ? "png" : "jpg";
    return new File([blob], replaceExtension(file.name, extension), {
        type: options.format,
        lastModified: Date.now(),
    });
};

export const compressForUpload = async (
    file: File,
    profile: UploadProfile = "photo"
): Promise<File> => {
    if (!file.type.startsWith("image/")) {
        throw new Error(`Unsupported file type "${file.type}" for image upload`);
    }

    if (profile === "photo") {
        if (file.type === "image/svg+xml") {
            throw new Error("SVG is not supported for photo uploads");
        }
        return canvasEncode(file, {
            maxDimension: PHOTO_MAX_DIMENSION,
            format: "image/jpeg",
            quality: PHOTO_JPEG_QUALITY,
        });
    }

    if (file.type === "image/png") {
        const img = await loadImage(file);
        const maxSide = Math.max(img.width, img.height);
        const needsResize = maxSide > LOGO_MAX_DIMENSION;
        const needsReencode = file.size > LOGO_MAX_FILE_BYTES;

        if (!needsResize && !needsReencode) {
            return file;
        }

        return canvasEncode(file, {
            maxDimension: LOGO_MAX_DIMENSION,
            format: "image/png",
        });
    }

    if (file.type === "image/svg+xml") {
        if (file.size > LOGO_MAX_FILE_BYTES) {
            throw new Error("SVG logo is too large. Please use a smaller file.");
        }
        return file;
    }

    if (PHOTO_LIKE_MIME_TYPES.has(file.type) || file.type.startsWith("image/")) {
        return canvasEncode(file, {
            maxDimension: LOGO_MAX_DIMENSION,
            format: "image/jpeg",
            quality: 0.9,
        });
    }

    throw new Error(`Unsupported logo file type "${file.type}"`);
};

export const uploadImages = async ({
    files,
    companyId,
    draft = false,
    profile = "photo",
}: UploadImagesInput): Promise<string[]> => {
    if (!Array.isArray(files) || files.length === 0) {
        throw new Error("No files provided for upload");
    }

    const processedFiles = await Promise.all(files.map((file) => compressForUpload(file, profile)));

    const formData = new FormData();
    if (companyId) formData.append("companyId", companyId);
    processedFiles.forEach((file) => formData.append("files", file));

    const suffix = draft ? "?draft=true" : "";
    const response = await apiClient.post(`/operations/v1/upload/images${suffix}`, formData);
    const imageUrls = response.data?.data?.imageUrls;

    if (!Array.isArray(imageUrls)) {
        throw new Error("Invalid upload response: image URLs missing");
    }

    return imageUrls as string[];
};
