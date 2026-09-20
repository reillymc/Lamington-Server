import { buildAttachmentPath } from "./attachmentPath.ts";

export type AttachmentUri = (attachmentId: string) => string;

export const defaultAttachmentUri: AttachmentUri = (attachmentId) =>
    `/v1/attachments/image/${attachmentId}`;

export const createPublicAttachmentUri = (
    publicBaseUrl: string,
    keyPrefix?: string,
): AttachmentUri => {
    return (attachmentId) =>
        `${publicBaseUrl}/${buildAttachmentPath(attachmentId, keyPrefix)}`;
};

type Attachment = { attachmentId: string; preview?: string };

type AttachmentField<T> = {
    [K in keyof T]-?: NonNullable<T[K]> extends Attachment ? K : never;
}[keyof T];

type Populated<T, K extends keyof T> = Omit<T, K> & {
    [P in K]: T[P] extends null | undefined ? T[P] : T[P] & { uri: string };
};

export type PopulateAttachmentUri = {
    <T extends { attachmentId: string }>(attachment: T): T & { uri: string };
    <T, K extends AttachmentField<T> & keyof T>(
        entity: T,
        key: K,
    ): Populated<T, K>;
};

export const createPopulateAttachmentUri = (
    attachmentUri: AttachmentUri,
): PopulateAttachmentUri => {
    const populate = (
        value: Record<string, unknown>,
        key?: string,
    ): unknown => {
        if (key === undefined) {
            const attachment = value as Attachment;

            return {
                ...attachment,
                uri: attachmentUri(attachment.attachmentId),
            };
        }

        const attachment = value[key] as Attachment | null | undefined;

        return {
            ...value,
            [key]: attachment
                ? { ...attachment, uri: attachmentUri(attachment.attachmentId) }
                : attachment,
        };
    };

    return populate as PopulateAttachmentUri;
};
