import QRCode from "qrcode";

export interface QRCodeOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    type?: "image/png";
    width?: number;
    margin?: number;
}

const DEFAULT_OPTIONS: QRCodeOptions = {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 300,
    margin: 2,
};

export const generateQRCode = async (qrCode: string, options?: QRCodeOptions): Promise<string> => {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const qrCodeImage = await QRCode.toDataURL(qrCode, {
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
        type: mergedOptions.type,
        width: mergedOptions.width,
        margin: mergedOptions.margin,
    });

    return qrCodeImage;
};
