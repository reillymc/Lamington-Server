import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexIngredientRepository } from "../../src/repositories/knex/knexIngredientRepository.ts";
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

/**
 * Tests that fall outside the scope of what is possible via the API but still valid internal use cases
 */
describe("RecipeRepository", () => {
    describe("read", () => {
        it("should return recipes in request order with correct details", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const {
                ingredients: [ingredientA, ingredientB],
            } = await KnexIngredientRepository.create(database, {
                userId,
                ingredients: [
                    { name: "ingredientA", namePlural: "ingredientsA" },
                    { name: "ingredientB", namePlural: "ingredientsB" },
                ],
            });

            const {
                recipes: [subRecipe],
            } = await KnexRecipeRepository.create(database, {
                userId,
                recipes: [{ name: "subRecipe" }],
            });

            const [tagA, tagB] = await KnexTagRepository.create(database, [
                { name: "tagA" },
                { name: "tagB" },
            ]);

            const {
                recipes: [recipe1, recipe2, recipe3],
            } = await KnexRecipeRepository.create(database, {
                userId,
                recipes: [
                    {
                        name: "recipe1",
                        tags: [{ tagId: tagA!.tagId }],
                        ingredients: [
                            {
                                items: [
                                    {
                                        ingredient: {
                                            ingredientId:
                                                ingredientA!.ingredientId,
                                        },
                                    },
                                    {
                                        recipe: {
                                            recipeId: subRecipe!.recipeId,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: "recipe2",
                        tags: [{ tagId: tagB!.tagId }],
                        ingredients: [
                            {
                                items: [
                                    {
                                        ingredient: {
                                            ingredientId:
                                                ingredientB!.ingredientId,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    { name: "recipe3" },
                ],
            });

            const { recipes } = await KnexRecipeRepository.read(database, {
                userId,
                recipes: [
                    { recipeId: recipe3!.recipeId },
                    { recipeId: recipe1!.recipeId },
                    { recipeId: recipe2!.recipeId },
                ],
            });

            expect(recipes.map(({ recipeId }) => recipeId)).toEqual([
                recipe3!.recipeId,
                recipe1!.recipeId,
                recipe2!.recipeId,
            ]);

            const [recipe3Response, recipe1Response, recipe2Response] = recipes;

            expect(recipe3Response!.tags).toBeUndefined();

            expect(Object.keys(recipe1Response!.tags ?? {})).toEqual([
                tagA!.tagId,
            ]);
            const recipe1Items = recipe1Response!.ingredients![0]!.items;
            expect(recipe1Items[0]!).toMatchObject({
                ingredient: { name: "ingredientA", namePlural: "ingredientsA" },
            });
            expect(recipe1Items[1]!).toMatchObject({
                recipe: { name: "subRecipe" },
            });

            expect(Object.keys(recipe2Response!.tags ?? {})).toEqual([
                tagB!.tagId,
            ]);
            expect(recipe2Response!.ingredients![0]!.items[0]!).toMatchObject({
                ingredient: {
                    name: "ingredientB",
                    namePlural: "ingredientsB",
                },
            });
        });

        it("should skip recipes that do not exist", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const {
                recipes: [recipeA, recipeB],
            } = await KnexRecipeRepository.create(database, {
                userId,
                recipes: [{ name: uuid() }, { name: uuid() }],
            });

            const { recipes } = await KnexRecipeRepository.read(database, {
                userId,
                recipes: [
                    { recipeId: recipeA!.recipeId },
                    { recipeId: uuid() },
                    { recipeId: recipeB!.recipeId },
                ],
            });

            expect(recipes.map(({ recipeId }) => recipeId)).toEqual([
                recipeA!.recipeId,
                recipeB!.recipeId,
            ]);
        });

        it("should return an empty array for an empty request", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const { recipes } = await KnexRecipeRepository.read(database, {
                userId,
                recipes: [],
            });

            expect(recipes).toEqual([]);
        });
    });

    describe("update", () => {
        it("should update recipes in a single call without affecting other recipes", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(database);

            const {
                recipes: [recipeA, recipeB],
            } = await KnexRecipeRepository.create(database, {
                userId,
                recipes: [
                    { name: uuid(), summary: "original-a", prepTime: 5 },
                    { name: uuid(), summary: "original-b", prepTime: 10 },
                ],
            });

            const { recipes } = await KnexRecipeRepository.update(database, {
                userId,
                recipes: [
                    {
                        recipeId: recipeA!.recipeId,
                        name: "updated-a",
                        prepTime: 20,
                    },
                    { recipeId: recipeB!.recipeId, summary: "updated-b" },
                ],
            });

            expect(recipes.map(({ recipeId }) => recipeId)).toEqual([
                recipeA!.recipeId,
                recipeB!.recipeId,
            ]);

            const recipesById = Object.fromEntries(
                recipes.map((recipe) => [recipe.recipeId, recipe]),
            );

            expect(recipesById[recipeA!.recipeId]!.name).toEqual("updated-a");
            expect(recipesById[recipeA!.recipeId]!.prepTime).toEqual(20);
            expect(recipesById[recipeA!.recipeId]!.summary).toEqual(
                "original-a",
            );

            expect(recipesById[recipeB!.recipeId]!.name).toEqual(recipeB!.name);
            expect(recipesById[recipeB!.recipeId]!.prepTime).toEqual(10);
            expect(recipesById[recipeB!.recipeId]!.summary).toEqual(
                "updated-b",
            );
        });
    });
});
