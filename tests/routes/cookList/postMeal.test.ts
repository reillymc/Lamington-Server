import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import {
    CleanTables,
    CookListEndpoint,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBit,
    randomNumber,
} from "../../helpers";
import { PostCookListMealRequestBody } from "../../../src/routes/spec";
import { CookListMealActions, CookListMealActionsInternal, RecipeActions } from "../../../src/controllers";
import { ServiceParams } from "../../../src/database";

beforeEach(async () => {
    await CleanTables("user", "planner_meal", "recipe");
});

afterAll(async () => {
    await CleanTables("user", "planner_meal", "recipe");
});

test("route should require authentication", async () => {
    const res = await request(app).get(CookListEndpoint.postMeal);

    expect(res.statusCode).toEqual(401);
});

test("should create new meal", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const meals = {
        data: Array.from({ length: randomNumber() }).map((_, i) => ({
            id: uuid(),
            description: uuid(),
            meal: uuid(),
            sequence: i + 1,
            source: uuid(),
        })),
    } satisfies PostCookListMealRequestBody;

    const res = await request(app).post(CookListEndpoint.postMeal).set(token).send(meals);
    expect(res.statusCode).toEqual(201);

    const mealsRead = await CookListMealActionsInternal.read(meals.data.map(({ id }) => ({ id })));

    expect(mealsRead.length).toEqual(meals.data.length);

    mealsRead.forEach(meal => {
        const expectedMeal = meals.data.find(({ id }) => id === meal.id);

        expect(meal.id).toEqual(expectedMeal!.id);
        expect(meal.description).toEqual(expectedMeal!.description);
        expect(meal.meal).toEqual(expectedMeal!.meal);
        expect(meal.sequence).toEqual(expectedMeal!.sequence);
        expect(meal.createdBy).toEqual(user.userId);
        expect(meal.source).toEqual(expectedMeal!.source);
        expect(meal.recipeId).toEqual(null);
    });
});

test("should update meal", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const meal = {
        id: uuid(),
        description: uuid(),
        meal: uuid(),
        sequence: randomNumber(),
        source: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<CookListMealActions, "save">;

    const recipe = {
        recipeId: uuid(),
        name: uuid(),
        createdBy: user.userId,
        public: randomBit(),
    } satisfies ServiceParams<RecipeActions, "save">;

    await RecipeActions.save(recipe);

    await CookListMealActions.save(meal);

    const mealUpdate = {
        data: {
            ...meal,
            recipeId: recipe.recipeId,
            description: uuid(),
            meal: uuid(),
            sequence: randomNumber(),
            source: uuid(),
        },
    } satisfies PostCookListMealRequestBody;

    const res = await request(app).post(CookListEndpoint.postMeal).set(token).send(mealUpdate);
    expect(res.statusCode).toEqual(201);

    const mealsRead = await CookListMealActionsInternal.read(meal);

    expect(mealsRead.length).toEqual(1);

    const [updatedMeal] = mealsRead;

    expect(updatedMeal!.id).toEqual(meal.id);
    expect(updatedMeal!.description).toEqual(mealUpdate.data.description);
    expect(updatedMeal!.meal).toEqual(mealUpdate.data.meal);
    expect(updatedMeal!.sequence).toEqual(mealUpdate.data.sequence);
    expect(updatedMeal!.createdBy).toEqual(user.userId);
    expect(updatedMeal!.source).toEqual(mealUpdate.data.source);
    expect(updatedMeal!.recipeId).toEqual(mealUpdate.data.recipeId);
});

test("should fail to update meal belonging to other user", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers();

    const meal = {
        id: uuid(),
        description: uuid(),
        meal: uuid(),
        sequence: randomNumber(),
        source: uuid(),
        createdBy: otherUser!.userId,
    } satisfies ServiceParams<CookListMealActions, "save">;

    await CookListMealActions.save(meal);

    const mealUpdate = {
        data: {
            ...meal,
            description: uuid(),
            meal: uuid(),
            sequence: randomNumber(),
            source: uuid(),
        },
    } satisfies PostCookListMealRequestBody;

    const res = await request(app).post(CookListEndpoint.postMeal).set(token).send(mealUpdate);
    expect(res.statusCode).toEqual(403);

    const mealsRead = await CookListMealActionsInternal.read(meal);

    expect(mealsRead.length).toEqual(1);

    const [updatedMeal] = mealsRead;

    expect(updatedMeal!.id).toEqual(meal.id);
    expect(updatedMeal!.description).toEqual(meal.description);
    expect(updatedMeal!.meal).toEqual(meal.meal);
    expect(updatedMeal!.sequence).toEqual(meal.sequence);
    expect(updatedMeal!.createdBy).toEqual(otherUser!.userId);
    expect(updatedMeal!.source).toEqual(meal.source);
    expect(updatedMeal!.recipeId).toEqual(null);
});
