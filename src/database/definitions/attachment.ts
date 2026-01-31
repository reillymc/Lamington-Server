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

export const attachmentColumns = [
    "attachmentId",
    "uri",
    "createdBy",
    "createdAt",
    "updatedAt",
] as const satisfies (keyof Attachment)[];

export const attachment = Object.fromEntries(
    attachmentColumns.map((column) => [
        column,
        `${lamington.attachment}.${column}`,
    ]),
) as Table<Attachment>;
