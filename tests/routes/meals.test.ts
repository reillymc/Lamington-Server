import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { components } from "../../src/routes/spec/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomDay,
    randomMonth,
    randomYear,
} from "../helpers/index.ts";
import {
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "../helpers/setup.ts";

let { app, cooklistRepository, plannerRepository, userRepository } =
    TestContext;

beforeEach(async () => {
    await beginTestTransaction();
    ({ app, cooklistRepository, plannerRepository, userRepository } =
        createTestApp({}));
});

afterEach(async () => {
    await rollbackTestTransaction();
});

describe("Get a meal by ID", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).get(`/v1/meals/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 404 for non-existent meal", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);
        const res = await request(app).get(`/v1/meals/${uuid()}`).set(token);
        expect(res.statusCode).toEqual(404);
    });

    withCxIt("should return a planner meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            planners: [planner],
        } = await plannerRepository.create({
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [createdMeal],
        } = await plannerRepository.createMeals({
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

    withCxIt("should return a cooklist meal", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const {
            meals: [createdMeal],
        } = await cooklistRepository.createMeals({
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

    withCxIt(
        "should return a planner meal for allowed member statuses (A, M)",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);

            const statuses = ["A", "M"] as const;

            for (const status of statuses) {
                const {
                    planners: [planner],
                } = await plannerRepository.create({
                    userId: owner!.userId,
                    planners: [{ name: uuid(), description: uuid() }],
                });

                await plannerRepository.saveMembers({
                    plannerId: planner!.plannerId,
                    members: [{ userId: user.userId, status }],
                });

                const {
                    meals: [createdMeal],
                } = await plannerRepository.createMeals({
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
        },
    );

    withCxIt(
        "should return 404 for a planner meal if user is blacklisted or pending",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);

            const statuses = ["P", "B"] as const;

            for (const status of statuses) {
                const {
                    planners: [planner],
                } = await plannerRepository.create({
                    userId: owner!.userId,
                    planners: [{ name: uuid(), description: uuid() }],
                });

                await plannerRepository.saveMembers({
                    plannerId: planner!.plannerId,
                    members: [{ userId: user.userId, status }],
                });

                const {
                    meals: [createdMeal],
                } = await plannerRepository.createMeals({
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
        },
    );

    withCxIt(
        "should return 404 for a meal belonging to another user (cooklist)",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);
            const [otherUser] = await CreateUsers(userRepository);

            const {
                meals: [createdMeal],
            } = await cooklistRepository.createMeals({
                userId: otherUser!.userId,
                meals: [{ course: "dinner", description: uuid() }],
            });

            const res = await request(app)
                .get(`/v1/meals/${createdMeal!.mealId}`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        },
    );

    withCxIt(
        "should return 404 for a meal belonging to another user (planner)",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);
            const [otherUser] = await CreateUsers(userRepository);

            const {
                planners: [planner],
            } = await plannerRepository.create({
                userId: otherUser!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            const {
                meals: [createdMeal],
            } = await plannerRepository.createMeals({
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
        },
    );
});
