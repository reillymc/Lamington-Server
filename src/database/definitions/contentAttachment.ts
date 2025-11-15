import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * ContentAttachment
 *
 * Contains the mapping of content's attachments, including display metadata
 */
export interface ContentAttachment {
    contentId: string;
    attachmentId: string;
    displayType: string;
    displayId: string;
    displayOrder: number;
}

export const contentAttachment: Table<ContentAttachment> = {
    contentId: `${lamington.contentAttachment}.contentId`,
    attachmentId: `${lamington.contentAttachment}.attachmentId`,
    displayType: `${lamington.contentAttachment}.displayType`,
    displayId: `${lamington.contentAttachment}.displayId`,
    displayOrder: `${lamington.contentAttachment}.displayOrder`,
};
