import { v4 as Uuid } from "uuid";

import db, { Tag, tag, CreateQuery, CreateResponse, lamington, ReadQuery, ReadResponse } from "../database";
import { Undefined } from "../utils";

/**
 * Get all tags
 * @returns an array of all tags in the database
 */
const readAllTags = async (): ReadResponse<Tag> => {
    const query = db<Tag>(lamington.tag).select("*");
    return query;
};

interface GetCategoryParams {
    id: string;
}

/**
 * Get tags by id or ids
 * @returns an array of tags matching given ids
 */
const readTags = async (params: ReadQuery<GetCategoryParams>): ReadResponse<Tag> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const categoryIds = params.map(({ id }) => id);

    const query = db<Tag>(lamington.tag).select("*").whereIn(tag.tagId, categoryIds);
    return query;
};

/**
 * Create tags
 * @param tags a list of category objects
 * @returns the list of newly created category ids
 */
const createTags = async (tags: CreateQuery<Partial<Tag>>): CreateResponse<Tag> => {
    if (!Array.isArray(tags)) {
        tags = [tags];
    }
    const data: Tag[] = tags
        .map(({ tagId = Uuid(), name, description, parentId }) => {
            if (!name) return undefined;
            return {
                tagId,
                name,
                description,
                parentId,
            };
        })
        .filter(Undefined);

    if (!data.length) return [];

    const result = await db(lamington.tag).insert(data).onConflict([tag.tagId]).ignore();

    const tagIds = data.map(({ tagId }) => tagId);

    const query = db<Tag>(lamington.tag).select("*").whereIn(tag.tagId, tagIds);
    return query;
};

export type TagActions = typeof TagActions;

export const TagActions = {
    readAll: readAllTags,
    save: createTags,
};
