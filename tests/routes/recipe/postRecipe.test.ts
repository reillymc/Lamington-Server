import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { RecipeActions } from "../../../src/controllers";
import { PostRecipeRequestBody } from "../../../src/routes/spec";
import {
    CleanTables,
    PrepareAuthenticatedUser,
    RecipeEndpoint,
    assertRecipeServingsAreEqual,
    createRandomRecipeTags,
    generateRandomPostRecipeIngredientSections,
    generateRandomRecipeMethodSections,
    generateRandomRecipeServings,
    randomNumber,
} from "../../helpers";

beforeEach(async () => {
    await CleanTables("book", "user", "book_member");
});

afterAll(async () => {
    await CleanTables("book", "user", "book_member");
});

test("route should require authentication", async () => {
    const res = await request(app).post(RecipeEndpoint.postRecipe);

    expect(res.statusCode).toEqual(401);
});

test("should create correct recipe details", async () => {
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
        photo: uuid(),
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
    expect(recipeResponse!.photo).toEqual(recipe.photo);
    expect(recipeResponse!.summary).toEqual(recipe.summary);
    expect(recipeResponse!.source).toEqual(recipe.source);
    expect(recipeResponse!.tips).toEqual(recipe.tips);
    expect(recipeResponse!.prepTime).toEqual(recipe.prepTime);
    expect(recipeResponse!.ratingPersonal).toEqual(recipe.ratingPersonal);
    expect(recipeResponse!.timesCooked).toEqual(recipe.timesCooked);
    expect(recipeResponse!.ratingAverage).toEqual(recipe.ratingPersonal);
    expect(recipeResponse!.createdAt).toEqual(recipeResponse?.updatedAt);
    assertRecipeServingsAreEqual(recipeResponse!.servings, recipe.servings);
    // expect(recipeResponse!.ingredients).toEqual(recipe.ingredients); TODO create validator functions
    // expect(recipeResponse!.method).toEqual(recipe.method);
    // assertRecipeTagsAreEqual(recipeResponse!.tags, recipe.tags);
});

test("should update correct recipe details", async () => {
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
        photo: uuid(),
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

    await RecipeActions.Read({ recipeId: recipe.recipeId, userId: user.userId });

    const recipeReadResponse = await RecipeActions.Read({ recipeId: recipe.recipeId, userId: user.userId });
    expect(recipeReadResponse.length).toEqual(1);

    await new Promise(res => setTimeout(res, 1000));

    const recipe2 = {
        recipeId: recipe.recipeId,
        name: uuid(),
        public: true,
        cookTime: randomNumber(),
        ingredients: generateRandomPostRecipeIngredientSections(),
        method: generateRandomRecipeMethodSections(),
        summary: uuid(),
        tips: uuid(),
        photo: uuid(),
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
        .send({ data: recipe2 } satisfies PostRecipeRequestBody);

    expect(res2.statusCode).toEqual(201);

    const recipeReadResponse2 = await RecipeActions.Read({ recipeId: recipe.recipeId, userId: user.userId });

    const [recipeResponse] = recipeReadResponse2;

    expect(recipeResponse!.recipeId).toEqual(recipe2.recipeId);
    expect(recipeResponse!.name).toEqual(recipe2.name);
    expect(recipeResponse!.createdBy).toEqual(user.userId);
    expect(recipeResponse!.createdByName).toEqual(user.firstName);
    expect(recipeResponse!.public).toEqual(recipe2.public);
    expect(recipeResponse!.cookTime).toEqual(recipe2.cookTime);
    expect(recipeResponse!.photo).toEqual(recipe2.photo);
    expect(recipeResponse!.summary).toEqual(recipe2.summary);
    expect(recipeResponse!.source).toEqual(recipe2.source);
    expect(recipeResponse!.tips).toEqual(recipe2.tips);
    expect(recipeResponse!.prepTime).toEqual(recipe2.prepTime);
    expect(recipeResponse!.ratingPersonal).toEqual(recipe2.ratingPersonal);
    expect(recipeResponse!.timesCooked).toEqual(recipe2.timesCooked);
    expect(recipeResponse!.ratingAverage).toEqual(recipe2.ratingPersonal);
    expect(new Date(recipeResponse!.createdAt!).getTime()).toBeLessThan(new Date(recipeResponse?.updatedAt!).getTime());
    assertRecipeServingsAreEqual(recipeResponse!.servings, recipe2.servings);
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
