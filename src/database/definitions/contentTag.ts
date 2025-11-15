import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * ContentTag
 *
 * Contains the mapping of each of the content's tags.
 */
export interface ContentTag {
    contentId: string;
    tagId: string;
}

export const contentTag: Table<ContentTag> = {
    contentId: `${lamington.contentTag}.contentId`,
    tagId: `${lamington.contentTag}.tagId`,
};
