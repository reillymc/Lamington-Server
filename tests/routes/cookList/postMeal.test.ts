import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { CleanTables, CookListEndpoint, PrepareAuthenticatedUser, randomNumber } from "../../helpers";
import { PostCookListMealRequestBody } from "../../../src/routes/spec";
import { CookListMealActionsInternal } from "../../../src/controllers";

beforeEach(async () => {
    await CleanTables("user", "planner_meal");
});

afterAll(async () => {
    await CleanTables("user", "planner_meal");
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
