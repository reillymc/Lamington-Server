import sharp from "sharp";
import config from "../../config.ts";

export const compressImage = (file: Buffer) =>
    sharp(file)
        .toFormat("jpeg", { mozjpeg: true, quality: 60 })
        .resize({ width: 2048, height: 2048, fit: "inside" })
        .rotate()
        .withMetadata()
        .toBuffer();

export const constructAttachmentPath = (
    userId: string,
    attachmentId: string,
    extension: string,
) => {
    const uploadPath = `${config.attachments.path}/${userId}/${attachmentId}.${extension}`;
    const uri = `${config.attachments.storageService}:${uploadPath}`;
    return { uri, uploadPath };
};

export const deconstructAttachmentUri = (uri: string) => {
    const [service, filePath] = uri.split(":");
    return { service, filePath };
};
