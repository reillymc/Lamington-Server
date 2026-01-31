import { EnsureArray } from "../../../utils/index.ts";
import type { Tag } from "../../tagRepository.ts";
import type { Content, ContentTag } from "../../temp.ts";
import type { KnexDatabase } from "../knex.ts";
import { type CreateQuery, contentTag, lamington, tag } from "../spec/index.ts";

/**
 * Delete ContentTags from list of content tags
 * @param contentId to delete tags from
 * @param tagIds to delete
 * @returns count of rows affected/tags deleted?
 */
const _deleteContentTags = async (
    db: KnexDatabase,
    contentId: string,
    tagIds: string[],
) => {
    const result = await db<ContentTag>(lamington.contentTag)
        .del()
        .whereIn("tagId", tagIds)
        .andWhere({ contentId });

    return result;
};

/**
 * Delete all ContentTag rows for specified contentId EXCEPT for the list of tag ids provided
 * @param contentId content to run operation on
 * @param retainedCategoryIds tags to keep
 * @returns
 */
const deleteExcessRows = async (
    db: KnexDatabase,
    contentId: string,
    retainedCategoryIds: string[],
) =>
    db<ContentTag>(lamington.contentTag)
        .where({ contentId })
        .whereNotIn("tagId", retainedCategoryIds)
        .del();

/**
 * Create ContentTags provided
 * @param contentTags
 * @returns
 */
const insertRows = async (
    db: KnexDatabase,
    contentTags: CreateQuery<ContentTag>,
) =>
    db<ContentTag>(lamington.contentTag)
        .insert(contentTags)
        .onConflict(["contentId", "tagId"])
        .merge();

/**
 * Update ContentTags for contentId, by deleting all tags not in tag list and then creating / updating provided tags in list
 * @param contentId content to modify
 * @param contentTags tags to include in content
 */
const updateRows = async (
    db: KnexDatabase,
    params: CreateQuery<
        Pick<Content, "contentId"> & {
            tags: ReadonlyArray<Pick<ContentTag, "tagId">>;
        }
    >,
) => {
    const contentTags = EnsureArray(params);

    for (const contentTagList of contentTags) {
        await deleteExcessRows(
            db,
            contentTagList.contentId,
            contentTagList.tags.map(({ tagId }) => tagId),
        );
    }

    const tags = contentTags.flatMap(({ contentId, tags }) =>
        tags.map(({ tagId }) => ({ contentId, tagId })),
    );

    if (tags.length) await insertRows(db, tags);

    return [];
};

export type TagReadByContentIdResults = ReadonlyArray<
    ContentTag & Pick<Tag, "parentId" | "name">
>;

/**
 * Get all tags for a content
 * @param contentId content to retrieve tags from
 * @returns ContentTagResults
 */
const readByContentId = async (
    db: KnexDatabase,
    contentIds: string | string[],
): Promise<TagReadByContentIdResults> => {
    const contentIdList = Array.isArray(contentIds) ? contentIds : [contentIds];

    return db(lamington.tag)
        .select(contentTag.tagId, tag.parentId, tag.name, contentTag.contentId)
        .whereIn(contentTag.contentId, contentIdList)
        .leftJoin(lamington.contentTag, contentTag.tagId, tag.tagId)
        .union((qb) =>
            qb
                .select(tag.tagId, tag.parentId, tag.name, contentTag.contentId)
                .leftJoin(lamington.contentTag, contentTag.tagId, tag.tagId)
                .from(lamington.tag)
                .whereIn(
                    tag.tagId,
                    db
                        .select(tag.parentId)
                        .from(lamington.tag)
                        .whereIn(contentTag.contentId, contentIdList)
                        .leftJoin(
                            lamington.contentTag,
                            contentTag.tagId,
                            tag.tagId,
                        ),
                ),
        );
};

export type ContentTagActions = typeof ContentTagActions;

export const ContentTagActions = {
    readByContentId,
    save: updateRows,
};
