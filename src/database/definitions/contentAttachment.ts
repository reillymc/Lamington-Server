import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * ContentAttachment
 *
 * Contains the mapping of each of the content's attachments.
 */
export interface ContentAttachment {
    attachmentId: string;
    uri: string;
    displayType: string;
    displayId: string;
    displayOrder: number;
    contentId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export const contentAttachment: Table<ContentAttachment> = {
    attachmentId: `${lamington.contentAttachment}.attachmentId`,
    uri: `${lamington.contentAttachment}.uri`,
    displayType: `${lamington.contentAttachment}.displayType`,
    displayId: `${lamington.contentAttachment}.displayId`,
    displayOrder: `${lamington.contentAttachment}.displayOrder`,
    contentId: `${lamington.contentAttachment}.contentId`,
    createdBy: `${lamington.contentAttachment}.createdBy`,
    createdAt: `${lamington.contentAttachment}.createdAt`,
    updatedAt: `${lamington.contentAttachment}.updatedAt`,
};
