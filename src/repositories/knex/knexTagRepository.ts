import { tag } from "../../database/definitions/tag.ts";
import { type KnexDatabase, lamington } from "../../database/index.ts";
import { EnsureArray } from "../../utils/index.ts";
import type { TagRepository } from "../tagRepository.ts";

export const KnexTagRepository: TagRepository<KnexDatabase> = {
    readAll: (db) =>
        db(lamington.tag).select(
            tag.tagId,
            tag.parentId,
            tag.name,
            tag.description,
        ),
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
            .returning([tag.tagId, tag.parentId, tag.name, tag.description]),
};
