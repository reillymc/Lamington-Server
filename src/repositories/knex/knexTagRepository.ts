import { EnsureArray } from "../../utils/index.ts";
import type { TagRepository } from "../tagRepository.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import type { KnexDatabase } from "./knex.ts";
import { lamington, TagTable } from "./spec/index.ts";

export const KnexTagRepository: TagRepository<KnexDatabase> = {
    readAll: async (db) => {
        const result = await db(lamington.tag).select(
            TagTable.tagId,
            TagTable.parentId,
            TagTable.name,
            TagTable.description,
        );

        return result.map((tag) => ({
            tagId: tag.tagId,
            parentId: toUndefined(tag.parentId),
            name: tag.name,
            description: toUndefined(tag.description),
        }));
    },
    create: async (db, params) =>
        db(lamington.tag)
            .insert(
                EnsureArray(params).map(
                    ({ name, tagId, description, parentId }) => ({
                        name,
                        tagId,
                        description,
                        parentId,
                    }),
                ),
            )
            .returning([
                TagTable.tagId,
                TagTable.parentId,
                TagTable.name,
                TagTable.description,
            ]),
};
