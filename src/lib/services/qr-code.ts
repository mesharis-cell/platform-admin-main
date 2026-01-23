import QRCode from "qrcode";

export const generateQRCode = async (qrCode: string): Promise<string> => {
    const qrCodeImage = await QRCode.toDataURL(qrCode, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
        margin: 2,
    });

    return qrCodeImage;
};
