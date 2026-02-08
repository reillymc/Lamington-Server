import { EnsureArray } from "../../../../utils/index.ts";
import type { ContentTag } from "../../../temp.ts";
import type { KnexDatabase } from "../../knex.ts";
import { ContentTagTable, lamington, TagTable } from "../../spec/index.ts";

export const ContentTagActions = {
    readByContentId: async (
        db: KnexDatabase,
        contentIds: string | string[],
    ) => {
        const contentIdList = EnsureArray(contentIds);

        return db(lamington.tag)
            .select(
                ContentTagTable.tagId,
                TagTable.parentId,
                TagTable.name,
                ContentTagTable.contentId,
            )
            .whereIn(ContentTagTable.contentId, contentIdList)
            .leftJoin(
                lamington.contentTag,
                ContentTagTable.tagId,
                TagTable.tagId,
            )
            .union((qb) =>
                qb
                    .select(
                        TagTable.tagId,
                        TagTable.parentId,
                        TagTable.name,
                        ContentTagTable.contentId,
                    )
                    .leftJoin(
                        lamington.contentTag,
                        ContentTagTable.tagId,
                        TagTable.tagId,
                    )
                    .from(lamington.tag)
                    .whereIn(
                        TagTable.tagId,
                        db
                            .select(TagTable.parentId)
                            .from(lamington.tag)
                            .whereIn(ContentTagTable.contentId, contentIdList)
                            .leftJoin(
                                lamington.contentTag,
                                ContentTagTable.tagId,
                                TagTable.tagId,
                            ),
                    ),
            );
    },
    save: async (
        db: KnexDatabase,
        items: Array<{
            contentId: string;
            tags: ReadonlyArray<{ tagId: string }>;
        }>,
    ) => {
        for (const { contentId, tags } of items) {
            await db<ContentTag>(lamington.contentTag)
                .where({ contentId })
                .whereNotIn(
                    "tagId",
                    tags.map(({ tagId }) => tagId),
                )
                .del();
        }

        const tagsToInsert = items.flatMap(({ contentId, tags }) =>
            tags.map(({ tagId }) => ({ contentId, tagId })),
        );

        if (tagsToInsert.length) {
            await db<ContentTag>(lamington.contentTag)
                .insert(tagsToInsert)
                .onConflict(["contentId", "tagId"])
                .merge();
        }
    },
};
