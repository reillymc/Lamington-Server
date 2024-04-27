import { v4 as Uuid } from "uuid";

import db, { CreateQuery, CreateResponse, ReadQuery, ReadResponse, Tag, lamington, tag } from "../database";
import { EnsureArray, Undefined } from "../utils";

/**
 * Get all tags
 * @returns an array of all tags in the database
 */
const readAllTags = async (): ReadResponse<Tag> =>
    db<Tag>(lamington.tag).select("tagId", "parentId", "name", "description");

interface GetCategoryParams {
    id: string;
}

/**
 * Get tags by id or ids
 * @returns an array of tags matching given ids
 */
const readTags = async (params: ReadQuery<GetCategoryParams>): ReadResponse<Tag> => {
    const categoryIds = EnsureArray(params).map(({ id }) => id);

    return db<Tag>(lamington.tag).select("tagId", "parentId", "name", "description").whereIn(tag.tagId, categoryIds);
};

/**
 * Create tags
 * @param tags a list of category objects
 * @returns the list of newly created category ids
 */
const createTags = async (params: CreateQuery<Partial<Tag>>): CreateResponse<Tag> => {
    const data: Tag[] = EnsureArray(params)
        .map(({ tagId = Uuid(), name, ...tag }) => {
            if (!name) return undefined;
            return { tagId, name, ...tag };
        })
        .filter(Undefined);

    if (!data.length) return [];

    return db<Tag>(lamington.tag).insert(data).onConflict("tagId").ignore().returning("tagId");
};

export type TagActions = typeof TagActions;

export const TagActions = {
    readAll: readAllTags,
    save: createTags,
};
