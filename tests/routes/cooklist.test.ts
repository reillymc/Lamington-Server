import { expect } from "expect";
import type { Express } from "express";
import { afterEach, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import { KnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { CreateUsers, PrepareAuthenticatedUser, randomBoolean, randomNumber } from "../helpers/index.ts";

describe("post meal", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post("/v1/cooklist/meals");

        expect(res.statusCode).toEqual(401);
    });

    it("should create new meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const meals = Array.from({ length: randomNumber(5, 1) }).map((_, i) => ({
            description: uuid(),
            course: "dinner",
            sequence: i + 1,
            source: uuid(),
        })) satisfies components["schemas"]["CookListMealCreate"][];

        const res = await request(app).post("/v1/cooklist/meals").set(token).send(meals);
        expect(res.statusCode).toEqual(201);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(database, { userId: user.userId });

        expect(mealsRead.length).toEqual(meals.length);

        mealsRead.forEach(meal => {
            const expectedMeal = meals.find(m => m.description === meal.description);

            expect(meal.description).toEqual(expectedMeal!.description);
            expect(meal.sequence).toEqual(expectedMeal!.sequence);
            expect(meal.owner.userId).toEqual(user.userId);
            expect(meal.source).toEqual(expectedMeal!.source);
            expect(meal.recipeId).toEqual(null);
        });
    });
});

describe("patch meal", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("should update meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [
                {
                    name: uuid(),
                    public: randomBoolean(),
                },
            ],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: "dinner",
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const mealUpdate = {
            recipeId: recipe!.recipeId,
            description: uuid(),
            sequence: randomNumber(),
            source: uuid(),
        } satisfies components["schemas"]["CookListMealUpdate"];

        const res = await request(app).patch(`/v1/cooklist/meals/${createdMeal!.mealId}`).set(token).send(mealUpdate);
        expect(res.statusCode).toEqual(200);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(database, {
            userId: user.userId,
        });

        expect(mealsRead.length).toEqual(1);

        const [updatedMeal] = mealsRead;

        expect(updatedMeal!.mealId).toEqual(createdMeal!.mealId);
        expect(updatedMeal!.description).toEqual(mealUpdate.description);
        expect(updatedMeal!.sequence).toEqual(mealUpdate.sequence);
        expect(updatedMeal!.owner.userId).toEqual(user.userId);
        expect(updatedMeal!.source).toEqual(mealUpdate.source);
        expect(updatedMeal!.recipeId).toEqual(mealUpdate.recipeId);
    });

    it("should fail to update meal belonging to other user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: otherUser!.userId,
            meals: [
                {
                    description: uuid(),
                    course: "dinner",
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const mealUpdate = {
            description: uuid(),
            sequence: randomNumber(),
            source: uuid(),
        } satisfies components["schemas"]["CookListMealUpdate"];

        const res = await request(app).patch(`/v1/cooklist/meals/${createdMeal!.mealId}`).set(token).send(mealUpdate);
        expect(res.statusCode).toEqual(404);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(database, {
            userId: otherUser!.userId,
        });

        expect(mealsRead.length).toEqual(1);

        const [unchangedMeal] = mealsRead;

        expect(unchangedMeal!.description).toEqual(createdMeal!.description);
    });
});

describe("delete meal", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(`/v1/cooklist/meals/${uuid()}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should delete meal belonging to user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: "dinner",
                    sequence: 0,
                    source: uuid(),
                },
            ],
        });

        const res = await request(app).delete(`/v1/cooklist/meals/${createdMeal!.mealId}`).set(token).send();
        expect(res.statusCode).toEqual(204);

        const { meals: mealsAfterDeletion } = await KnexCookListRepository.readAllMeals(database, {
            userId: user.userId,
        });

        expect(mealsAfterDeletion.length).toEqual(0);
    });

    it("should not delete meal belonging to another user", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: otherUser!.userId,
            meals: [
                {
                    description: uuid(),
                    course: "dinner",
                    sequence: 0,
                    source: uuid(),
                },
            ],
        });

        const res = await request(app).delete(`/v1/cooklist/meals/${createdMeal!.mealId}`).set(token).send();
        expect(res.statusCode).toEqual(404);

        const { meals: mealsAfterDeletion } = await KnexCookListRepository.readAllMeals(database, {
            userId: otherUser!.userId,
        });

        expect(mealsAfterDeletion.length).toEqual(1);
    });
});

describe("get meals", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get("/v1/cooklist/meals");

        expect(res.statusCode).toEqual(401);
    });

    it("should return cook list meals for a user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: "dinner",
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const res = await request(app).get("/v1/cooklist/meals").set(token);

        expect(res.statusCode).toEqual(200);

        const cookListMealData = res.body as components["schemas"]["CookListMeal"][];

        expect(cookListMealData.length).toEqual(1);

        const [plannerMeal] = cookListMealData;

        expect(plannerMeal!.mealId).toEqual(createdMeal!.mealId);
        expect(plannerMeal!.description).toEqual(createdMeal!.description);
        expect(plannerMeal!.source).toEqual(createdMeal!.source);
        expect(plannerMeal!.sequence).toEqual(createdMeal!.sequence);
        expect(plannerMeal!.owner.userId).toEqual(user.userId);
        expect(plannerMeal!.recipeId).toEqual(null);
    });

    it("should not return cook list meals for other users", async () => {
        const [_, user] = await PrepareAuthenticatedUser(database);
        const [otherUserToken] = await PrepareAuthenticatedUser(database);

        await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: "dinner",
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const res = await request(app).get("/v1/cooklist/meals").set(otherUserToken);

        expect(res.statusCode).toEqual(200);

        const cookListMealData = res.body as components["schemas"]["CookListMeal"][];

        expect(cookListMealData.length).toEqual(0);
    });
});
