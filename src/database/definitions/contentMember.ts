import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * ContentMember
 */
export type ContentMember = {
    contentId: string;
    userId: string;
    status: string;
};

export const contentMember = {
    contentId: `${lamington.contentMember}.contentId`,
    userId: `${lamington.contentMember}.userId`,
    status: `${lamington.contentMember}.status`,
} as const satisfies Table<ContentMember>;
