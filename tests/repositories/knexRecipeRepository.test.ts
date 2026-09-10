import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import {
    beginTestTransaction,
    repositories,
    rollbackTestTransaction,
    withCxIt,
} from "../helpers/setup.ts";

beforeEach(async () => {
    await beginTestTransaction();
});

afterEach(async () => {
    await rollbackTestTransaction();
});

/**
 * Tests that fall outside the scope of what is possible via the API but still valid internal use cases
 */
describe("RecipeRepository", () => {
    describe("read", () => {
        withCxIt(
            "should return recipes in request order with correct details",
            async () => {
                const [, { userId }] = await PrepareAuthenticatedUser(
                    repositories.userRepository,
                );

                const {
                    ingredients: [ingredientA, ingredientB],
                } = await repositories.ingredientRepository.create({
                    userId,
                    ingredients: [
                        { name: "ingredientA", namePlural: "ingredientsA" },
                        { name: "ingredientB", namePlural: "ingredientsB" },
                    ],
                });

                const {
                    recipes: [subRecipe],
                } = await repositories.recipeRepository.create({
                    userId,
                    recipes: [{ name: "subRecipe" }],
                });

                const [tagA, tagB] = await repositories.tagRepository.create([
                    { name: "tagA" },
                    { name: "tagB" },
                ]);

                const {
                    recipes: [recipe1, recipe2, recipe3],
                } = await repositories.recipeRepository.create({
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

                const { recipes } = await repositories.recipeRepository.read({
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

                const [recipe3Response, recipe1Response, recipe2Response] =
                    recipes;

                expect(recipe3Response!.tags).toBeUndefined();

                expect(Object.keys(recipe1Response!.tags ?? {})).toEqual([
                    tagA!.tagId,
                ]);
                const recipe1Items = recipe1Response!.ingredients![0]!.items;
                expect(recipe1Items[0]!).toMatchObject({
                    ingredient: {
                        name: "ingredientA",
                        namePlural: "ingredientsA",
                    },
                });
                expect(recipe1Items[1]!).toMatchObject({
                    recipe: { name: "subRecipe" },
                });

                expect(Object.keys(recipe2Response!.tags ?? {})).toEqual([
                    tagB!.tagId,
                ]);
                expect(
                    recipe2Response!.ingredients![0]!.items[0]!,
                ).toMatchObject({
                    ingredient: {
                        name: "ingredientB",
                        namePlural: "ingredientsB",
                    },
                });
            },
        );

        withCxIt("should skip recipes that do not exist", async () => {
            const [, { userId }] = await PrepareAuthenticatedUser(
                repositories.userRepository,
            );

            const {
                recipes: [recipeA, recipeB],
            } = await repositories.recipeRepository.create({
                userId,
                recipes: [{ name: uuid() }, { name: uuid() }],
            });

            const { recipes } = await repositories.recipeRepository.read({
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

        withCxIt(
            "should return an empty array for an empty request",
            async () => {
                const [, { userId }] = await PrepareAuthenticatedUser(
                    repositories.userRepository,
                );

                const { recipes } = await repositories.recipeRepository.read({
                    userId,
                    recipes: [],
                });

                expect(recipes).toEqual([]);
            },
        );
    });

    describe("update", () => {
        withCxIt(
            "should update recipes in a single call without affecting other recipes",
            async () => {
                const [, { userId }] = await PrepareAuthenticatedUser(
                    repositories.userRepository,
                );

                const {
                    recipes: [recipeA, recipeB],
                } = await repositories.recipeRepository.create({
                    userId,
                    recipes: [
                        { name: uuid(), summary: "original-a", prepTime: 5 },
                        { name: uuid(), summary: "original-b", prepTime: 10 },
                    ],
                });

                const { recipes } = await repositories.recipeRepository.update({
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

                expect(recipesById[recipeA!.recipeId]!.name).toEqual(
                    "updated-a",
                );
                expect(recipesById[recipeA!.recipeId]!.prepTime).toEqual(20);
                expect(recipesById[recipeA!.recipeId]!.summary).toEqual(
                    "original-a",
                );

                expect(recipesById[recipeB!.recipeId]!.name).toEqual(
                    recipeB!.name,
                );
                expect(recipesById[recipeB!.recipeId]!.prepTime).toEqual(10);
                expect(recipesById[recipeB!.recipeId]!.summary).toEqual(
                    "updated-b",
                );
            },
        );
    });
});
