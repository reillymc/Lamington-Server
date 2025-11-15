import config from "../../config.ts";
import { deconstructAttachmentUri } from "./helper.ts";
import { LocalAttachment } from "./local.ts";
import { S3Attachment } from "./s3.ts";

const uploadImage = async (file: Buffer, path: string) => {
    switch (config.attachments.storageService) {
        case "local":
            return LocalAttachment.upload(file, path);
        case "s3":
            return S3Attachment.upload(file, path);
    }
};

const deleteImage = async (url: string) => {
    const { service, filePath } = deconstructAttachmentUri(url);

    if (!filePath) return;

    switch (service) {
        case "lamington":
            LocalAttachment.delete(filePath);
            break;
        case "s3":
            S3Attachment.delete(filePath);
            break;
    }
};

export const AttachmentService = {
    uploadImage,
    deleteImage,
};
