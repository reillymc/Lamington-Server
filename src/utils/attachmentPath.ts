import path from "node:path";

export const buildAttachmentPath = (
    attachmentId: string,
    keyPrefix?: string,
): string => (keyPrefix ? `${keyPrefix}/${attachmentId}` : attachmentId);

export const buildAttachmentDirectory = (
    uploadDirectory: string,
    keyPrefix?: string,
): string => path.join(uploadDirectory, keyPrefix ?? "");
