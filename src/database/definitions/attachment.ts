import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * Attachment
 *
 * External file references used by content
 */
export interface Attachment {
    attachmentId: string;
    uri: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export const attachment = {
    attachmentId: `${lamington.attachment}.attachmentId`,
    uri: `${lamington.attachment}.uri`,
    createdBy: `${lamington.attachment}.createdBy`,
    createdAt: `${lamington.attachment}.createdAt`,
    updatedAt: `${lamington.attachment}.updatedAt`,
} as const satisfies Table<Attachment>;
