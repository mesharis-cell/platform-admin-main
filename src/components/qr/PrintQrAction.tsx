"use client";

import { useState, type ComponentProps, type MouseEvent } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateQRCode } from "@/lib/services/qr-code";

type ButtonProps = ComponentProps<typeof Button>;

interface PrintQrActionProps {
    qrCode?: string | null;
    assetName?: string;
    className?: string;
    variant?: ButtonProps["variant"];
    size?: ButtonProps["size"];
    iconOnly?: boolean;
}

export function PrintQrAction({
    qrCode,
    assetName,
    className,
    variant = "ghost",
    size = "icon",
    iconOnly = true,
}: PrintQrActionProps) {
    const [isPrinting, setIsPrinting] = useState(false);

    if (!qrCode) return null;

    const handlePrint = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsPrinting(true);

        try {
            const qrCodeImage = await generateQRCode(qrCode);
            const printWindow = window.open("", "_blank");
            if (!printWindow) {
                toast.error("Please allow pop-ups to print QR codes");
                return;
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>QR Code - ${assetName || qrCode}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: "Courier New", monospace;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            padding: 20px;
                        }
                        .container {
                            text-align: center;
                            border: 2px solid #000;
                            padding: 30px;
                            background: #fff;
                        }
                        .asset-name { font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #000; }
                        .qr-image {
                            width: 200px;
                            height: 200px;
                            border: 1px solid #ccc;
                            padding: 10px;
                            background: #fff;
                        }
                        .qr-code { font-size: 12px; margin-top: 15px; color: #666; }
                        @media print {
                            body { padding: 0; }
                            .container { border: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="asset-name">${assetName || "Asset QR"}</div>
                        <img src="${qrCodeImage}" alt="QR Code" class="qr-image" />
                        <div class="qr-code">${qrCode}</div>
                    </div>
                    <script>
                        window.onload = function () {
                            window.print();
                            window.onafterprint = function () { window.close(); };
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            toast.error("Failed to print QR code");
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            onClick={handlePrint}
            title="Print QR code"
            aria-label="Print QR code"
            disabled={isPrinting}
        >
            <Printer className="h-4 w-4" />
            {!iconOnly && (
                <span className="ml-2">{isPrinting ? "Printing..." : "Print QR Code"}</span>
            )}
        </Button>
    );
}
