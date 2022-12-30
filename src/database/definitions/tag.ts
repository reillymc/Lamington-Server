import { Table } from ".";

/**
 * Tag
 */
export interface Tag {
    tagId: string;
    name: string;
    description: string | undefined;
    parentId: string | undefined;
}

export const tag: Table<Tag> = {
    tagId: "tag.tagId",
    name: "tag.name",
    description: "tag.description",
    parentId: "tag.parentId",
} as const;
