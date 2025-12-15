import type { Table, User } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * Content
 *
 * Content is the base entity for user created content.
 * Content items can have attachments, tags, notes, and members.
 * Entities will extend content by referencing contentId.
 */
export interface Content {
    contentId: string;
    createdBy: User["userId"];
    createdAt: string;
    updatedAt: string;
}

export const content: Table<Content> = {
    contentId: `${lamington.content}.contentId`,
    createdBy: `${lamington.content}.createdBy`,
    createdAt: `${lamington.content}.createdAt`,
    updatedAt: `${lamington.content}.updatedAt`,
};
