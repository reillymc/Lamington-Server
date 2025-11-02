import { type Table } from "./index.ts";

/**
 * Tag
 */
export interface Tag {
    tagId: string;
    name: string;
    description?: string;
    parentId?: string;
}

export const tag: Table<Tag> = {
    tagId: "tag.tagId",
    name: "tag.name",
    description: "tag.description",
    parentId: "tag.parentId",
} as const;
