import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import { ContentTagActions } from "../../src/repositories/knex/common/repositoryMethods/contentTag.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import { KnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import { db } from "../helpers/setup.ts";

let database: KnexDatabase;

beforeEach(async () => {
    database = await db.transaction();
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

describe("ContentTagActions.readByContentId", () => {
    it("groups direct tags under their parents per content", async () => {
        const [, { userId }] = await PrepareAuthenticatedUser(database);

        const [parentTag] = await KnexTagRepository.create(database, {
            name: "parent",
        });

        const [childTag] = await KnexTagRepository.create(database, {
            name: "child",
            parentId: parentTag!.tagId,
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId,
            recipes: [{ name: "recipe", tags: [{ tagId: childTag!.tagId }] }],
        });

        const tagsByContentId = await ContentTagActions.readByContentId(
            database,
            [recipe!.recipeId],
        );

        expect(tagsByContentId.get(recipe!.recipeId)).toEqual({
            [parentTag!.tagId]: {
                tagId: parentTag!.tagId,
                name: parentTag!.name,
                tags: [{ tagId: childTag!.tagId, name: childTag!.name }],
            },
        });
    });

    it("does not duplicate a tag that is both a direct tag and a parent", async () => {
        const [, { userId }] = await PrepareAuthenticatedUser(database);

        const [parentTag] = await KnexTagRepository.create(database, {
            name: "parent",
        });

        const [childTag] = await KnexTagRepository.create(database, {
            name: "child",
            parentId: parentTag!.tagId,
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId,
            recipes: [
                {
                    name: "recipe",
                    tags: [
                        { tagId: childTag!.tagId },
                        { tagId: parentTag!.tagId },
                    ],
                },
            ],
        });

        const tagsByContentId = await ContentTagActions.readByContentId(
            database,
            [recipe!.recipeId],
        );

        expect(tagsByContentId.get(recipe!.recipeId)).toEqual({
            [parentTag!.tagId]: {
                tagId: parentTag!.tagId,
                name: parentTag!.name,
                tags: [{ tagId: childTag!.tagId, name: childTag!.name }],
            },
        });
    });
});
