import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import { KnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { KnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import { type components, UserStatus } from "../../src/routes/spec/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomDay,
    randomMonth,
    randomYear,
} from "../helpers/index.ts";

after(async () => {
    await db.destroy();
});

describe("Get a meal by ID", () => {
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
        const res = await request(app).get(`/v1/meals/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent meal", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app).get(`/v1/meals/${uuid()}`).set(token);
        expect(res.statusCode).toEqual(404);
    });

    it("should return a planner meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: "dinner",
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .get(`/v1/meals/${createdMeal!.mealId}`)
            .set(token);

        expect(res.statusCode).toEqual(200);
        const meal = res.body as components["schemas"]["Meal"];
        expect(meal.mealId).toEqual(createdMeal!.mealId);
        expect(meal.plannerId).toEqual(planner!.plannerId);
        expect(meal.description).toEqual(createdMeal!.description);
        expect(meal.owner.userId).toEqual(user.userId);
    });

    it("should return a cooklist meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                {
                    course: "dinner",
                    description: uuid(),
                    sequence: 1,
                },
            ],
        });

        const res = await request(app)
            .get(`/v1/meals/${createdMeal!.mealId}`)
            .set(token);

        expect(res.statusCode).toEqual(200);
        const meal = res.body as components["schemas"]["Meal"];
        expect(meal.mealId).toEqual(createdMeal!.mealId);
        expect(meal.plannerId).toBeUndefined();
        expect(meal.description).toEqual(createdMeal!.description);
        expect(meal.owner.userId).toEqual(user.userId);
    });

    it("should return a planner meal for allowed member statuses (A, M)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = [UserStatus.Administrator, UserStatus.Member];

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: owner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const {
                meals: [createdMeal],
            } = await KnexPlannerRepository.createMeals(database, {
                userId: owner!.userId,
                plannerId: planner!.plannerId,
                meals: [
                    {
                        course: "dinner",
                        description: uuid(),
                        dayOfMonth: randomDay(),
                        month: randomMonth(),
                        year: randomYear(),
                    },
                ],
            });

            const res = await request(app)
                .get(`/v1/meals/${createdMeal!.mealId}`)
                .set(token);

            expect(res.statusCode).toEqual(200);
            const meal = res.body as components["schemas"]["Meal"];
            expect(meal.mealId).toEqual(createdMeal!.mealId);
        }
    });

    it("should return 404 for a planner meal if user is blacklisted or pending", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = [UserStatus.Pending, UserStatus.Blacklisted];

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: owner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const {
                meals: [createdMeal],
            } = await KnexPlannerRepository.createMeals(database, {
                userId: owner!.userId,
                plannerId: planner!.plannerId,
                meals: [
                    {
                        course: "dinner",
                        description: uuid(),
                        dayOfMonth: randomDay(),
                        month: randomMonth(),
                        year: randomYear(),
                    },
                ],
            });

            const res = await request(app)
                .get(`/v1/meals/${createdMeal!.mealId}`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should return 404 for a meal belonging to another user (cooklist)", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            meals: [createdMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: otherUser!.userId,
            meals: [{ course: "dinner", description: uuid() }],
        });

        const res = await request(app)
            .get(`/v1/meals/${createdMeal!.mealId}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return 404 for a meal belonging to another user (planner)", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: otherUser!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: otherUser!.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: "dinner",
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .get(`/v1/meals/${createdMeal!.mealId}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });
});
