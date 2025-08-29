import sharp from "sharp";
import config from "../../config.ts";

export const compressImage = (file: Buffer) =>
    sharp(file)
        .toFormat("jpeg", { mozjpeg: true, quality: 60 })
        .resize({ width: 2048, height: 2048, fit: "inside" })
        .rotate()
        .withMetadata()
        .toBuffer();

export const unsavedImagePath = (userId: string, entity: string) =>
    `${config.attachments.path}/${userId}/${entity}/unsaved.jpg`;

export const imagePath = (userId: string, entity: string, entityId: string, version: number) =>
    `${config.attachments.path}/${userId}/${entity}/${entityId}_${version}.jpg`;

export const deconstructUrl = (url: string) => {
    const [service, filePath] = url.split(":");
    return { service, filePath };
};
