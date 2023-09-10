import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import {
    RecipeEndpoint,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomNumber,
    randomBoolean,
    TEST_ITEM_COUNT,
    CleanAllTables,
    createRandomRecipeTags,
    generateRandomRecipeIngredientSections,
    generateRandomRecipeMethodSections,
    assertRecipeTagsAreEqual,
} from "../../helpers";
import { GetAllRecipesResponse, RecipeTags } from "../../../src/routes/spec";
import {
    IngredientActions,
    RecipeActions,
    RecipeIngredientActions,
    RecipeSectionActions,
    TagActions,
} from "../../../src/controllers";
import { ServiceParams } from "../../../src/database";
import config from "../../../src/config";
import { randomElement } from "../../../src/utils";
import { RecipeTagActions } from "../../../src/controllers/recipeTag";

beforeEach(async () => {
    await CleanAllTables();
});

afterAll(async () => {
    await CleanAllTables();
});

test("route should require authentication", async () => {
    const res = await request(app).get(RecipeEndpoint.getAllRecipes());

    expect(res.statusCode).toEqual(401);
});

test("should return correct recipe details", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const recipe = {
        recipeId: uuid(),
        name: uuid(),
        createdBy: user.userId,
        public: 1,
        cookTime: randomNumber(),
        ingredients: generateRandomRecipeIngredientSections(),
        method: generateRandomRecipeMethodSections(),
        notes: uuid(),
        photo: uuid(),
        prepTime: randomNumber(),
        ratingPersonal: randomNumber(),
        servings: randomNumber(),
        source: uuid(),
        tags: await createRandomRecipeTags(),
        timesCooked: randomNumber(),
    } satisfies ServiceParams<RecipeActions, "save">;

    const nonAssociatedTags = await createRandomRecipeTags();

    await RecipeActions.save(recipe);

    const res = await request(app).get(RecipeEndpoint.getAllRecipes()).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    expect(Object.keys(data ?? {}).length).toEqual(1);

    const recipeResponse = data![recipe.recipeId]!;

    expect(recipeResponse.recipeId).toEqual(recipe.recipeId);
    expect(recipeResponse.name).toEqual(recipe.name);
    expect(recipeResponse.createdBy.userId).toEqual(recipe.createdBy);
    expect(recipeResponse.public ? 1 : 0).toEqual(recipe.public);
    expect(recipeResponse.cookTime).toEqual(recipe.cookTime);
    expect(recipeResponse.ingredients).toBeUndefined();
    expect(recipeResponse.method).toBeUndefined();
    expect(recipeResponse.notes).toBeUndefined();
    expect(recipeResponse.photo).toEqual(recipe.photo);
    expect(recipeResponse.prepTime).toEqual(recipe.prepTime);
    expect(recipeResponse.ratingPersonal).toEqual(recipe.ratingPersonal);
    expect(recipeResponse.servings).toBeUndefined();
    expect(recipeResponse.source).toBeUndefined();
    expect(recipeResponse.timesCooked).toEqual(recipe.timesCooked);
    expect(recipeResponse.ratingAverage).toEqual(recipe.ratingPersonal);
    expect(recipeResponse.dateCreated).toBeDefined();

    assertRecipeTagsAreEqual(recipeResponse.tags, recipe.tags);
});

test("should return all public recipes from other users", async () => {
    const [token, _] = await PrepareAuthenticatedUser();
    const randomUsers = await CreateUsers({ count: randomNumber() });

    const recipes = Array.from({ length: randomNumber() }).map(
        (_, i) =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: randomUsers[i % randomUsers.length]!.userId,
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
    );

    await RecipeActions.save(recipes);

    const res = await request(app).get(RecipeEndpoint.getAllRecipes()).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    expect(Object.keys(data ?? {}).length).toEqual(recipes.length);
});

test("should not return private recipes", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const randomUsers = await CreateUsers({ count: randomNumber() });

    const recipes = Array.from({ length: randomNumber() }).map(
        (_, i) =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: randomUsers[i % randomUsers.length]!.userId,
                public: randomBoolean() ? 1 : 0,
            } satisfies ServiceParams<RecipeActions, "save">)
    );

    const myRecipes = Array.from({ length: randomNumber() }).map(
        (_, i) =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: user.userId,
                public: randomBoolean() ? 1 : 0,
            } satisfies ServiceParams<RecipeActions, "save">)
    );

    const allRecipes = [...recipes, ...myRecipes];

    RecipeActions.save(allRecipes);

    const res = await request(app).get(RecipeEndpoint.getAllRecipes()).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    expect(Object.keys(data ?? {}).length).toEqual(
        allRecipes.filter(recipe => recipe.public === 1 || recipe.createdBy === user.userId).length
    );
});

test("should respect pagination", async () => {
    const [token, _] = await PrepareAuthenticatedUser();
    const randomUsers = await CreateUsers({ count: randomNumber() });

    const recipes = Array.from({ length: 50 }).map(
        (_, i) =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: randomUsers[i % randomUsers.length]!.userId,
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
    );

    await RecipeActions.save(recipes);

    const res = await request(app).get(RecipeEndpoint.getAllRecipes()).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    expect(Object.keys(data ?? {}).length).toEqual(config.database.pageSize);

    const resPage2 = await request(app)
        .get(RecipeEndpoint.getAllRecipes({ page: 2 }))
        .set(token);

    expect(resPage2.statusCode).toEqual(200);

    const { data: dataPage2 } = resPage2.body as GetAllRecipesResponse;

    expect(Object.keys(dataPage2 ?? {}).length).toEqual(recipes.length - config.database.pageSize!);

    const duplicateRecipeKeys = Object.keys(data!).filter(key => Object.keys(dataPage2!).includes(key));

    expect(duplicateRecipeKeys.length).toEqual(0);
});

test("should respect search", async () => {
    const [token, _] = await PrepareAuthenticatedUser();
    const randomUsers = await CreateUsers({ count: randomNumber() });

    const recipes = Array.from({ length: randomNumber() }).map(
        () =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: randomElement(randomUsers)!.userId,
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
    );

    await RecipeActions.save(recipes);

    const recipeToSearchBy = randomElement(recipes)!;

    const res = await request(app)
        .get(RecipeEndpoint.getAllRecipes({ search: recipeToSearchBy.name }))
        .set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    expect(Object.keys(data ?? {}).length).toEqual(1);
    expect(data![recipeToSearchBy.recipeId]?.recipeId).toEqual(recipeToSearchBy.recipeId);
});

test("should respect substring search", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const recipe = {
        recipeId: uuid(),
        name: "Hardcoded Recipe Title To Search By",
        createdBy: user.userId,
        public: 1,
    } satisfies ServiceParams<RecipeActions, "save">;

    RecipeActions.save(recipe);

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

test("should respect name sorting and ordering", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const order = randomBoolean() ? "asc" : "desc";

    const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
        () =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: user.userId,
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
    );

    await RecipeActions.save(recipes);

    const res = await request(app)
        .get(RecipeEndpoint.getAllRecipes({ sort: "name" }))
        .set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

    const recipeNames = Object.values(data!).map(({ name }) => name);
    expect(recipeNames).toEqual(order === "asc" ? recipeNames.sort() : recipeNames.sort().reverse());
});

test("should respect rating sorting and ordering", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const order = randomBoolean() ? "asc" : "desc";

    const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
        () =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: user.userId,
                ratingPersonal: randomNumber(),
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
    );

    await RecipeActions.save(recipes);

    const res = await request(app)
        .get(RecipeEndpoint.getAllRecipes({ sort: "rating" }))
        .set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

    const recipeRatings = Object.values(data!).map(({ ratingPersonal }) => ratingPersonal);
    expect(recipeRatings).toEqual(order === "asc" ? recipeRatings.sort() : recipeRatings.sort().reverse());
});

test("should respect time sorting and ordering", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const order = randomBoolean() ? "asc" : "desc";

    const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
        () =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: user.userId,
                prepTime: randomNumber(5),
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
    );

    await RecipeActions.save(recipes);

    const res = await request(app)
        .get(RecipeEndpoint.getAllRecipes({ sort: "time", order }))
        .set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    expect(Object.keys(data ?? {}).length).toEqual(TEST_ITEM_COUNT);

    const recipeRatings = Object.values(data!).map(({ prepTime }) => prepTime);
    expect(recipeRatings).toEqual(order === "asc" ? recipeRatings.sort() : recipeRatings.sort().reverse());
});

test("should respect category filtering", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
        () =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: user.userId,
                prepTime: randomNumber(5),
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
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

    await RecipeActions.save(recipes);
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

test("should respect ingredient filtering", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
        () =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: user.userId,
                prepTime: randomNumber(5),
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
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
                        sectionId: "default",
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
                amount: 1,
                id: uuid(),
                sectionId: "default",
            })),
        } satisfies ServiceParams<RecipeIngredientActions, "save">;
    });

    const ingredientsToFilterBy = ingredients
        .slice(0, randomNumber(ingredients.length / 2))
        .map(({ ingredientId }) => ingredientId);

    await IngredientActions.save(ingredients);
    await RecipeActions.save(recipes);
    await RecipeSectionActions.save(recipeSections);
    await RecipeIngredientActions.save(recipeIngredients);

    const res = await request(app)
        .get(RecipeEndpoint.getAllRecipes({ ingredients: ingredientsToFilterBy }))
        .set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetAllRecipesResponse;

    const expectedRecipeIds = recipeIngredients
        .filter(recipe => recipe.ingredients.some(({ ingredientId }) => ingredientsToFilterBy.includes(ingredientId)))
        .map(({ recipeId }) => recipeId)
        .sort();

    const actualRecipeIds = Object.values(data!)
        .map(({ recipeId }) => recipeId)
        .sort();

    expect(actualRecipeIds).toEqual(expectedRecipeIds);
});

test("should respect ingredient and category filtering together", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const recipes = Array.from({ length: TEST_ITEM_COUNT }).map(
        () =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: user.userId,
                prepTime: randomNumber(5),
                public: 1,
            } satisfies ServiceParams<RecipeActions, "save">)
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
                        sectionId: "default",
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
                amount: 1,
                id: uuid(),
                sectionId: "default",
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
    await RecipeActions.save(recipes);
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
        .filter(recipe => recipe.ingredients.some(({ ingredientId }) => ingredientsToFilterBy.includes(ingredientId)))
        .map(({ recipeId }) => recipeId)
        .sort();

    const expectedRecipeIdByTag = recipeTags
        .filter(recipe => recipe.tags.some(({ tagId }) => tagsToFilterBy[parentTag.tagId]!.includes(tagId)))
        .map(({ recipeId }) => recipeId)
        .sort();

    const expectedRecipeIds = expectedRecipeIdByIngredient.filter(recipeId => expectedRecipeIdByTag.includes(recipeId));

    const actualRecipeIds = Object.values(data!)
        .map(({ recipeId }) => recipeId)
        .sort();

    expect(actualRecipeIds).toEqual(expectedRecipeIds);
});
