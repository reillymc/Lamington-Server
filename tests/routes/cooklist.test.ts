import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import { KnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { KnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomDay,
    randomMonth,
    randomNumber,
    randomYear,
} from "../helpers/index.ts";
import { randomCourse } from "../helpers/meal.ts";

after(async () => {
    await db.destroy();
});

describe("Add meal to cook list", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).post("/v1/cooklist/meals");

        expect(res.statusCode).toEqual(401);
    });

    it("should create a new meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const meals = Array.from({ length: randomNumber(5, 1) }).map(
            (_, i) => ({
                description: uuid(),
                course: randomCourse(),
                sequence: i + 1,
                source: uuid(),
            }),
        ) satisfies components["schemas"]["CookListMealCreate"][];

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send(meals);
        expect(res.statusCode).toEqual(201);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(
            database,
            user,
        );

        expect(mealsRead.length).toEqual(meals.length);

        mealsRead.forEach((meal) => {
            const expectedMeal = meals.find(
                (m) => m.description === meal.description,
            );

            expect(meal.description).toEqual(expectedMeal!.description);
            expect(meal.sequence).toEqual(expectedMeal!.sequence);
            expect(meal.owner.userId).toEqual(user.userId);
            expect(meal.source).toEqual(expectedMeal!.source);
            expect(meal.recipeId).toEqual(undefined);
        });
    });

    it("should create a new meal with a recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const meal = {
            description: uuid(),
            course: randomCourse(),
            sequence: 1,
            source: uuid(),
            recipeId: recipe!.recipeId,
        } satisfies components["schemas"]["CookListMealCreate"];

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send(meal);
        expect(res.statusCode).toEqual(201);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(
            database,
            user,
        );
        expect(mealsRead).toHaveLength(1);
        expect(mealsRead[0]!.recipeId).toEqual(recipe!.recipeId);
    });

    it("should create multiple cooklist meals", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const meals = [
            {
                description: uuid(),
                course: randomCourse(),
                sequence: 1,
                source: uuid(),
            },
            {
                description: uuid(),
                course: "lunch",
                sequence: 2,
                source: uuid(),
            },
        ] satisfies components["schemas"]["CookListMealCreate"][];

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send(meals);
        expect(res.statusCode).toEqual(201);

        const returnedMeals =
            res.body as components["schemas"]["CookListMeal"][];
        expect(returnedMeals).toHaveLength(2);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send({
                description: uuid(),
                course: randomCourse(),
                extra: "invalid",
            });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send({
                description: uuid(),
                course: "invalid_course",
            });

        expect(res.statusCode).toEqual(400);
    });

    it("should return 400 if the request body is an empty array", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post("/v1/cooklist/meals")
            .set(token)
            .send([]);

        expect(res.statusCode).toEqual(400);
    });
});

describe("Update meal in cook list", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).patch(`/v1/cooklist/meals/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should update the meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
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

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send(mealUpdate);
        expect(res.statusCode).toEqual(200);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(
            database,
            {
                userId: user.userId,
            },
        );

        expect(mealsRead.length).toEqual(1);

        const [updatedMeal] = mealsRead;

        expect(updatedMeal!.mealId).toEqual(createdMeal!.mealId);
        expect(updatedMeal!.description).toEqual(mealUpdate.description);
        expect(updatedMeal!.sequence).toEqual(mealUpdate.sequence);
        expect(updatedMeal!.owner.userId).toEqual(user.userId);
        expect(updatedMeal!.source).toEqual(mealUpdate.source);
        expect(updatedMeal!.recipeId).toEqual(mealUpdate.recipeId);
    });

    it("should clear optional fields when set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: 1,
                    source: uuid(),
                    recipeId: recipe!.recipeId,
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send({
                description: null,
                sequence: null,
                source: null,
                recipeId: null,
            });

        expect(res.statusCode).toEqual(200);
        const updatedMeal = res.body as components["schemas"]["CookListMeal"];
        expect(updatedMeal.description).toBeUndefined();
        expect(updatedMeal.sequence).toBeUndefined();
        expect(updatedMeal.source).toBeUndefined();
        expect(updatedMeal.recipeId).toBeUndefined();
    });

    it("should fail to update a meal belonging to another user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: otherUser!.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
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

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send(mealUpdate);
        expect(res.statusCode).toEqual(404);

        const { meals: mealsRead } = await KnexCookListRepository.readAllMeals(
            database,
            {
                userId: otherUser!.userId,
            },
        );

        expect(mealsRead.length).toEqual(1);

        const [unchangedMeal] = mealsRead;

        expect(unchangedMeal!.description).toEqual(createdMeal!.description);
    });

    it("should fail to update a planner meal via cooklist endpoint", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: randomCourse(),
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${plannerMeal!.mealId}`)
            .set(token)
            .send({ description: "Updated" });

        expect(res.statusCode).toEqual(404);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [meal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [{ course: randomCourse(), description: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${meal!.mealId}`)
            .set(token)
            .send({
                description: uuid(),
                extra: "invalid",
            });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [meal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [{ course: randomCourse(), description: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${meal!.mealId}`)
            .set(token)
            .send({
                course: "invalid_course",
            });

        expect(res.statusCode).toEqual(400);
    });

    it("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [meal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [{ course: randomCourse(), description: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/cooklist/meals/${meal!.mealId}`)
            .set(token)
            .send({ course: null });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Remove meal from cook list", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).delete(`/v1/cooklist/meals/${uuid()}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should delete a meal belonging to the user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: 0,
                    source: uuid(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(204);

        const { meals: mealsAfterDeletion } =
            await KnexCookListRepository.readAllMeals(database, {
                userId: user.userId,
            });

        expect(mealsAfterDeletion.length).toEqual(0);
    });

    it("should not delete a meal belonging to another user", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: otherUser!.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: 0,
                    source: uuid(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/cooklist/meals/${createdMeal!.mealId}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(404);

        const { meals: mealsAfterDeletion } =
            await KnexCookListRepository.readAllMeals(database, {
                userId: otherUser!.userId,
            });

        expect(mealsAfterDeletion.length).toEqual(1);
    });

    it("should fail to delete a planner meal via cooklist endpoint", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: randomCourse(),
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/cooklist/meals/${plannerMeal!.mealId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });
});

describe("Get cook list meals", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
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
                    course: randomCourse(),
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const res = await request(app).get("/v1/cooklist/meals").set(token);

        expect(res.statusCode).toEqual(200);

        const cookListMealData =
            res.body as components["schemas"]["CookListMeal"][];

        expect(cookListMealData.length).toEqual(1);

        const [meal] = cookListMealData;

        expect(meal!.mealId).toEqual(createdMeal!.mealId);
        expect(meal!.description).toEqual(createdMeal!.description);
        expect(meal!.source).toEqual(createdMeal!.source);
        expect(meal!.sequence).toEqual(createdMeal!.sequence);
        expect(meal!.owner.userId).toEqual(user.userId);
        expect(meal!.recipeId).toEqual(undefined);
    });

    it("should not return cook list meals for other users", async () => {
        const [_, user] = await PrepareAuthenticatedUser(database);
        const [otherUserToken] = await PrepareAuthenticatedUser(database);

        await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    description: uuid(),
                    course: randomCourse(),
                    sequence: randomNumber(),
                    source: uuid(),
                },
            ],
        });

        const res = await request(app)
            .get("/v1/cooklist/meals")
            .set(otherUserToken);

        expect(res.statusCode).toEqual(200);

        const cookListMealData =
            res.body as components["schemas"]["CookListMeal"][];

        expect(cookListMealData.length).toEqual(0);
    });

    it("should not return planner meals", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: randomCourse(),
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app).get("/v1/cooklist/meals").set(token);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(0);
    });
});
