import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { CookListMeal, CookListMealActions } from "../../../src/controllers/cookListMeal";
import { GetCookListMealsResponse } from "../../../src/routes/spec";
import { CookListEndpoint, PrepareAuthenticatedUser, randomCount } from "../../helpers";

test("route should require authentication", async () => {
    const res = await request(app).get(CookListEndpoint.getMeals);

    expect(res.statusCode).toEqual(401);
});

test("should return cook list meals for a user", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const meal = {
        id: uuid(),
        recipeId: undefined,
        description: uuid(),
        meal: uuid(),
        sequence: randomCount,
        source: uuid(),
        createdBy: user.userId,
    } satisfies CookListMeal;

    await CookListMealActions.save(meal);

    const res = await request(app).get(CookListEndpoint.getMeals).set(token);

    expect(res.statusCode).toEqual(200);

    const { data: cookListMealData } = res.body as GetCookListMealsResponse;

    if (!cookListMealData) throw new Error("No cook list meals returned");

    expect(cookListMealData.length).toEqual(1);

    const [plannerMeal] = cookListMealData;

    if (!plannerMeal) throw new Error("No cook list meal found");

    expect(plannerMeal.id).toEqual(meal.id);
    expect(plannerMeal.meal).toEqual(meal.meal);
    expect(plannerMeal.description).toEqual(meal.description);
    expect(plannerMeal.source).toEqual(meal.source);
    expect(plannerMeal.sequence).toEqual(meal.sequence);
    expect(plannerMeal.createdBy).toEqual(meal.createdBy);
    expect(plannerMeal.recipeId).toEqual(null);
});

test("should not return cook list meals for other users", async () => {
    const [_, user] = await PrepareAuthenticatedUser();
    const [otherUserToken] = await PrepareAuthenticatedUser();

    const meal = {
        id: uuid(),
        recipeId: undefined,
        description: uuid(),
        meal: uuid(),
        sequence: randomCount,
        source: uuid(),
        createdBy: user.userId,
    } satisfies CookListMeal;

    await CookListMealActions.save(meal);

    const res = await request(app).get(CookListEndpoint.getMeals).set(otherUserToken);

    expect(res.statusCode).toEqual(200);

    const { data: cookListMealData } = res.body as GetCookListMealsResponse;

    if (!cookListMealData) throw new Error("No cook list meals returned");

    expect(cookListMealData.length).toEqual(0);
});
