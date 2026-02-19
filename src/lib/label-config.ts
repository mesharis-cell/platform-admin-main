/**
 * Thermal Label Configuration
 *
 * Printer-agnostic label size definitions and layout configuration.
 * Works with ANY thermal printer (NIIMBOT, Brother, DYMO, Zebra, etc.)
 * by targeting standard label stock dimensions via CSS @page rules.
 *
 * The browser print dialog handles driver-level communication —
 * we just need pixel-perfect layouts for known label dimensions.
 */

export interface LabelSize {
    id: string;
    name: string;
    widthMm: number;
    heightMm: number;
    orientation: "landscape" | "portrait";
    printableArea: {
        widthMm: number;
        heightMm: number;
    };
    layout: "qr-left-text-right" | "qr-top-text-bottom" | "qr-only";
    qrSizeMm: number;
    fonts: {
        assetName: number;
        qrCode: number;
        meta: number;
    };
    maxAssetNameChars: number;
}

export const LABEL_SIZES: Record<string, LabelSize> = {
    "50x30": {
        id: "50x30",
        name: "50 × 30mm",
        widthMm: 50,
        heightMm: 30,
        orientation: "landscape",
        printableArea: { widthMm: 48, heightMm: 28 },
        layout: "qr-left-text-right",
        qrSizeMm: 24,
        fonts: { assetName: 7, qrCode: 5.5, meta: 5 },
        maxAssetNameChars: 28,
    },
    "40x30": {
        id: "40x30",
        name: "40 × 30mm",
        widthMm: 40,
        heightMm: 30,
        orientation: "landscape",
        printableArea: { widthMm: 38, heightMm: 28 },
        layout: "qr-left-text-right",
        qrSizeMm: 24,
        fonts: { assetName: 6, qrCode: 5, meta: 4.5 },
        maxAssetNameChars: 18,
    },
    "40x40": {
        id: "40x40",
        name: "40 × 40mm",
        widthMm: 40,
        heightMm: 40,
        orientation: "portrait",
        printableArea: { widthMm: 38, heightMm: 38 },
        layout: "qr-top-text-bottom",
        qrSizeMm: 28,
        fonts: { assetName: 7, qrCode: 5.5, meta: 5 },
        maxAssetNameChars: 24,
    },
    "25x78": {
        id: "25x78",
        name: "25 × 78mm (Cable)",
        widthMm: 25,
        heightMm: 78,
        orientation: "portrait",
        printableArea: { widthMm: 23, heightMm: 76 },
        layout: "qr-top-text-bottom",
        qrSizeMm: 21,
        fonts: { assetName: 6, qrCode: 5, meta: 4.5 },
        maxAssetNameChars: 16,
    },
    "50x50": {
        id: "50x50",
        name: "50 × 50mm",
        widthMm: 50,
        heightMm: 50,
        orientation: "portrait",
        printableArea: { widthMm: 48, heightMm: 48 },
        layout: "qr-top-text-bottom",
        qrSizeMm: 34,
        fonts: { assetName: 8, qrCode: 6, meta: 5.5 },
        maxAssetNameChars: 32,
    },
    "30x30": {
        id: "30x30",
        name: "30 × 30mm",
        widthMm: 30,
        heightMm: 30,
        orientation: "portrait",
        printableArea: { widthMm: 28, heightMm: 28 },
        layout: "qr-top-text-bottom",
        qrSizeMm: 20,
        fonts: { assetName: 5.5, qrCode: 4.5, meta: 4 },
        maxAssetNameChars: 18,
    },
    a4: {
        id: "a4",
        name: "A4 (210 × 297mm)",
        widthMm: 210,
        heightMm: 297,
        orientation: "portrait",
        printableArea: { widthMm: 190, heightMm: 277 },
        layout: "qr-top-text-bottom",
        qrSizeMm: 100,
        fonts: { assetName: 18, qrCode: 11, meta: 10 },
        maxAssetNameChars: 80,
    },
} as const;

export const DEFAULT_LABEL_SIZE = "50x30";

export interface LabelData {
    qrCode: string;
    assetName: string;
    meta?: string;
}

export function getQrPixelSize(labelSize: LabelSize, dpi: number = 300): number {
    const mmToInches = labelSize.qrSizeMm / 25.4;
    return Math.round(mmToInches * dpi);
}

export function truncateAssetName(name: string, maxChars: number): string {
    if (name.length <= maxChars) return name;
    return name.substring(0, maxChars - 1) + "…";
}

const LABEL_SIZE_STORAGE_KEY = "kadence_preferred_label_size";

export function getPreferredLabelSize(): string {
    if (typeof window === "undefined") return DEFAULT_LABEL_SIZE;
    // eslint-disable-next-line creatr/no-browser-globals-in-ssr
    return localStorage.getItem(LABEL_SIZE_STORAGE_KEY) || DEFAULT_LABEL_SIZE;
}

export function setPreferredLabelSize(sizeId: string): void {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line creatr/no-browser-globals-in-ssr
    localStorage.setItem(LABEL_SIZE_STORAGE_KEY, sizeId);
}
