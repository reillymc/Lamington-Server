import { EnsureArray } from "@reillymc/es-utils";
import type { ContentTag } from "../../../temp.ts";
import type { KnexDatabase } from "../../knex.ts";
import { ContentTagTable, lamington, TagTable } from "../../spec/index.ts";

export const ContentTagActions = {
    readByContentId: async (
        db: KnexDatabase,
        contentIds: string | ReadonlyArray<string>,
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
        if (!items.length) return;

        await db<ContentTag>(lamington.contentTag)
            .whereIn(
                ContentTagTable.contentId,
                items.map(({ contentId }) => contentId),
            )
            .del();

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
