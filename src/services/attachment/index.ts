import path from "path";
import sharp from "sharp";

import config from "../../config";
import { S3Attachment } from "./s3";
import { LocalAttachment } from "./local";
import { ImgurAttachment } from "./imgur";
import { compressImage, deconstructUrl, unsavedImagePath, imagePath } from "./helper";

const isUnsavedImage = (userId: string, entity: string, url: string | undefined) => {
    if (!url) return false;

    const { filePath } = deconstructUrl(url);

    const unsavedPath = unsavedImagePath(userId, entity);

    return filePath === unsavedPath;
};

const uploadImage = async (file: Buffer, userId: string, entity: string, name: string | undefined = ".jpg") => {
    const compressedImage = await compressImage(file);
    const imagePath = unsavedImagePath(userId, entity);

    switch (config.attachments.storageService) {
        case "local":
            await LocalAttachment.upload(compressedImage, imagePath);
            return `lamington:${imagePath}`;
        case "imgur":
            const uploadResponse = await ImgurAttachment.upload(compressedImage);
            return `imgur:${uploadResponse.id}${path.extname(name)}`;
        case "s3":
            await S3Attachment.upload(compressedImage, imagePath);
            return `s3:${imagePath}`;
    }
};

const deleteImage = async (url: string) => {
    const { service, filePath } = deconstructUrl(url);

    if (!filePath) return;

    switch (service) {
        case "lamington":
            LocalAttachment.delete(filePath);
            break;
        case "imgur":
            break;
        case "s3":
            S3Attachment.delete(filePath);
            break;
    }
};

const saveImage = async (userId: string, entity: string, entityId: string, currentUri: string | undefined) => {
    let destinationPath: string | undefined;
    const version = (parseInt(currentUri?.split(".jpg")[0]?.split("_")[1] ?? "-1", 10) + 1) % 16;

    switch (config.attachments.storageService) {
        case "local":
            destinationPath = LocalAttachment.move(userId, entity, entityId, version);
            return `lamington:${destinationPath}`;
        case "imgur":
            break;
        case "s3":
            destinationPath = S3Attachment.move(userId, entity, entityId, version);
            return `s3:${destinationPath}`;
    }
};

export const AttachmentService = {
    uploadImage,
    deleteImage,
    saveImage,
    isUnsavedImage,
    imagePath,
};
