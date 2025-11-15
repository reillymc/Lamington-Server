import { expect } from "expect";
import type { Express } from "express";
import { before, describe, it } from "node:test";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import {
    IngredientActions,
    RecipeActions,
    RecipeIngredientActions,
    RecipeSectionActions,
    TagActions,
} from "../../src/controllers/index.ts";
import { RecipeTagActions } from "../../src/controllers/recipeTag.ts";
import type { RecipeService } from "../../src/controllers/spec/index.ts";
import { type ServiceParams } from "../../src/database/index.ts";
import type { GetAllRecipesResponse, PostRecipeRequestBody } from "../../src/routes/spec/index.ts";
import { randomElement } from "../../src/utils/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    RecipeEndpoint,
    TEST_ITEM_COUNT,
    assertRecipeServingsAreEqual,
    assertRecipeTagsAreEqual,
    createRandomRecipeTags,
    generateRandomAmount,
    generateRandomPostRecipeIngredientSections,
    generateRandomRecipeIngredientSections,
    generateRandomRecipeMethodSections,
    generateRandomRecipeServings,
    randomBoolean,
    randomNumber,
} from "../helpers/index.ts";

describe("get all recipes", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("should require authentication", async () => {
        const res = await request(app).get(RecipeEndpoint.getAllRecipes());

        expect(res.statusCode).toEqual(401);
    });

    it("should return correct recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: user.userId,
            public: true,
            cookTime: randomNumber(),
            ingredients: generateRandomRecipeIngredientSections(),
            method: generateRandomRecipeMethodSections(),
            servings: generateRandomRecipeServings(),
            prepTime: randomNumber(),
            ratingPersonal: randomNumber(),
            source: uuid(),
            tags: await createRandomRecipeTags(),
            timesCooked: randomNumber(),
        } satisfies ServiceParams<RecipeService, "Save">;

        const nonAssociatedTags = await createRandomRecipeTags();

        await RecipeActions.Save(recipe);

        const res = await request(app).get(RecipeEndpoint.getAllRecipes()).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(1);

        const recipeResponse = data![recipe.recipeId]!;

        expect(recipeResponse.recipeId).toEqual(recipe.recipeId);
        expect(recipeResponse.name).toEqual(recipe.name);
        expect(recipeResponse.createdBy.userId).toEqual(recipe.createdBy);
        expect(recipeResponse.public).toEqual(recipe.public);
        expect(recipeResponse.cookTime).toEqual(recipe.cookTime);
        expect(recipeResponse.ingredients).toBeUndefined();
        expect(recipeResponse.method).toBeUndefined();
        expect(recipeResponse.tips).toBeUndefined();
        expect(recipeResponse.summary).toBeUndefined();
        // expect(recipeResponse.photo).toEqual(recipe.photo);
        expect(recipeResponse.prepTime).toEqual(recipe.prepTime);
        expect(recipeResponse.ratingPersonal).toEqual(recipe.ratingPersonal);
        expect(recipeResponse.servings).toBeUndefined();
        expect(recipeResponse.source).toBeUndefined();
        expect(recipeResponse.timesCooked).toEqual(recipe.timesCooked);
        expect(recipeResponse.ratingAverage).toEqual(recipe.ratingPersonal);
        // expect(recipeResponse.createdAt).toBeDefined();

        assertRecipeTagsAreEqual(recipeResponse.tags, recipe.tags);
    });

    it("should return all public recipes from other users", async () => {
        const [token, _] = await PrepareAuthenticatedUser();
        const randomUsers = await CreateUsers({ count: randomNumber() });

        const recipes = Array.from({ length: randomNumber() }).map(
            (_, i) =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: randomUsers[i % randomUsers.length]!.userId,
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app).get(RecipeEndpoint.getAllRecipes()).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(recipes.length);
    });

    it("should not return private recipes", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const randomUsers = await CreateUsers({ count: randomNumber() });

        const recipes = Array.from({ length: randomNumber() }).map(
            (_, i) =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: randomUsers[i % randomUsers.length]!.userId,
                    public: randomBoolean(),
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const myRecipes = Array.from({ length: randomNumber() }).map(
            (_, i) =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    public: randomBoolean(),
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const allRecipes = [...recipes, ...myRecipes];

        RecipeActions.Save(allRecipes);

        const res = await request(app).get(RecipeEndpoint.getAllRecipes()).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(
            allRecipes.filter(recipe => recipe.public || recipe.createdBy === user.userId).length
        );
    });

    it("should respect pagination", async () => {
        const PAGE_SIZE = 50;

        const [token, _] = await PrepareAuthenticatedUser();
        const randomUsers = await CreateUsers({ count: randomNumber() });

        const recipes = Array.from({ length: 75 }).map(
            (_, i) =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: randomUsers[i % randomUsers.length]!.userId,
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app).get(RecipeEndpoint.getAllRecipes()).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(PAGE_SIZE);

        const resPage2 = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ page: 2 }))
            .set(token);

        expect(resPage2.statusCode).toEqual(200);

        const { data: dataPage2 } = resPage2.body as GetAllRecipesResponse;

        expect(Object.keys(dataPage2 ?? {}).length).toEqual(recipes.length - PAGE_SIZE!);

        const duplicateRecipeKeys = Object.keys(data!).filter(key => Object.keys(dataPage2!).includes(key));

        expect(duplicateRecipeKeys.length).toEqual(0);
    });

    it("should respect search", async () => {
        const [token, _] = await PrepareAuthenticatedUser();
        const randomUsers = await CreateUsers({ count: randomNumber() });

        const recipes = Array.from({ length: randomNumber() }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: randomElement(randomUsers)!.userId,
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const recipeToSearchBy = randomElement(recipes)!;

        const res = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ search: recipeToSearchBy.name }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(1);
        expect(data![recipeToSearchBy.recipeId]?.recipeId).toEqual(recipeToSearchBy.recipeId);
    });

    it("should respect substring search", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipe = {
            recipeId: uuid(),
            name: "Hardcoded Recipe Title To Search By",
            createdBy: user.userId,
            public: true,
        } satisfies ServiceParams<RecipeService, "Save">;

        RecipeActions.Save(recipe);

        const resPrefix = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ search: recipe.name.substring(0, randomNumber()) }))
            .set(token);

        expect(resPrefix.statusCode).toEqual(200);

        const { data: dataPrefix } = resPrefix.body as GetAllRecipesResponse;

        expect(dataPrefix![recipe.recipeId]?.recipeId).toEqual(recipe.recipeId);

        const resSuffix = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ search: recipe.name.substring(randomNumber()) }))
            .set(token);

        expect(resSuffix.statusCode).toEqual(200);

        const { data: dataSuffix } = resSuffix.body as GetAllRecipesResponse;

        expect(dataSuffix![recipe.recipeId]?.recipeId).toEqual(recipe.recipeId);

        const resMiddle = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ search: recipe.name.substring(randomNumber(), randomNumber() * 2) }))
            .set(token);

        expect(resMiddle.statusCode).toEqual(200);

        const { data: dataMiddle } = resMiddle.body as GetAllRecipesResponse;

        expect(dataMiddle![recipe.recipeId]?.recipeId).toEqual(recipe.recipeId);
    });

    it("should respect name sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const order = randomBoolean() ? "asc" : "desc";

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ sort: "name" }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

        const recipeNames = Object.values(data!).map(({ name }) => name);
        expect(recipeNames).toEqual(order === "asc" ? recipeNames.sort() : recipeNames.sort().reverse());
    });

    it("should respect rating sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const order = randomBoolean() ? "asc" : "desc";

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    ratingPersonal: randomNumber(),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ sort: "rating" }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

        const recipeRatings = Object.values(data!).map(({ ratingPersonal }) => ratingPersonal);
        expect(recipeRatings).toEqual(order === "asc" ? recipeRatings.sort() : recipeRatings.sort().reverse());
    });

    it("should respect time sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const order = randomBoolean() ? "asc" : "desc";

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    prepTime: randomNumber(5),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ sort: "time", order }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

        const recipeRatings = Object.values(data!).map(({ prepTime }) => prepTime);
        expect(recipeRatings).toEqual(order === "asc" ? recipeRatings.sort() : recipeRatings.sort().reverse());
    });

    it("should respect category filtering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    prepTime: randomNumber(5),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const parentTag = {
            tagId: uuid(),
            name: uuid(),
            description: uuid(),
        } satisfies ServiceParams<TagActions, "save">;

        const tags = Array.from({ length: randomNumber(TEST_ITEM_COUNT, TEST_ITEM_COUNT / 2) }).map(
            () =>
                ({
                    parentId: parentTag.tagId,
                    tagId: uuid(),
                    name: uuid(),
                    description: uuid(),
                } satisfies ServiceParams<TagActions, "save">)
        );

        const recipeTags = recipes.map(
            recipe =>
                ({ recipeId: recipe.recipeId, tags: [randomElement(tags)!] } satisfies ServiceParams<
                    RecipeTagActions,
                    "save"
                >)
        );

        const tagsToFilterBy = {
            [parentTag.tagId]: tags.slice(0, randomNumber(tags.length / 2)).map(({ tagId }) => tagId),
        };

        await RecipeActions.Save(recipes);
        await TagActions.save([parentTag, ...tags]);
        await RecipeTagActions.save(recipeTags);

        const res = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ ...tagsToFilterBy }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        const expectedRecipeIds = recipeTags
            .filter(recipe => recipe.tags.some(({ tagId }) => tagsToFilterBy[parentTag.tagId]!.includes(tagId)))
            .map(({ recipeId }) => recipeId)
            .sort();

        const actualRecipeIds = Object.values(data!)
            .map(({ recipeId }) => recipeId)
            .sort();

        expect(actualRecipeIds).toEqual(expectedRecipeIds);
    });

    it("should respect ingredient filtering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    prepTime: randomNumber(5),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const ingredients = Array.from({ length: randomNumber(TEST_ITEM_COUNT * 2, TEST_ITEM_COUNT) }).map(
            () =>
                ({
                    ingredientId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                } satisfies ServiceParams<IngredientActions, "save">)
        );

        const recipeSections = recipes.map(
            recipe =>
                ({
                    recipeId: recipe.recipeId,
                    sections: [
                        {
                            sectionId: "00000000-0000-0000-0000-000000000000",
                            name: uuid(),
                            description: uuid(),
                            index: randomNumber(),
                        },
                    ],
                } satisfies ServiceParams<RecipeSectionActions, "save">)
        );

        const recipeIngredients = recipes.map(recipe => {
            const randomIngredientIds = Array.from({ length: randomNumber(ingredients.length / 4) }).map(
                () => randomElement(ingredients)!.ingredientId
            );
            return {
                recipeId: recipe.recipeId,
                ingredients: randomIngredientIds.map(ingredientId => ({
                    ingredientId,
                    description: uuid(),
                    amount: generateRandomAmount(),
                    id: uuid(),
                    index: randomNumber(),
                    sectionId: "00000000-0000-0000-0000-000000000000",
                })),
            } satisfies ServiceParams<RecipeIngredientActions, "save">;
        });

        const ingredientsToFilterBy = ingredients
            .slice(0, randomNumber(ingredients.length / 2))
            .map(({ ingredientId }) => ingredientId);

        await IngredientActions.save(ingredients);
        await RecipeActions.Save(recipes);
        await RecipeSectionActions.save(recipeSections);
        await RecipeIngredientActions.save(recipeIngredients);

        const res = await request(app)
            .get(RecipeEndpoint.getAllRecipes({ ingredients: ingredientsToFilterBy }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        const expectedRecipeIds = recipeIngredients
            .filter(recipe =>
                recipe.ingredients.some(({ ingredientId }) => ingredientsToFilterBy.includes(ingredientId))
            )
            .map(({ recipeId }) => recipeId)
            .sort();

        const actualRecipeIds = Object.values(data!)
            .map(({ recipeId }) => recipeId)
            .sort();

        expect(actualRecipeIds).toEqual(expectedRecipeIds);
    });

    it("should respect ingredient and category filtering together", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    prepTime: randomNumber(5),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const ingredients = Array.from({ length: randomNumber(TEST_ITEM_COUNT * 2, TEST_ITEM_COUNT) }).map(
            () =>
                ({
                    ingredientId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                } satisfies ServiceParams<IngredientActions, "save">)
        );

        const parentTag = {
            tagId: uuid(),
            name: uuid(),
            description: uuid(),
        } satisfies ServiceParams<TagActions, "save">;

        const tags = Array.from({ length: randomNumber(TEST_ITEM_COUNT, TEST_ITEM_COUNT / 2) }).map(
            () =>
                ({
                    parentId: parentTag.tagId,
                    tagId: uuid(),
                    name: uuid(),
                    description: uuid(),
                } satisfies ServiceParams<TagActions, "save">)
        );

        const recipeSections = recipes.map(
            recipe =>
                ({
                    recipeId: recipe.recipeId,
                    sections: [
                        {
                            sectionId: "00000000-0000-0000-0000-000000000000",
                            name: uuid(),
                            description: uuid(),
                            index: randomNumber(),
                        },
                    ],
                } satisfies ServiceParams<RecipeSectionActions, "save">)
        );

        const recipeIngredients = recipes.map(recipe => {
            const randomIngredientIds = Array.from({ length: randomNumber(ingredients.length / 4) }).map(
                () => randomElement(ingredients)!.ingredientId
            );
            return {
                recipeId: recipe.recipeId,
                ingredients: randomIngredientIds.map(ingredientId => ({
                    ingredientId,
                    description: uuid(),
                    amount: generateRandomAmount(),
                    id: uuid(),
                    index: randomNumber(),
                    sectionId: "00000000-0000-0000-0000-000000000000",
                })),
            } satisfies ServiceParams<RecipeIngredientActions, "save">;
        });

        const recipeTags = recipes.map(
            recipe =>
                ({ recipeId: recipe.recipeId, tags: [randomElement(tags)!] } satisfies ServiceParams<
                    RecipeTagActions,
                    "save"
                >)
        );

        const ingredientsToFilterBy = ingredients
            .slice(0, randomNumber(ingredients.length / 2))
            .map(({ ingredientId }) => ingredientId);

        const tagsToFilterBy = {
            [parentTag.tagId]: tags.slice(0, randomNumber(tags.length / 2)).map(({ tagId }) => tagId),
        };

        await IngredientActions.save(ingredients);
        await TagActions.save([parentTag, ...tags]);
        await RecipeActions.Save(recipes);
        await RecipeSectionActions.save(recipeSections);
        await RecipeIngredientActions.save(recipeIngredients);
        await RecipeTagActions.save(recipeTags);

        const res = await request(app)
            .get(
                RecipeEndpoint.getAllRecipes({
                    ingredients: ingredientsToFilterBy,
                    ...tagsToFilterBy,
                })
            )
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        const expectedRecipeIdByIngredient = recipeIngredients
            .filter(recipe =>
                recipe.ingredients.some(({ ingredientId }) => ingredientsToFilterBy.includes(ingredientId))
            )
            .map(({ recipeId }) => recipeId)
            .sort();

        const expectedRecipeIdByTag = recipeTags
            .filter(recipe => recipe.tags.some(({ tagId }) => tagsToFilterBy[parentTag.tagId]!.includes(tagId)))
            .map(({ recipeId }) => recipeId)
            .sort();

        const expectedRecipeIds = expectedRecipeIdByIngredient.filter(recipeId =>
            expectedRecipeIdByTag.includes(recipeId)
        );

        const actualRecipeIds = Object.values(data!)
            .map(({ recipeId }) => recipeId)
            .sort();

        expect(actualRecipeIds).toEqual(expectedRecipeIds);
    });
});

describe("get my recipes", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("should require authentication", async () => {
        const res = await request(app).get(RecipeEndpoint.getMyRecipes());

        expect(res.statusCode).toEqual(401);
    });

    it("should return correct recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: user.userId,
            public: true,
            cookTime: randomNumber(),
            ingredients: generateRandomRecipeIngredientSections(),
            method: generateRandomRecipeMethodSections(),
            servings: generateRandomRecipeServings(),
            prepTime: randomNumber(),
            ratingPersonal: randomNumber(),
            source: uuid(),
            tags: await createRandomRecipeTags(),
            timesCooked: randomNumber(),
        } satisfies ServiceParams<RecipeService, "Save">;

        const nonAssociatedTags = await createRandomRecipeTags();

        await RecipeActions.Save(recipe);

        const res = await request(app).get(RecipeEndpoint.getMyRecipes()).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(1);

        const recipeResponse = data![recipe.recipeId]!;

        expect(recipeResponse.recipeId).toEqual(recipe.recipeId);
        expect(recipeResponse.name).toEqual(recipe.name);
        expect(recipeResponse.createdBy.userId).toEqual(recipe.createdBy);
        expect(recipeResponse.public).toEqual(recipe.public);
        expect(recipeResponse.cookTime).toEqual(recipe.cookTime);
        expect(recipeResponse.ingredients).toBeUndefined();
        expect(recipeResponse.method).toBeUndefined();
        expect(recipeResponse.tips).toBeUndefined();
        expect(recipeResponse.summary).toBeUndefined();
        // expect(recipeResponse.photo).toEqual(recipe.photo);
        expect(recipeResponse.prepTime).toEqual(recipe.prepTime);
        expect(recipeResponse.ratingPersonal).toEqual(recipe.ratingPersonal);
        expect(recipeResponse.servings).toBeUndefined();
        expect(recipeResponse.source).toBeUndefined();
        expect(recipeResponse.timesCooked).toEqual(recipe.timesCooked);
        expect(recipeResponse.ratingAverage).toEqual(recipe.ratingPersonal);
        // expect(recipeResponse.createdAt).toBeDefined();

        assertRecipeTagsAreEqual(recipeResponse.tags, recipe.tags);
    });

    it("should not return any recipes from other users", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const randomUsers = await CreateUsers({ count: randomNumber() });

        const recipes = Array.from({ length: randomNumber() }).map(
            (_, i) =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: randomUsers[i % randomUsers.length]!.userId,
                    public: randomBoolean(),
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const myRecipes = Array.from({ length: randomNumber() }).map(
            (_, i) =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    public: randomBoolean(),
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const allRecipes = [...recipes, ...myRecipes];

        RecipeActions.Save(allRecipes);

        const res = await request(app).get(RecipeEndpoint.getMyRecipes()).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(myRecipes.length);
    });

    it("should respect pagination", async () => {
        const PAGE_SIZE = 50;

        const [token, user] = await PrepareAuthenticatedUser();

        const recipes = Array.from({ length: 50 }).map(
            (_, i) =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user!.userId,
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app).get(RecipeEndpoint.getMyRecipes()).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(PAGE_SIZE);

        const resPage2 = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ page: 2 }))
            .set(token);

        expect(resPage2.statusCode).toEqual(200);

        const { data: dataPage2 } = resPage2.body as GetAllRecipesResponse;

        expect(Object.keys(dataPage2 ?? {}).length).toEqual(recipes.length - PAGE_SIZE!);

        const duplicateRecipeKeys = Object.keys(data!).filter(key => Object.keys(dataPage2!).includes(key));

        expect(duplicateRecipeKeys.length).toEqual(0);
    });

    it("should respect search", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipes = Array.from({ length: randomNumber() }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user!.userId,
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const recipeToSearchBy = randomElement(recipes)!;

        const res = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ search: recipeToSearchBy.name }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(1);
        expect(data![recipeToSearchBy.recipeId]?.recipeId).toEqual(recipeToSearchBy.recipeId);
    });

    it("should respect substring search", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipe = {
            recipeId: uuid(),
            name: "Hardcoded Recipe Title To Search By",
            createdBy: user.userId,
            public: true,
        } satisfies ServiceParams<RecipeService, "Save">;

        RecipeActions.Save(recipe);

        const resPrefix = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ search: recipe.name.substring(0, randomNumber()) }))
            .set(token);

        expect(resPrefix.statusCode).toEqual(200);

        const { data: dataPrefix } = resPrefix.body as GetAllRecipesResponse;

        expect(dataPrefix![recipe.recipeId]?.recipeId).toEqual(recipe.recipeId);

        const resSuffix = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ search: recipe.name.substring(randomNumber()) }))
            .set(token);

        expect(resSuffix.statusCode).toEqual(200);

        const { data: dataSuffix } = resSuffix.body as GetAllRecipesResponse;

        expect(dataSuffix![recipe.recipeId]?.recipeId).toEqual(recipe.recipeId);

        const resMiddle = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ search: recipe.name.substring(randomNumber(), randomNumber() * 2) }))
            .set(token);

        expect(resMiddle.statusCode).toEqual(200);

        const { data: dataMiddle } = resMiddle.body as GetAllRecipesResponse;

        expect(dataMiddle![recipe.recipeId]?.recipeId).toEqual(recipe.recipeId);
    });

    it("should respect name sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const order = randomBoolean() ? "asc" : "desc";

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ sort: "name" }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

        const recipeNames = Object.values(data!).map(({ name }) => name);
        expect(recipeNames).toEqual(order === "asc" ? recipeNames.sort() : recipeNames.sort().reverse());
    });

    it("should respect rating sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const order = randomBoolean() ? "asc" : "desc";

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    ratingPersonal: randomNumber(),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ sort: "rating" }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

        const recipeRatings = Object.values(data!).map(({ ratingPersonal }) => ratingPersonal);
        expect(recipeRatings).toEqual(order === "asc" ? recipeRatings.sort() : recipeRatings.sort().reverse());
    });

    it("should respect time sorting and ordering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const order = randomBoolean() ? "asc" : "desc";

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    prepTime: randomNumber(5),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipes);

        const res = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ sort: "time", order }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

        const recipeRatings = Object.values(data!).map(({ prepTime }) => prepTime);
        expect(recipeRatings).toEqual(order === "asc" ? recipeRatings.sort() : recipeRatings.sort().reverse());
    });

    it("should respect category filtering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    prepTime: randomNumber(5),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const parentTag = {
            tagId: uuid(),
            name: uuid(),
            description: uuid(),
        } satisfies ServiceParams<TagActions, "save">;

        const tags = Array.from({ length: randomNumber(TEST_ITEM_COUNT, TEST_ITEM_COUNT / 2) }).map(
            () =>
                ({
                    parentId: parentTag.tagId,
                    tagId: uuid(),
                    name: uuid(),
                    description: uuid(),
                } satisfies ServiceParams<TagActions, "save">)
        );

        const recipeTags = recipes.map(
            recipe =>
                ({ recipeId: recipe.recipeId, tags: [randomElement(tags)!] } satisfies ServiceParams<
                    RecipeTagActions,
                    "save"
                >)
        );

        const tagsToFilterBy = {
            [parentTag.tagId]: tags.slice(0, randomNumber(tags.length / 2)).map(({ tagId }) => tagId),
        };

        await RecipeActions.Save(recipes);
        await TagActions.save([parentTag, ...tags]);
        await RecipeTagActions.save(recipeTags);

        const res = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ ...tagsToFilterBy }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        const expectedRecipeIds = recipeTags
            .filter(recipe => recipe.tags.some(({ tagId }) => tagsToFilterBy[parentTag.tagId]!.includes(tagId)))
            .map(({ recipeId }) => recipeId)
            .sort();

        const actualRecipeIds = Object.values(data!)
            .map(({ recipeId }) => recipeId)
            .sort();

        expect(actualRecipeIds).toEqual(expectedRecipeIds);
    });

    it("should respect ingredient filtering", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    prepTime: randomNumber(5),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const ingredients = Array.from({ length: randomNumber(TEST_ITEM_COUNT * 2, TEST_ITEM_COUNT) }).map(
            () =>
                ({
                    ingredientId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                } satisfies ServiceParams<IngredientActions, "save">)
        );

        const recipeSections = recipes.map(
            recipe =>
                ({
                    recipeId: recipe.recipeId,
                    sections: [
                        {
                            sectionId: "00000000-0000-0000-0000-000000000000",
                            name: uuid(),
                            description: uuid(),
                            index: randomNumber(),
                        },
                    ],
                } satisfies ServiceParams<RecipeSectionActions, "save">)
        );

        const recipeIngredients = recipes.map(recipe => {
            const randomIngredientIds = Array.from({ length: randomNumber(ingredients.length / 4) }).map(
                () => randomElement(ingredients)!.ingredientId
            );
            return {
                recipeId: recipe.recipeId,
                ingredients: randomIngredientIds.map(ingredientId => ({
                    ingredientId,
                    description: uuid(),
                    amount: generateRandomAmount(),
                    id: uuid(),
                    index: randomNumber(),
                    sectionId: "00000000-0000-0000-0000-000000000000",
                })),
            } satisfies ServiceParams<RecipeIngredientActions, "save">;
        });

        const ingredientsToFilterBy = ingredients
            .slice(0, randomNumber(ingredients.length / 2))
            .map(({ ingredientId }) => ingredientId);

        await IngredientActions.save(ingredients);
        await RecipeActions.Save(recipes);
        await RecipeSectionActions.save(recipeSections);
        await RecipeIngredientActions.save(recipeIngredients);

        const res = await request(app)
            .get(RecipeEndpoint.getMyRecipes({ ingredients: ingredientsToFilterBy }))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        const expectedRecipeIds = recipeIngredients
            .filter(recipe =>
                recipe.ingredients.some(({ ingredientId }) => ingredientsToFilterBy.includes(ingredientId))
            )
            .map(({ recipeId }) => recipeId)
            .sort();

        const actualRecipeIds = Object.values(data!)
            .map(({ recipeId }) => recipeId)
            .sort();

        expect(actualRecipeIds).toEqual(expectedRecipeIds);
    });

    it("should respect ingredient and category filtering together", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    prepTime: randomNumber(5),
                    public: true,
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const ingredients = Array.from({ length: randomNumber(TEST_ITEM_COUNT * 2, TEST_ITEM_COUNT) }).map(
            () =>
                ({
                    ingredientId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                } satisfies ServiceParams<IngredientActions, "save">)
        );

        const parentTag = {
            tagId: uuid(),
            name: uuid(),
            description: uuid(),
        } satisfies ServiceParams<TagActions, "save">;

        const tags = Array.from({ length: randomNumber(TEST_ITEM_COUNT, TEST_ITEM_COUNT / 2) }).map(
            () =>
                ({
                    parentId: parentTag.tagId,
                    tagId: uuid(),
                    name: uuid(),
                    description: uuid(),
                } satisfies ServiceParams<TagActions, "save">)
        );

        const recipeSections = recipes.map(
            recipe =>
                ({
                    recipeId: recipe.recipeId,
                    sections: [
                        {
                            sectionId: "00000000-0000-0000-0000-000000000000",
                            name: uuid(),
                            description: uuid(),
                            index: randomNumber(),
                        },
                    ],
                } satisfies ServiceParams<RecipeSectionActions, "save">)
        );

        const recipeIngredients = recipes.map(recipe => {
            const randomIngredientIds = Array.from({ length: randomNumber(ingredients.length / 4) }).map(
                () => randomElement(ingredients)!.ingredientId
            );
            return {
                recipeId: recipe.recipeId,
                ingredients: randomIngredientIds.map(ingredientId => ({
                    ingredientId,
                    description: uuid(),
                    amount: generateRandomAmount(),
                    id: uuid(),
                    index: randomNumber(),
                    sectionId: "00000000-0000-0000-0000-000000000000",
                })),
            } satisfies ServiceParams<RecipeIngredientActions, "save">;
        });

        const recipeTags = recipes.map(
            recipe =>
                ({ recipeId: recipe.recipeId, tags: [randomElement(tags)!] } satisfies ServiceParams<
                    RecipeTagActions,
                    "save"
                >)
        );

        const ingredientsToFilterBy = ingredients
            .slice(0, randomNumber(ingredients.length / 2))
            .map(({ ingredientId }) => ingredientId);

        const tagsToFilterBy = {
            [parentTag.tagId]: tags.slice(0, randomNumber(tags.length / 2)).map(({ tagId }) => tagId),
        };

        await IngredientActions.save(ingredients);
        await TagActions.save([parentTag, ...tags]);
        await RecipeActions.Save(recipes);
        await RecipeSectionActions.save(recipeSections);
        await RecipeIngredientActions.save(recipeIngredients);
        await RecipeTagActions.save(recipeTags);

        const res = await request(app)
            .get(
                RecipeEndpoint.getMyRecipes({
                    ingredients: ingredientsToFilterBy,
                    ...tagsToFilterBy,
                })
            )
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetAllRecipesResponse;

        const expectedRecipeIdByIngredient = recipeIngredients
            .filter(recipe =>
                recipe.ingredients.some(({ ingredientId }) => ingredientsToFilterBy.includes(ingredientId))
            )
            .map(({ recipeId }) => recipeId)
            .sort();

        const expectedRecipeIdByTag = recipeTags
            .filter(recipe => recipe.tags.some(({ tagId }) => tagsToFilterBy[parentTag.tagId]!.includes(tagId)))
            .map(({ recipeId }) => recipeId)
            .sort();

        const expectedRecipeIds = expectedRecipeIdByIngredient.filter(recipeId =>
            expectedRecipeIdByTag.includes(recipeId)
        );

        const actualRecipeIds = Object.values(data!)
            .map(({ recipeId }) => recipeId)
            .sort();

        expect(actualRecipeIds).toEqual(expectedRecipeIds);
    });
});

describe("post recipe", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("should require authentication", async () => {
        const res = await request(app).post(RecipeEndpoint.postRecipe);

        expect(res.statusCode).toEqual(401);
    });

    it("should create correct recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            public: true,
            cookTime: randomNumber(),
            ingredients: generateRandomPostRecipeIngredientSections(),
            method: generateRandomRecipeMethodSections(),
            summary: uuid(),
            tips: uuid(),
            prepTime: randomNumber(),
            ratingPersonal: randomNumber(),
            servings: generateRandomRecipeServings(),
            source: uuid(),
            tags: await createRandomRecipeTags(),
            timesCooked: randomNumber(),
        } satisfies PostRecipeRequestBody["data"];

        const res = await request(app)
            .post(RecipeEndpoint.postRecipe)
            .set(token)
            .send({ data: recipe } satisfies PostRecipeRequestBody);

        expect(res.statusCode).toEqual(201);

        const recipeReadResponse = await RecipeActions.Read({ recipeId: recipe.recipeId, userId: user.userId });
        expect(recipeReadResponse.length).toEqual(1);

        const [recipeResponse] = recipeReadResponse;

        expect(recipeResponse!.recipeId).toEqual(recipe.recipeId);
        expect(recipeResponse!.name).toEqual(recipe.name);
        expect(recipeResponse!.createdBy).toEqual(user.userId);
        expect(recipeResponse!.createdByName).toEqual(user.firstName);
        expect(recipeResponse!.public).toEqual(recipe.public);
        expect(recipeResponse!.cookTime).toEqual(recipe.cookTime);
        // expect(recipeResponse!.photo).toEqual(recipe.photo);
        expect(recipeResponse!.summary).toEqual(recipe.summary);
        expect(recipeResponse!.source).toEqual(recipe.source);
        expect(recipeResponse!.tips).toEqual(recipe.tips);
        expect(recipeResponse!.prepTime).toEqual(recipe.prepTime);
        expect(recipeResponse!.ratingPersonal).toEqual(recipe.ratingPersonal);
        expect(recipeResponse!.timesCooked).toEqual(recipe.timesCooked);
        expect(recipeResponse!.ratingAverage).toEqual(recipe.ratingPersonal);
        // expect(recipeResponse!.createdAt).toEqual(recipeResponse?.updatedAt);
        assertRecipeServingsAreEqual(recipeResponse!.servings, recipe.servings);
        // expect(recipeResponse!.ingredients).toEqual(recipe.ingredients); TODO create validator functions
        // expect(recipeResponse!.method).toEqual(recipe.method);
        // assertRecipeTagsAreEqual(recipeResponse!.tags, recipe.tags);
    });

    it("should update correct recipe details", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            public: true,
            cookTime: randomNumber(),
            ingredients: generateRandomPostRecipeIngredientSections(),
            method: generateRandomRecipeMethodSections(),
            summary: uuid(),
            tips: uuid(),
            prepTime: randomNumber(),
            ratingPersonal: randomNumber(),
            servings: generateRandomRecipeServings(),
            source: uuid(),
            tags: await createRandomRecipeTags(),
            timesCooked: randomNumber(),
        } satisfies PostRecipeRequestBody["data"];

        const res = await request(app)
            .post(RecipeEndpoint.postRecipe)
            .set(token)
            .send({ data: recipe } satisfies PostRecipeRequestBody);

        expect(res.statusCode).toEqual(201);

        const recipeReadResponse = await RecipeActions.Read({ recipeId: recipe.recipeId, userId: user.userId });
        expect(recipeReadResponse.length).toEqual(1);

        const updatedRecipe = {
            recipeId: recipe.recipeId,
            name: uuid(),
            public: true,
            cookTime: randomNumber(),
            ingredients: generateRandomPostRecipeIngredientSections(),
            method: generateRandomRecipeMethodSections(),
            summary: uuid(),
            tips: uuid(),
            prepTime: randomNumber(),
            ratingPersonal: randomNumber(),
            servings: generateRandomRecipeServings(),
            source: uuid(),
            tags: await createRandomRecipeTags(),
            timesCooked: randomNumber(),
        } satisfies PostRecipeRequestBody["data"];

        const res2 = await request(app)
            .post(RecipeEndpoint.postRecipe)
            .set(token)
            .send({ data: updatedRecipe } satisfies PostRecipeRequestBody);

        expect(res2.statusCode).toEqual(201);

        const recipeReadResponse2 = await RecipeActions.Read({ recipeId: recipe.recipeId, userId: user.userId });

        const [recipeResponse] = recipeReadResponse2;

        expect(recipeResponse!.recipeId).toEqual(updatedRecipe.recipeId);
        expect(recipeResponse!.name).toEqual(updatedRecipe.name);
        expect(recipeResponse!.createdBy).toEqual(user.userId);
        expect(recipeResponse!.createdByName).toEqual(user.firstName);
        expect(recipeResponse!.public).toEqual(updatedRecipe.public);
        expect(recipeResponse!.cookTime).toEqual(updatedRecipe.cookTime);
        // expect(recipeResponse!.photo).toEqual(updatedRecipe.photo);
        expect(recipeResponse!.summary).toEqual(updatedRecipe.summary);
        expect(recipeResponse!.source).toEqual(updatedRecipe.source);
        expect(recipeResponse!.tips).toEqual(updatedRecipe.tips);
        expect(recipeResponse!.prepTime).toEqual(updatedRecipe.prepTime);
        expect(recipeResponse!.ratingPersonal).toEqual(updatedRecipe.ratingPersonal);
        expect(recipeResponse!.timesCooked).toEqual(updatedRecipe.timesCooked);
        expect(recipeResponse!.ratingAverage).toEqual(updatedRecipe.ratingPersonal);
        // expect(new Date(recipeResponse!.createdAt!).getTime()).toBeLessThan(new Date(recipeResponse?.updatedAt!).getTime()); // TODO: reinvestigate this check in a way that works within the transactions used for testing
        assertRecipeServingsAreEqual(recipeResponse!.servings, updatedRecipe.servings);
        // expect(recipeResponse!.ingredients).toEqual(recipe.ingredients); TODO create validator functions
        // expect(recipeResponse!.method).toEqual(recipe.method);
        // assertRecipeTagsAreEqual(recipeResponse!.tags, recipe2.tags);
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
