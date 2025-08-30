import { expect } from "expect";
import { before, describe, it } from "node:test";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import type { CookListMeal } from "../../src/controllers/cookListMeal.ts";
import { CookListMealActions, CookListMealActionsInternal, RecipeActions } from "../../src/controllers/index.ts";
import { type RecipeService } from "../../src/controllers/spec/index.ts";
import { type ServiceParams } from "../../src/database/index.ts";
import { type GetCookListMealsResponse, type PostCookListMealRequestBody } from "../../src/routes/spec/index.ts";
import {
    CookListEndpoint,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomCount,
    randomNumber,
} from "../helpers/index.ts";

describe("post meal", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(CookListEndpoint.postMeal);

        expect(res.statusCode).toEqual(401);
    });

    it("should create new meal", async () => {
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

    it("should update meal", async () => {
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
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        await RecipeActions.Save(recipe);

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

    it("should fail to update meal belonging to other user", async () => {
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
});

describe("delete meal", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(CookListEndpoint.deleteMeal(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should delete meal belonging to user", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const meal = {
            id: uuid(),
            description: uuid(),
            meal: uuid(),
            sequence: 0,
            source: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<CookListMealActions, "save">;

        await CookListMealActions.save(meal);

        const mealsBeforeDeletion = await CookListMealActionsInternal.read(meal);

        expect(mealsBeforeDeletion.length).toEqual(1);

        const res = await request(app).delete(CookListEndpoint.deleteMeal(meal.id)).set(token).send();
        expect(res.statusCode).toEqual(201);

        const mealsAfterDeletion = await CookListMealActionsInternal.read(meal);

        expect(mealsAfterDeletion.length).toEqual(0);
    });

    it("should not delete meal belonging to another user", async () => {
        const [token] = await PrepareAuthenticatedUser();
        const [otherUser] = await CreateUsers();

        const meal = {
            id: uuid(),
            description: uuid(),
            meal: uuid(),
            sequence: 0,
            source: uuid(),
            createdBy: otherUser!.userId,
        } satisfies ServiceParams<CookListMealActions, "save">;

        await CookListMealActions.save(meal);

        const mealsBeforeDeletion = await CookListMealActionsInternal.read(meal);

        expect(mealsBeforeDeletion.length).toEqual(1);

        const res = await request(app).delete(CookListEndpoint.deleteMeal(meal.id)).set(token).send();
        expect(res.statusCode).toEqual(403);

        const mealsAfterDeletion = await CookListMealActionsInternal.read(meal);

        expect(mealsAfterDeletion.length).toEqual(1);
    });
});

describe("get meals", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(CookListEndpoint.getMeals);

        expect(res.statusCode).toEqual(401);
    });

    it("should return cook list meals for a user", async () => {
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

    it("should not return cook list meals for other users", async () => {
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
});
