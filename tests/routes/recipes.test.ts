import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import { KnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import type { components, paths } from "../../src/routes/spec/index.ts";
import {
    assertRecipeServingsAreEqual,
    assertRecipeTagsAreEqual,
    CreateUsers,
    createRandomRecipeTags,
    generateRandomRecipeIngredientSections,
    generateRandomRecipeMethodSections,
    generateRandomRecipeServings,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomElement,
    randomNumber,
    TEST_ITEM_COUNT,
} from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

let database: KnexDatabase;
let app: Express;

beforeEach(async () => {
    database = await db.transaction();
    app = createTestApp({ database });
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

describe("Get recipes", () => {
    it("should require authentication", async () => {
        const res = await request(app).get("/v1/recipes");

        expect(res.statusCode).toEqual(401);
    });

    it("should return correct recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user!.userId,
            recipes: [
                {
                    name: uuid(),
                    public: true,
                    cookTime: randomNumber(),
                    ingredients: generateRandomRecipeIngredientSections(),
                    method: generateRandomRecipeMethodSections(),
                    servings: generateRandomRecipeServings(),
                    prepTime: randomNumber(),
                    rating: randomNumber(),
                    source: uuid(),
                    timesCooked: randomNumber(),
                    tags: await createRandomRecipeTags(database),
                },
            ],
        });

        const _nonAssociatedTags = await createRandomRecipeTags(database);

        const res = await request(app).get("/v1/recipes").set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } = res.body;

        expect(data!.length).toEqual(1);

        const [recipeResponse] = data as components["schemas"]["Recipe"][];

        expect(recipeResponse!.recipeId).toEqual(recipe!.recipeId);
        expect(recipeResponse!.name).toEqual(recipe!.name);
        expect(recipeResponse!.owner.userId).toEqual(recipe!.owner.userId);
        expect(recipeResponse!.public).toEqual(recipe!.public);
        expect(recipeResponse!.cookTime).toEqual(recipe!.cookTime);
        expect(recipeResponse!.ingredients).toBeUndefined();
        expect(recipeResponse!.method).toBeUndefined();
        expect(recipeResponse!.tips).toEqual(recipe!.tips);
        expect(recipeResponse!.summary).toEqual(recipe!.summary);
        // expect(recipeResponse!.photo).toEqual(recipe!.photo);
        expect(recipeResponse!.prepTime).toEqual(recipe!.prepTime);
        expect(recipeResponse!.rating?.personal).toEqual(
            recipe!.rating!.personal,
        );
        expect(recipeResponse!.servings).toBeUndefined();
        expect(recipeResponse!.source).toBeUndefined();
        expect(recipeResponse!.timesCooked).toEqual(recipe!.timesCooked);
        expect(recipeResponse!.rating?.average).toEqual(
            recipe!.rating!.personal,
        );
        // expect(recipeResponse.createdAt).toBeDefined();

        assertRecipeTagsAreEqual(recipeResponse!.tags, recipe!.tags);
    });

    it("should return all public recipes from other users", async () => {
        const [token, _] = await PrepareAuthenticatedUser(database);
        const randomUsers = await CreateUsers(database, {
            count: randomNumber(),
        });
        const allCreatedRecipes = [];
        for (const user of randomUsers) {
            const { recipes } = await KnexRecipeRepository.create(database, {
                userId: user.userId,
                recipes: Array.from({ length: randomNumber(1, 3) }).map(() => ({
                    name: uuid(),
                    public: true,
                })),
            });
            allCreatedRecipes.push(...recipes);
        }

        const res = await request(app).get("/v1/recipes").set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } = res.body;

        expect(data!.length).toEqual(allCreatedRecipes.length);
    });

    it("should not return private recipes", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const randomUsers = await CreateUsers(database, {
            count: randomNumber(),
        });
        const otherUsersRecipes = [];
        for (const otherUser of randomUsers) {
            const { recipes } = await KnexRecipeRepository.create(database, {
                userId: otherUser.userId,
                recipes: Array.from({ length: randomNumber(1, 3) }).map(() => ({
                    name: uuid(),
                    public: randomBoolean(),
                })),
            });
            otherUsersRecipes.push(...recipes);
        }

        const { recipes: myRecipes } = await KnexRecipeRepository.create(
            database,
            {
                userId: user.userId,
                recipes: Array.from({ length: randomNumber() }).map(() => ({
                    name: uuid(),
                    public: randomBoolean(),
                })),
            },
        );

        const res = await request(app).get("/v1/recipes").set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } = res.body;

        const expectedCount =
            myRecipes.length +
            otherUsersRecipes.filter((recipe) => recipe.public).length;
        expect(data!.length).toEqual(expectedCount);
    });

    it("should filter recipes by owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const randomUsers = await CreateUsers(database, {
            count: randomNumber(),
        });

        for (const otherUser of randomUsers) {
            await KnexRecipeRepository.create(database, {
                userId: otherUser.userId,
                recipes: Array.from({ length: randomNumber(1, 3) }).map(() => ({
                    name: uuid(),
                    public: randomBoolean(),
                })),
            });
        }

        const { recipes: myRecipes } = await KnexRecipeRepository.create(
            database,
            {
                userId: user.userId,
                recipes: Array.from({ length: randomNumber() }).map(() => ({
                    name: uuid(),
                    public: randomBoolean(),
                })),
            },
        );

        const res = await request(app)
            .get("/v1/recipes")
            .query({ owner: user.userId })
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } = res.body;

        expect(data!.length).toEqual(myRecipes.length);
    });

    it("should respect pagination", async () => {
        const PAGE_SIZE = 50;

        const [token, _] = await PrepareAuthenticatedUser(database);
        const randomUsers = await CreateUsers(database, { count: 6 });
        for (const user of randomUsers) {
            await KnexRecipeRepository.create(database, {
                userId: user.userId,
                recipes: Array.from({ length: 10 }).map(() => ({
                    name: uuid(),
                    public: true,
                })),
            });
        }

        const res = await request(app).get("/v1/recipes").set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } =
            res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        expect(data!.length).toEqual(PAGE_SIZE);

        const resPage2 = await request(app)
            .get("/v1/recipes")
            .query({ page: 2 })
            .set(token);

        expect(resPage2.statusCode).toEqual(200);

        const { recipes: dataPage2 } =
            resPage2.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        expect(dataPage2!.length).toEqual(10);

        const page1Ids = data!.map((r) => r.recipeId);
        const duplicateRecipeKeys = dataPage2!.filter((r) =>
            page1Ids.includes(r.recipeId),
        );

        expect(duplicateRecipeKeys.length).toEqual(0);
    });

    it("should respect search", async () => {
        const [token, _] = await PrepareAuthenticatedUser(database);
        const randomUsers = await CreateUsers(database, {
            count: randomNumber(),
        });
        const allCreatedRecipes = [];
        for (const user of randomUsers) {
            const { recipes } = await KnexRecipeRepository.create(database, {
                userId: user.userId,
                recipes: Array.from({ length: randomNumber(1, 3) }).map(() => ({
                    name: uuid(),
                    public: true,
                })),
            });
            allCreatedRecipes.push(...recipes);
        }

        const recipeToSearchBy = randomElement(allCreatedRecipes)!;

        const res = await request(app)
            .get("/v1/recipes")
            .query({ search: recipeToSearchBy.name })
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } = res.body;

        const [recipe] = data!;

        expect(data!.length).toEqual(1);
        expect(recipe!.recipeId).toEqual(recipeToSearchBy.recipeId);
    });

    it("should respect substring search", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [
                { name: "Hardcoded Recipe Title To Search By", public: true },
                { name: "z", public: true },
            ],
        });

        const resPrefix = await request(app)
            .get("/v1/recipes")
            .query({ search: recipe!.name.substring(0, randomNumber() * 2) })
            .set(token);

        expect(resPrefix.statusCode).toEqual(200);

        const { recipes: dataPrefix } = resPrefix.body;

        expect(dataPrefix![0]!.recipeId).toEqual(recipe!.recipeId);

        const resSuffix = await request(app)
            .get("/v1/recipes")
            .query({ search: recipe!.name.substring(randomNumber()) })
            .set(token);

        expect(resSuffix.statusCode).toEqual(200);

        const { recipes: dataSuffix } = resSuffix.body;

        expect(dataSuffix![0]!.recipeId).toEqual(recipe!.recipeId);

        const resMiddle = await request(app)
            .get("/v1/recipes")
            .query({
                search: recipe!.name.substring(
                    randomNumber(10, 1),
                    randomNumber(20, 11),
                ),
            })
            .set(token);

        expect(resMiddle.statusCode).toEqual(200);

        const { recipes: dataMiddle } = resMiddle.body;

        expect(dataMiddle![0]!.recipeId).toEqual(recipe!.recipeId);
    });

    it("should respect name sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const order = randomBoolean() ? "asc" : "desc";

        await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => ({
                name: uuid(),
                public: true,
            })),
        });

        const res = await request(app)
            .get("/v1/recipes")
            .query({ sort: "name", order })
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } =
            res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        expect(data!.length).toEqual(TEST_ITEM_COUNT);

        const recipeNames = data!.map(({ name }) => name);
        expect(recipeNames).toEqual(
            order === "asc" ? recipeNames.sort() : recipeNames.sort().reverse(),
        );
    });

    it("should respect rating sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const order = randomBoolean() ? "asc" : "desc";

        await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => ({
                name: uuid(),
                rating: randomNumber(),
                public: true,
            })),
        });

        const res = await request(app)
            .get("/v1/recipes")
            .query({ sort: "ratingPersonal", order })
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } =
            res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        expect(data!.length).toEqual(TEST_ITEM_COUNT);

        const recipeRatings = data!.map(({ rating }) => rating?.personal ?? 0);
        expect(recipeRatings).toEqual(
            order === "asc"
                ? recipeRatings!.sort()
                : recipeRatings!.sort().reverse(),
        );
    });

    it("should respect time sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const order = randomBoolean() ? "asc" : "desc";

        await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => ({
                name: uuid(),
                prepTime: randomNumber(5),
                public: true,
            })),
        });

        const res = await request(app)
            .get("/v1/recipes")
            .query({ sort: "cookTime", order })
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } =
            res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        expect(data!.length).toEqual(TEST_ITEM_COUNT);

        const recipeTimes = data!.map(({ prepTime }) => prepTime);
        expect(recipeTimes).toEqual(
            order === "asc" ? recipeTimes.sort() : recipeTimes.sort().reverse(),
        );
    });

    it("should respect category filtering", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const [parentTag] = await KnexTagRepository.create(database, {
            tagId: uuid(),
            name: uuid(),
            description: uuid(),
        });

        const tags = await KnexTagRepository.create(
            database,
            Array.from({
                length: randomNumber(TEST_ITEM_COUNT, TEST_ITEM_COUNT / 2),
            }).map(() => ({
                parentId: parentTag!.tagId,
                tagId: uuid(),
                name: uuid(),
                description: uuid(),
            })),
        );

        const tagsToFilterBy = {
            [parentTag!.tagId]: tags
                .slice(0, randomNumber(tags.length / 2))
                .map(({ tagId }) => tagId),
        };

        const { recipes } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => ({
                name: uuid(),
                prepTime: randomNumber(5),
                public: true,
                tags: [randomElement(tags)!],
            })),
        });

        const res = await request(app)
            .get("/v1/recipes")
            .query({
                tags: tagsToFilterBy[parentTag!.tagId],
            })
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { recipes: data } =
            res.body as paths["/recipes"]["get"]["responses"]["200"]["content"]["application/json"];

        const expectedRecipeIds = recipes
            .filter(({ tags }) =>
                Object.values(tags ?? {}).some((tagGroup) =>
                    (tagGroup.tags ?? []).some((t) =>
                        (tagsToFilterBy[parentTag!.tagId] ?? []).includes(
                            t.tagId,
                        ),
                    ),
                ),
            )
            .map((r) => r.recipeId);
        const actualRecipeIds = data!.map(({ recipeId }) => recipeId);

        expect(actualRecipeIds.sort()).toEqual(expectedRecipeIds.sort());
    });

    // it("should respect ingredient filtering", async () => { // TODO
    //     const [token, user] = await PrepareAuthenticatedUser(database);

    //     const ingredients = Array.from({ length: randomNumber(TEST_ITEM_COUNT * 2, TEST_ITEM_COUNT) }).map(
    //         () =>
    //             ({
    //                 ingredientId: uuid(),
    //                 name: uuid(),
    //                 createdBy: user.userId,
    //             } satisfies ServiceParamsDi<IngredientActions, "save">)
    //     );

    //     const ingredientsToFilterBy = ingredients
    //         .slice(0, randomNumber(ingredients.length / 2))
    //         .map(({ ingredientId }) => ingredientId);

    //     await IngredientActions.save(database, ingredients);

    //     const { recipes } = await KnexRecipeRepository.create(database, {
    //         userId: user.userId,
    //         recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => {
    //             const recipeIngredients = Array.from({ length: randomNumber(ingredients.length / 4) })
    //                 .map(() => randomElement(ingredients)!.ingredientId)
    //                 .map(ingredientId => ({
    //                     ingredientId,
    //                     description: uuid(),
    //                     amount: generateRandomAmount(),
    //                     id: uuid(),
    //                     index: randomNumber(),
    //                 }));

    //             return {
    //                 name: uuid(),
    //                 prepTime: randomNumber(5),
    //                 public: true,
    //                 ingredients: [
    //                     {
    //                         sectionId: uuid(),
    //                         name: uuid(),
    //                         items: recipeIngredients,
    //                     },
    //                 ],
    //             };
    //         }),
    //     });

    //     const res = await request(app)
    //         .get(RecipeEndpoint.getAllRecipes({ ingredients: ingredientsToFilterBy }))
    //         .set(token);

    //     expect(res.statusCode).toEqual(200);

    //     const { data } = res.body as GetAllRecipesResponse;

    //     const expectedRecipeIds = recipes
    //         .filter(r =>
    //             (r.ingredients ?? []).some(section =>
    //                 section.items.some(i => i.ingredientId && ingredientsToFilterBy.includes(i.ingredientId))
    //             )
    //         )
    //         .map(r => r.recipeId);
    //     const actualRecipeIds = data!.map(({ recipeId }) => recipeId);

    //     expect(actualRecipeIds.sort()).toEqual(expectedRecipeIds.sort());
    // });

    // it("should respect ingredient and category filtering together", async () => {
    //     const [token, user] = await PrepareAuthenticatedUser(database);

    //     const ingredients = Array.from({ length: randomNumber(TEST_ITEM_COUNT * 2, TEST_ITEM_COUNT) }).map(
    //         () =>
    //             ({
    //                 ingredientId: uuid(),
    //                 name: uuid(),
    //                 createdBy: user.userId,
    //             } satisfies ServiceParamsDi<IngredientActions, "save">)
    //     );

    //     const parentTag = {
    //         tagId: uuid(),
    //         name: uuid(),
    //         description: uuid(),
    //     } satisfies ServiceParamsDi<TagActions, "save">;

    //     const tags = Array.from({ length: randomNumber(TEST_ITEM_COUNT, TEST_ITEM_COUNT / 2) }).map(
    //         () =>
    //             ({
    //                 parentId: parentTag.tagId,
    //                 tagId: uuid(),
    //                 name: uuid(),
    //                 description: uuid(),
    //             } satisfies ServiceParamsDi<TagActions, "save">)
    //     );

    //     const ingredientsToFilterBy = ingredients
    //         .slice(0, randomNumber(ingredients.length / 2))
    //         .map(({ ingredientId }) => ingredientId);

    //     const tagsToFilterBy = {
    //         [parentTag.tagId]: tags.slice(0, randomNumber(tags.length / 2)).map(({ tagId }) => tagId),
    //     };

    //     await IngredientActions.save(database, ingredients);
    //     await KnexTagRepository.create(database, [parentTag, ...tags]);

    //     const { recipes } = await KnexRecipeRepository.create(database, {
    //         userId: user.userId,
    //         recipes: Array.from({ length: TEST_ITEM_COUNT }).map(() => {
    //             const recipeIngredients = Array.from({ length: randomNumber(ingredients.length / 4) })
    //                 .map(() => randomElement(ingredients)!.ingredientId)
    //                 .map(ingredientId => ({
    //                     ingredientId,
    //                     description: uuid(),
    //                     amount: generateRandomAmount(),
    //                     id: uuid(),
    //                     index: randomNumber(),
    //                 }));

    //             const recipeTags = [randomElement(tags)!];

    //             return {
    //                 name: uuid(),
    //                 prepTime: randomNumber(5),
    //                 public: true,
    //                 ingredients: [
    //                     {
    //                         sectionId: uuid(),
    //                         name: uuid(),
    //                         items: recipeIngredients,
    //                     },
    //                 ],
    //                 tags: recipeTags,
    //             };
    //         }),
    //     });

    //     const res = await request(app)
    //         .get(
    //             RecipeEndpoint.getAllRecipes({
    //                 ingredients: ingredientsToFilterBy,
    //                 tags: tagsToFilterBy[parentTag.tagId],
    //             })
    //         )
    //         .set(token);

    //     expect(res.statusCode).toEqual(200);

    //     const { data } = res.body as GetAllRecipesResponse;

    //     const expectedRecipeIdByIngredient = recipes
    //         .filter(r =>
    //             (r.ingredients ?? []).some(section =>
    //                 section.items.some(i => i.ingredientId && ingredientsToFilterBy.includes(i.ingredientId))
    //             )
    //         )
    //         .map(r => r.recipeId);

    //     const expectedRecipeIdByTag = recipes
    //         .filter(r =>
    //             Object.values(r.tags ?? {}).some(tagGroup =>
    //                 (tagGroup.tags ?? []).some(t => (tagsToFilterBy[parentTag.tagId] ?? []).includes(t.tagId))
    //             )
    //         )
    //         .map(r => r.recipeId);
    //     const expectedRecipeIds = expectedRecipeIdByIngredient.filter(recipeId =>
    //         expectedRecipeIdByTag.includes(recipeId)
    //     );

    //     const actualRecipeIds = data!.map(({ recipeId }) => recipeId);

    //     expect(actualRecipeIds.sort()).toEqual(expectedRecipeIds.sort());
    // });
});

describe("Create a recipe", () => {
    it("should require authentication", async () => {
        const res = await request(app).post("/v1/recipes");

        expect(res.statusCode).toEqual(401);
    });

    it("should create correct recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{ uri: uuid() }],
        });

        const recipe: components["schemas"]["RecipeCreate"] = {
            name: uuid(),
            public: true,
            cookTime: randomNumber(),
            ingredients: generateRandomRecipeIngredientSections(),
            method: generateRandomRecipeMethodSections(),
            summary: uuid(),
            tips: uuid(),
            prepTime: randomNumber(),
            rating: randomNumber(),
            servings: generateRandomRecipeServings(),
            source: uuid(),
            tags: await createRandomRecipeTags(database),
            timesCooked: randomNumber(),
            photo: attachment,
        };

        const res = await request(app)
            .post("/v1/recipes")
            .set(token)
            .send(recipe);

        expect(res.statusCode).toEqual(201);

        const createdRecipe = res.body as components["schemas"]["Recipe"];

        const {
            recipes: [recipeResponse],
        } = await KnexRecipeRepository.read(database, {
            userId: user.userId,
            recipes: [{ recipeId: createdRecipe!.recipeId }],
        });

        expect(recipeResponse!.recipeId).toEqual(createdRecipe!.recipeId);
        expect(recipeResponse!.name).toEqual(recipe.name);
        expect(recipeResponse!.owner.userId).toEqual(user.userId);
        expect(recipeResponse!.owner.firstName).toEqual(user.firstName);
        expect(recipeResponse!.public).toEqual(recipe.public);
        expect(recipeResponse!.cookTime).toEqual(recipe.cookTime);
        expect(recipeResponse!.photo!.attachmentId).toEqual(
            attachment!.attachmentId,
        );
        expect(recipeResponse!.photo!.uri).toEqual(attachment!.uri);
        expect(recipeResponse!.summary).toEqual(recipe.summary);
        expect(recipeResponse!.source).toEqual(recipe.source);
        expect(recipeResponse!.tips).toEqual(recipe.tips);
        expect(recipeResponse!.prepTime).toEqual(recipe.prepTime);
        expect(recipeResponse!.rating!.personal).toEqual(recipe.rating);
        expect(recipeResponse!.timesCooked).toEqual(recipe.timesCooked);
        expect(recipeResponse!.rating!.average).toEqual(recipe.rating);
        // expect(recipeResponse!.createdAt).toEqual(recipeResponse?.updatedAt);
        assertRecipeServingsAreEqual(recipeResponse!.servings, recipe.servings);
        // expect(recipeResponse!.ingredients).toEqual(recipe.ingredients); TODO create validator functions
        // expect(recipeResponse!.method).toEqual(recipe.method);
        // assertRecipeTagsAreEqual(recipeResponse!.tags, recipe.tags);
    });
});

describe("Update a recipe", () => {
    it("should require authentication", async () => {
        const res = await request(app).post("/v1/recipes");

        expect(res.statusCode).toEqual(401);
    });

    it("should not allow editing if not recipe owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [recipeOwner] = await CreateUsers(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: recipeOwner!.userId,
            recipes: [{ name: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send({ name: "recipe" });

        expect(res.statusCode).toEqual(404);
    });

    it("should update correct recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [originalAttachment, updatedAttachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{ uri: uuid() }, { uri: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [
                {
                    name: uuid(),
                    public: randomBoolean(),
                    cookTime: randomNumber(),
                    ingredients: generateRandomRecipeIngredientSections(),
                    method: generateRandomRecipeMethodSections(),
                    summary: uuid(),
                    tips: uuid(),
                    prepTime: randomNumber(),
                    rating: randomNumber(),
                    servings: generateRandomRecipeServings(),
                    source: uuid(),
                    tags: await createRandomRecipeTags(database),
                    timesCooked: randomNumber(),
                    photo: originalAttachment,
                },
            ],
        });

        const updatedRecipe: components["schemas"]["RecipeUpdate"] = {
            name: uuid(),
            public: !recipe!.public,
            cookTime: randomNumber(),
            ingredients: generateRandomRecipeIngredientSections(),
            method: generateRandomRecipeMethodSections(),
            summary: uuid(),
            tips: uuid(),
            prepTime: randomNumber(),
            rating: randomNumber(),
            servings: generateRandomRecipeServings(),
            source: uuid(),
            tags: await createRandomRecipeTags(database),
            timesCooked: randomNumber(),
            photo: updatedAttachment,
        };

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send(updatedRecipe);

        expect(res.statusCode).toEqual(200);

        const {
            recipes: [recipeResponse],
        } = await KnexRecipeRepository.read(database, {
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });

        expect(recipeResponse!.name).toEqual(updatedRecipe.name);
        expect(recipeResponse!.owner.userId).toEqual(user.userId);
        expect(recipeResponse!.owner.firstName).toEqual(user.firstName);
        expect(recipeResponse!.public).toEqual(updatedRecipe.public);
        expect(recipeResponse!.cookTime).toEqual(updatedRecipe.cookTime);
        expect(recipeResponse!.photo!.attachmentId).toEqual(
            updatedAttachment!.attachmentId,
        );
        expect(recipeResponse!.photo!.uri).toEqual(updatedAttachment!.uri);
        expect(recipeResponse!.summary).toEqual(updatedRecipe.summary);
        expect(recipeResponse!.source).toEqual(updatedRecipe.source);
        expect(recipeResponse!.tips).toEqual(updatedRecipe.tips);
        expect(recipeResponse!.prepTime).toEqual(updatedRecipe.prepTime);
        expect(recipeResponse!.rating!.personal).toEqual(updatedRecipe.rating);
        expect(recipeResponse!.timesCooked).toEqual(updatedRecipe.timesCooked);
        expect(recipeResponse!.rating!.average).toEqual(updatedRecipe.rating);
        // expect(new Date(recipeResponse!.createdAt!).getTime()).toBeLessThan(new Date(recipeResponse?.updatedAt!).getTime()); // TODO: reinvestigate this check in a way that works within the transactions used for testing
        assertRecipeServingsAreEqual(
            recipeResponse!.servings,
            updatedRecipe.servings!,
        );
        // expect(recipeResponse!.ingredients).toEqual(recipe.ingredients); TODO create validator functions
        // expect(recipeResponse!.method).toEqual(recipe.method);
        // assertRecipeTagsAreEqual(recipeResponse!.tags, recipe2.tags);
    });

    it("should clear optional fields when set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{ uri: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [
                {
                    name: uuid(),
                    public: true,
                    cookTime: randomNumber(),
                    summary: uuid(),
                    tips: uuid(),
                    prepTime: randomNumber(),
                    servings: generateRandomRecipeServings(),
                    source: uuid(),
                    photo: attachment,
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/recipes/${recipe!.recipeId}`)
            .set(token)
            .send({
                cookTime: null,
                summary: null,
                tips: null,
                prepTime: null,
                servings: null,
                source: null,
                photo: null,
            });

        expect(res.statusCode).toEqual(200);

        const {
            recipes: [updatedRecipe],
        } = await KnexRecipeRepository.read(database, {
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });

        expect(updatedRecipe!.cookTime).toBeUndefined();
        expect(updatedRecipe!.summary).toBeUndefined();
        expect(updatedRecipe!.tips).toBeUndefined();
        expect(updatedRecipe!.prepTime).toBeUndefined();
        expect(updatedRecipe!.servings).toBeUndefined();
        expect(updatedRecipe!.source).toBeUndefined();
        expect(updatedRecipe!.photo).toBeUndefined();
    });
});

describe("Get a recipe", () => {
    it("should require authentication", async () => {
        const res = await request(app).get(`/v1/recipes/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent recipe", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .delete(`/v1/recipes/${uuid()}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return correct recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const res = await request(app)
            .get(`/v1/recipes/${recipe!.recipeId}`)
            .set(token);

        expect(res.statusCode).toEqual(200);
        const recipeResponse = res.body as components["schemas"]["Recipe"];
        expect(recipeResponse.recipeId).toEqual(recipe!.recipeId);
        expect(recipeResponse.name).toEqual(recipe!.name);
    });
});

describe("Delete a recipe", () => {
    it("should require authentication", async () => {
        const res = await request(app).delete(`/v1/recipes/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent recipe", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .delete(`/v1/recipes/${uuid()}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should delete a recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const res = await request(app)
            .delete(`/v1/recipes/${recipe!.recipeId}`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const { recipes } = await KnexRecipeRepository.read(database, {
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });
        expect(recipes).toHaveLength(0);
    });
});

describe("Rate a recipe", () => {
    it("should require authentication", async () => {
        const res = await request(app).post(`/v1/recipes/${uuid()}/rating`);
        expect(res.statusCode).toEqual(401);
    });

    it("should rate a recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const rating = 5;
        const res = await request(app)
            .post(`/v1/recipes/${recipe!.recipeId}/rating`)
            .set(token)
            .send({ rating });

        expect(res.statusCode).toEqual(200);
        expect(res.body.rating).toEqual(rating);

        const {
            recipes: [updatedRecipe],
        } = await KnexRecipeRepository.read(database, {
            userId: user.userId,
            recipes: [{ recipeId: recipe!.recipeId }],
        });
        expect(updatedRecipe!.rating!.personal).toEqual(rating);
    });

    /**
     * TODO: Add tests for:
     * saving ingredients
     * removing ingredients
     * saving steps
     * removing steps
     * saving tags
     * removing tags
     */
});
