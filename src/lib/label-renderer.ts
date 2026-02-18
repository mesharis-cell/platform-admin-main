/**
 * Label Renderer
 *
 * Generates print-ready HTML documents with proper @page CSS rules
 * for thermal label printing. Printer-agnostic — works with any
 * thermal printer that the OS can see.
 *
 * Key principles:
 * - @page sets exact label dimensions so the printer knows the media size
 * - All sizing uses mm units (not px) for physical accuracy
 * - QR images are rendered at 300dpi resolution
 * - Layouts adapt to label shape (landscape vs portrait)
 * - Batch printing uses page-break-after for multi-label jobs
 */

import type { LabelSize, LabelData } from "./label-config";
import { truncateAssetName, getQrPixelSize } from "./label-config";
import { generateQRCode } from "@/lib/services/qr-code";

function buildLabelHtml(label: LabelData, labelSize: LabelSize, qrImage: string): string {
    const truncatedName = truncateAssetName(label.assetName, labelSize.maxAssetNameChars);
    const { layout, qrSizeMm, fonts, printableArea } = labelSize;

    if (layout === "qr-left-text-right") {
        const textWidth = printableArea.widthMm - qrSizeMm - 2;
        return `
            <div class="label" style="
                width: ${printableArea.widthMm}mm;
                height: ${printableArea.heightMm}mm;
                display: flex;
                align-items: center;
                gap: 2mm;
                overflow: hidden;
            ">
                <img
                    src="${qrImage}"
                    alt="QR"
                    style="width: ${qrSizeMm}mm; height: ${qrSizeMm}mm; flex-shrink: 0; image-rendering: pixelated;"
                />
                <div style="
                    width: ${textWidth}mm;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 0.8mm;
                ">
                    <div style="
                        font-size: ${fonts.assetName}pt;
                        font-weight: 700;
                        line-height: 1.15;
                        word-break: break-word;
                        overflow: hidden;
                    ">${truncatedName}</div>
                    <div style="
                        font-size: ${fonts.qrCode}pt;
                        font-family: 'Courier New', monospace;
                        line-height: 1.1;
                        opacity: 0.85;
                        word-break: break-all;
                    ">${label.qrCode}</div>
                    ${label.meta ? `<div style="
                        font-size: ${fonts.meta}pt;
                        line-height: 1.1;
                        opacity: 0.7;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                    ">${label.meta}</div>` : ""}
                </div>
            </div>`;
    }

    if (layout === "qr-top-text-bottom") {
        const textHeight = printableArea.heightMm - qrSizeMm - 1.5;
        return `
            <div class="label" style="
                width: ${printableArea.widthMm}mm;
                height: ${printableArea.heightMm}mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1mm;
                overflow: hidden;
            ">
                <img
                    src="${qrImage}"
                    alt="QR"
                    style="width: ${qrSizeMm}mm; height: ${qrSizeMm}mm; flex-shrink: 0; image-rendering: pixelated;"
                />
                <div style="
                    width: 100%;
                    height: ${textHeight}mm;
                    overflow: hidden;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5mm;
                ">
                    <div style="
                        font-size: ${fonts.assetName}pt;
                        font-weight: 700;
                        line-height: 1.15;
                        word-break: break-word;
                        overflow: hidden;
                    ">${truncatedName}</div>
                    <div style="
                        font-size: ${fonts.qrCode}pt;
                        font-family: 'Courier New', monospace;
                        line-height: 1.1;
                        opacity: 0.85;
                        word-break: break-all;
                    ">${label.qrCode}</div>
                    ${label.meta ? `<div style="
                        font-size: ${fonts.meta}pt;
                        line-height: 1.1;
                        opacity: 0.7;
                    ">${label.meta}</div>` : ""}
                </div>
            </div>`;
    }

    return `
        <div class="label" style="
            width: ${printableArea.widthMm}mm;
            height: ${printableArea.heightMm}mm;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <img
                src="${qrImage}"
                alt="QR"
                style="width: ${qrSizeMm}mm; height: ${qrSizeMm}mm; image-rendering: pixelated;"
            />
        </div>`;
}

function buildPrintDocument(labelsHtml: string[], labelSize: LabelSize): string {
    const { widthMm, heightMm } = labelSize;

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>QR Labels</title>
    <style>
        @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            width: ${widthMm}mm;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page {
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            padding: 1mm;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            overflow: hidden;
        }

        .page:last-child {
            page-break-after: auto;
        }

        @media screen {
            body {
                background: #e5e5e5;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                padding: 24px;
                width: auto;
            }

            .page {
                background: #fff;
                box-shadow: 0 1px 4px rgba(0,0,0,0.15);
                border-radius: 2px;
            }
        }

        @media print {
            body {
                background: none;
            }
        }

        img {
            display: block;
        }
    </style>
</head>
<body>
    ${labelsHtml.map((html) => `<div class="page">${html}</div>`).join("\n")}
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
            }, 300);
        };
    </script>
</body>
</html>`;
}

export interface PrintLabelOptions {
    labelSize: LabelSize;
    dpi?: number;
}

export async function printLabel(label: LabelData, options: PrintLabelOptions): Promise<void> {
    return printLabels([label], options);
}

export async function printLabels(labels: LabelData[], options: PrintLabelOptions): Promise<void> {
    const { labelSize, dpi = 300 } = options;
    const qrPixelSize = getQrPixelSize(labelSize, dpi);

    const qrImages = await Promise.all(
        labels.map((label) =>
            generateQRCode(label.qrCode, {
                errorCorrectionLevel: "H",
                type: "image/png",
                width: qrPixelSize,
                margin: 1,
            })
        ),
    );

    const labelsHtml = labels.map((label, i) => buildLabelHtml(label, labelSize, qrImages[i]));
    const doc = buildPrintDocument(labelsHtml, labelSize);

    const printWindow = window.open("", "_blank");
    if (!printWindow) throw new Error("popup_blocked");

    printWindow.document.write(doc);
    printWindow.document.close();
}
