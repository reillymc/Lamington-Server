export const buildAttachmentPath = (
    attachmentId: string,
    keyPrefix?: string,
): string => (keyPrefix ? `${keyPrefix}/${attachmentId}` : attachmentId);
