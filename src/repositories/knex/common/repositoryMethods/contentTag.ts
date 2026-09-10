import { EnsureArray } from "@reillymc/es-utils";
import type { Knex } from "knex";
import type { ReadTagsResponse } from "../../../recipeRepository.ts";
import type { ContentTag } from "../../../temp.ts";
import { ContentTagTable, lamington, TagTable } from "../../spec/index.ts";

type TagRow = {
    tagId: string;
    parentId: string | null;
    name: string;
};

const groupToResponse = (tags: ReadonlyArray<TagRow>): ReadTagsResponse =>
    tags.reduce<ReadTagsResponse>((acc, { tagId, parentId, name }) => {
        if (parentId) {
            acc[parentId] = {
                ...acc[parentId],
                tagId: parentId,
                name: acc[parentId]?.name,
                tags: [...(acc[parentId]?.tags ?? []), { tagId, name }],
            };
        } else {
            acc[tagId] = {
                ...acc[tagId],
                tagId,
                name,
                tags: acc[tagId]?.tags,
            };
        }
        return acc;
    }, {});

export const ContentTagActions = {
    readByContentId: async (
        db: Knex,
        contentIds: string | ReadonlyArray<string>,
    ): Promise<Map<string, ReadTagsResponse>> => {
        const contentIdList = EnsureArray(contentIds);

        const directTagIds = () =>
            db(lamington.contentTag)
                .select(ContentTagTable.tagId)
                .whereIn(ContentTagTable.contentId, contentIdList);

        const parentTagIds = () =>
            db(lamington.tag)
                .select(TagTable.parentId)
                .distinct()
                .join(
                    lamington.contentTag,
                    TagTable.tagId,
                    ContentTagTable.tagId,
                )
                .whereIn(ContentTagTable.contentId, contentIdList)
                .whereNotNull(TagTable.parentId);

        const rows: Array<TagRow & { contentId: string | null }> = await db(
            lamington.tag,
        )
            .select(
                ContentTagTable.contentId,
                TagTable.tagId,
                TagTable.parentId,
                TagTable.name,
            )
            .leftJoin(lamington.contentTag, (builder) =>
                builder
                    .on(TagTable.tagId, ContentTagTable.tagId)
                    .andOnIn(ContentTagTable.contentId, contentIdList),
            )
            .where((builder) =>
                builder
                    .whereIn(TagTable.tagId, directTagIds())
                    .orWhereIn(TagTable.tagId, parentTagIds()),
            );

        const groups = new Map<string, TagRow[]>();
        const parents = new Map<string, TagRow>();

        for (const row of rows) {
            const { contentId, ...tag } = row;
            if (contentId === null) {
                parents.set(tag.tagId, tag);
            } else {
                groups.set(contentId, [...(groups.get(contentId) ?? []), tag]);
            }
        }

        for (const groupTags of groups.values()) {
            const parentIds = new Set(
                groupTags.flatMap(({ parentId }) =>
                    parentId ? [parentId] : [],
                ),
            );
            for (const parentId of parentIds) {
                const parent = parents.get(parentId);
                if (parent) groupTags.push(parent);
            }
        }

        return new Map(
            [...groups.entries()].map(([contentId, tags]) => [
                contentId,
                groupToResponse(tags),
            ]),
        );
    },
    save: async (
        db: Knex,
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
