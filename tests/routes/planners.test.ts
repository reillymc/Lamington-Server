import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import db from "../../src/database/index.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexAttachmentRepository } from "../../src/repositories/knex/knexAttachmentRepository.ts";
import { KnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { KnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomDay,
    randomMonth,
    randomYear,
} from "../helpers/index.ts";
import { randomCourse } from "../helpers/meal.ts";

const randomMeal = () =>
    ({
        dayOfMonth: randomDay(),
        month: randomMonth(),
        course: randomCourse(),
        year: randomYear(),
        description: uuid(),
    }) satisfies components["schemas"]["PlannerMealCreate"];

const randomColor = (): components["schemas"]["PlannerColor"] =>
    (["variant1", "variant2", "variant3", "variant4", "variant5"] as const)[
        Math.floor(Math.random() * 5)
    ]!;

after(async () => {
    await db.destroy();
});

describe("Get user planners", () => {
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
        const res = await request(app).get("/v1/planners");
        expect(res.statusCode).toEqual(401);
    });

    it("should return all planners created by the user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { planners } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [
                { name: uuid(), description: uuid() },
                { name: uuid(), description: uuid() },
                { name: uuid(), description: uuid() },
            ],
        });

        const res = await request(app).get("/v1/planners").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["Planner"][];

        expect(body).toHaveLength(3);

        const ids = body.map((p) => p.plannerId);
        expect(ids).toContain(planners[0]!.plannerId);
        expect(ids).toContain(planners[1]!.plannerId);
        expect(ids).toContain(planners[2]!.plannerId);
    });

    it("should return planners a user is a member of", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const { planners } = await KnexPlannerRepository.create(database, {
            userId: otherUser!.userId,
            planners: [
                { name: uuid(), description: uuid() },
                { name: uuid(), description: uuid() },
                { name: uuid(), description: uuid() },
            ],
        });

        const [adminPlanner, memberPlanner, pendingPlanner] = planners;

        await KnexPlannerRepository.saveMembers(database, [
            {
                plannerId: adminPlanner!.plannerId,
                members: [{ userId: user.userId, status: "A" }],
            },
            {
                plannerId: memberPlanner!.plannerId,
                members: [{ userId: user.userId, status: "M" }],
            },
            {
                plannerId: pendingPlanner!.plannerId,
                members: [{ userId: user.userId, status: "P" }],
            },
        ]);

        const res = await request(app).get("/v1/planners").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["Planner"][];
        const ids = body.map((p) => p.plannerId);

        expect(ids).toContain(adminPlanner!.plannerId);
        expect(ids).toContain(memberPlanner!.plannerId);
        expect(ids).toContain(pendingPlanner!.plannerId);
    });

    it("should not return planners where the user is blacklisted", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const { planners } = await KnexPlannerRepository.create(database, {
            userId: otherUser!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const [blockedPlanner] = planners;

        await KnexPlannerRepository.saveMembers(database, [
            {
                plannerId: blockedPlanner!.plannerId,
                members: [{ userId: user.userId, status: "B" }],
            },
        ]);

        const res = await request(app).get("/v1/planners").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["Planner"][];
        const ids = body.map((p) => p.plannerId);

        expect(ids).not.toContain(blockedPlanner!.plannerId);
    });

    it("should not return planners belonging to other users", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: otherUser!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app).get("/v1/planners").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["Planner"][];
        const found = body.find((p) => p.plannerId === planner!.plannerId);
        expect(found).toBeUndefined();
    });

    it("should return correct planner details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const plannerData: components["schemas"]["PlannerCreate"] = {
            name: uuid(),
            description: uuid(),
            color: randomColor(),
        };

        const {
            planners: [createdPlanner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [plannerData],
        });

        const res = await request(app).get("/v1/planners").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["Planner"][];
        const planner = body.find(
            (p) => p.plannerId === createdPlanner!.plannerId,
        );

        expect(planner).toBeDefined();
        expect(planner!.plannerId).toBeDefined();
        expect(planner!.name).toEqual(plannerData.name);
        expect(planner!.description).toEqual(plannerData.description);
        expect(planner!.color).toEqual(plannerData.color);
        expect(planner!.owner.userId).toEqual(user.userId);
        expect(planner!.owner.firstName).toEqual(user.firstName);
        expect(planner!.status).toEqual("O");
    });
});

describe("Get a planner", () => {
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
        const res = await request(app).get(`/v1/planners/${uuid()}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).get(`/v1/planners/${uuid()}`).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not return a planner the user doesn't have access to", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [
                { name: uuid(), description: uuid(), color: randomColor() },
            ],
        });

        const res = await request(app)
            .get(`/v1/planners/${planner!.plannerId}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return correct planner details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [
                { name: uuid(), description: uuid(), color: randomColor() },
            ],
        });

        const res = await request(app)
            .get(`/v1/planners/${planner!.plannerId}`)
            .set(token);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["Planner"];

        expect(data?.plannerId).toEqual(planner!.plannerId);
        expect(data?.name).toEqual(planner!.name);
        expect(data?.description).toEqual(planner!.description);
        expect(data?.color).toEqual(planner!.color);
        expect(data?.owner.userId).toEqual(user.userId);
        expect(data?.owner.firstName).toEqual(user.firstName);
        expect(data?.status).toEqual("O");
    });

    it("should return the planner for allowed member statuses (A, M)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const statuses = ["A", "M"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: plannerOwner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(`/v1/planners/${planner!.plannerId}`)
                .set(token);

            expect(res.statusCode).toEqual(200);

            const data = res.body as components["schemas"]["Planner"];
            expect(data?.plannerId).toEqual(planner!.plannerId);
            expect(data?.status).toEqual(status);
        }
    });

    it("should return 404 for disallowed member statuses (P, B)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const statuses = ["P", "B"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: plannerOwner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(`/v1/planners/${planner!.plannerId}`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Delete a planner", () => {
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
        const res = await request(app).delete(`/v1/planners/${uuid()}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .delete(`/v1/planners/${uuid()}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if the user is not the planner owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .delete(`/v1/planners/${planner!.plannerId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if the user is a planner member but not the owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [
                {
                    name: uuid(),
                    description: uuid(),
                },
            ],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: user!.userId, status: "A" }],
        });

        const res = await request(app)
            .delete(`/v1/planners/${planner!.plannerId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should successfully delete the planner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .delete(`/v1/planners/${planner!.plannerId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { planners } = await KnexPlannerRepository.read(database, {
            planners: [planner!],
            userId: user.userId,
        });

        expect(planners.length).toEqual(0);
    });
});

describe("Get planner meals", () => {
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
        const res = await request(app).get(
            `/v1/planners/${uuid()}/meals/${randomYear()}/${randomMonth()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should return the list of meals", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [meal],
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
            .get(
                `/v1/planners/${planner!.plannerId}/meals/${meal!.year}/${meal!.month}`,
            )
            .set(token);

        expect(res.statusCode).toEqual(200);

        const plannerMealData = res.body;

        expect(plannerMealData.length).toEqual(1);

        const [plannerMeal] = plannerMealData;

        if (!plannerMeal) throw new Error("No planner meal found");

        expect(plannerMeal.mealId).toEqual(meal!.mealId);
        expect(plannerMeal.course).toEqual(meal!.course);
        expect(plannerMeal.description).toEqual(meal!.description);
        expect(plannerMeal.plannerId).toEqual(meal!.plannerId);
        expect(plannerMeal.dayOfMonth).toEqual(meal!.dayOfMonth);
        expect(plannerMeal.month).toEqual(meal!.month);
        expect(plannerMeal.year).toEqual(meal!.year);
        expect(plannerMeal.owner.userId).toEqual(user.userId);
        expect(plannerMeal.recipeId).toEqual(undefined);
    });

    it("should return 404 if the user does not have permissions for the planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .get(
                `/v1/planners/${planner!.plannerId}/meals/${randomYear()}/${randomMonth()}`,
            )
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should only return meals within the requested year and month", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const targetYear = 2023;
        const targetMonth = 5;

        const {
            meals: [targetMeal, wrongMonthMeal, wrongYearMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: randomCourse(),
                    description: "Target Meal",
                    dayOfMonth: 1,
                    month: targetMonth,
                    year: targetYear,
                },
                {
                    course: "lunch",
                    description: "Wrong Month",
                    dayOfMonth: 1,
                    month: targetMonth + 1,
                    year: targetYear,
                },
                {
                    course: "breakfast",
                    description: "Wrong Year",
                    dayOfMonth: 1,
                    month: targetMonth,
                    year: targetYear + 1,
                },
            ],
        });

        const res = await request(app)
            .get(
                `/v1/planners/${planner!.plannerId}/meals/${targetYear}/${targetMonth}`,
            )
            .set(token);

        expect(res.statusCode).toEqual(200);

        const plannerMealData =
            res.body as components["schemas"]["PlannerMeal"][];

        expect(plannerMealData).toHaveLength(1);
        expect(plannerMealData[0]!.mealId).toEqual(targetMeal!.mealId);
        expect(
            plannerMealData.find((m) => m.mealId === wrongMonthMeal!.mealId),
        ).toBeUndefined();
        expect(
            plannerMealData.find((m) => m.mealId === wrongYearMeal!.mealId),
        ).toBeUndefined();
    });

    it("should return planner meals for allowed member statuses (A, M)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const statuses = ["A", "M"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: plannerOwner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const {
                meals: [meal],
            } = await KnexPlannerRepository.createMeals(database, {
                userId: plannerOwner!.userId,
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
                .get(
                    `/v1/planners/${planner!.plannerId}/meals/${meal!.year}/${meal!.month}`,
                )
                .set(token);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].mealId).toEqual(meal!.mealId);
        }
    });

    it("should return 404 for planner meals if the user is blacklisted or pending", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const statuses = ["B", "P"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: plannerOwner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(
                    `/v1/planners/${planner!.plannerId}/meals/${randomYear()}/${randomMonth()}`,
                )
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should not return cooklist meals", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const year = randomYear();
        const month = randomMonth();

        await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                { description: uuid(), course: randomCourse(), sequence: 1 },
            ],
        });

        await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    course: randomCourse(),
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month,
                    year,
                },
            ],
        });

        const res = await request(app)
            .get(`/v1/planners/${planner!.plannerId}/meals/${year}/${month}`)
            .set(token);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
    });
});

describe("Create a planner", () => {
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
        const res = await request(app).post("/v1/planners");

        expect(res.statusCode).toEqual(401);
    });

    it("should successfully create a new planner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const planner = {
            name: uuid(),
            description: uuid(),
            color: randomColor(),
        } satisfies components["schemas"]["PlannerCreate"];

        const res = await request(app)
            .post("/v1/planners")
            .set(token)
            .send(planner);

        expect(res.statusCode).toEqual(201);

        const { planners: savedPlanners } = await KnexPlannerRepository.readAll(
            database,
            user,
        );

        expect(savedPlanners.length).toEqual(1);

        const [savedPlanner] = savedPlanners;

        expect(savedPlanner?.name).toEqual(planner.name);
        expect(savedPlanner?.color).toEqual(planner.color);
        expect(savedPlanner?.description).toEqual(planner.description);
        expect(savedPlanner?.owner.userId).toEqual(user.userId);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).post("/v1/planners").set(token).send({
            name: uuid(),
            description: uuid(),
            color: randomColor(),
            extra: "invalid",
        });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app).post("/v1/planners").set(token).send({
            name: 12345,
            description: uuid(),
            color: randomColor(),
        });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Update a planner", () => {
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
        const res = await request(app).patch(`/v1/planners/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app)
            .patch(`/v1/planners/${uuid()}`)
            .set(token)
            .send({ name: uuid() });
        expect(res.statusCode).toEqual(404);
    });

    it("should not allow update if the user is not the planner owner (A, M, P, B)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

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

            const res = await request(app)
                .patch(`/v1/planners/${planner!.plannerId}`)
                .set(token)
                .send({ name: uuid() });

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should save updated planner details when the user is the planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [
                { name: uuid(), description: uuid(), color: randomColor() },
            ],
        });

        const updatedPlanner = {
            name: uuid(),
            description: uuid(),
            color: randomColor(),
        } satisfies components["schemas"]["PlannerUpdate"];

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}`)
            .set(token)
            .send(updatedPlanner);

        expect(res.statusCode).toEqual(200);

        const {
            planners: [savedPlanner],
        } = await KnexPlannerRepository.read(database, {
            planners: [planner!],
            userId: user.userId,
        });

        expect(savedPlanner?.name).toEqual(updatedPlanner.name);
        expect(savedPlanner?.color).toEqual(updatedPlanner.color);
        expect(savedPlanner?.description).toEqual(updatedPlanner.description);
        expect(savedPlanner?.plannerId).toEqual(planner!.plannerId);
        expect(savedPlanner?.owner.userId).toEqual(user.userId);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}`)
            .set(token)
            .send({ extra: "invalid" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}`)
            .set(token)
            .send({ name: 12345 });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}`)
            .set(token)
            .send({ name: null });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Add a meal to a planner", () => {
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
        const res = await request(app).post(`/v1/planners/${uuid()}/meals`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post(`/v1/planners/${uuid()}/meals`)
            .set(token)
            .send({
                dayOfMonth: randomDay(),
                month: randomMonth(),
                course: randomCourse(),
                year: randomYear(),
                description: uuid(),
            } satisfies components["schemas"]["PlannerMealCreate"]);

        expect(res.statusCode).toEqual(404);
    });

    it("should create a planner meal and return the correct details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{ uri: uuid() }],
        });

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const mealData = {
            dayOfMonth: randomDay(),
            month: randomMonth(),
            course: randomCourse(),
            year: randomYear(),
            description: uuid(),
            heroImage: attachment!.attachmentId,
        } satisfies components["schemas"]["PlannerMealCreate"];

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send(mealData);

        expect(res.statusCode).toEqual(201);
        const [returnedMeal] =
            res.body as components["schemas"]["PlannerMeal"][];

        expect(returnedMeal!.plannerId).toEqual(planner!.plannerId);
        expect(returnedMeal!.dayOfMonth).toEqual(mealData.dayOfMonth);
        expect(returnedMeal!.month).toEqual(mealData.month);
        expect(returnedMeal!.year).toEqual(mealData.year);
        expect(returnedMeal!.course).toEqual(mealData.course);
        expect(returnedMeal!.description).toEqual(mealData.description);
        expect(returnedMeal!.owner.userId).toEqual(user.userId);
        expect(returnedMeal!.heroImage!.attachmentId).toEqual(
            mealData.heroImage,
        );
        expect(returnedMeal!.heroImage!.uri).toEqual(attachment!.uri);

        const { meals: savedMeals } = await KnexPlannerRepository.readAllMeals(
            database,
            {
                userId: user.userId,
                filter: { plannerId: planner!.plannerId },
            },
        );

        expect(savedMeals).toHaveLength(1);
        const [savedMeal] = savedMeals;

        expect(savedMeal!.mealId).toEqual(returnedMeal!.mealId);
        expect(savedMeal!.description).toEqual(mealData.description);
        expect(savedMeal!.dayOfMonth).toEqual(mealData.dayOfMonth);
        expect(savedMeal!.month).toEqual(mealData.month);
        expect(savedMeal!.year).toEqual(mealData.year);
        expect(savedMeal!.course).toEqual(mealData.course);
        expect(savedMeal!.heroImage!.attachmentId).toEqual(mealData.heroImage);
        expect(savedMeal!.heroImage!.uri).toEqual(attachment!.uri);
    });

    it("should create a planner meal with a recipe", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const mealData = {
            dayOfMonth: randomDay(),
            month: randomMonth(),
            course: randomCourse(),
            year: randomYear(),
            description: uuid(),
            recipeId: recipe!.recipeId,
        } satisfies components["schemas"]["PlannerMealCreate"];

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send(mealData);

        expect(res.statusCode).toEqual(201);
        const [returnedMeal] =
            res.body as components["schemas"]["PlannerMeal"][];
        expect(returnedMeal!.recipeId).toEqual(recipe!.recipeId);
    });

    it("should not allow adding a meal if the user is not the planner owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send({
                dayOfMonth: randomDay(),
                month: randomMonth(),
                course: randomCourse(),
                year: randomYear(),
                description: uuid(),
            } satisfies components["schemas"]["PlannerMealCreate"]);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow adding a meal if the user is a planner member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [
                {
                    name: uuid(),
                    description: uuid(),
                },
            ],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: user!.userId, status: "M" }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send({
                dayOfMonth: randomDay(),
                month: randomMonth(),
                course: randomCourse(),
                year: randomYear(),
                description: uuid(),
            } satisfies components["schemas"]["PlannerMealCreate"]);

        expect(res.statusCode).toEqual(404);
    });

    it("should allow adding a meal if the user is a planner member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const meal = {
            dayOfMonth: randomDay(),
            month: randomMonth(),
            course: randomCourse(),
            year: randomYear(),
            description: uuid(),
        } satisfies components["schemas"]["PlannerMealCreate"];

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: user!.userId, status: "A" }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send(meal);

        expect(res.statusCode).toEqual(201);

        const { meals: plannerMeals } =
            await KnexPlannerRepository.readAllMeals(database, {
                userId: user.userId,
                filter: { plannerId: planner!.plannerId },
            });

        expect(plannerMeals.length).toEqual(1);

        const [plannerMeal] = plannerMeals;

        expect(plannerMeal?.plannerId).toEqual(planner!.plannerId);
        expect(plannerMeal?.description).toEqual(meal.description);
    });

    it("should create multiple planner meals", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const meals = [randomMeal(), randomMeal()];

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send(meals);

        expect(res.statusCode).toEqual(201);
        const returnedMeals =
            res.body as components["schemas"]["PlannerMeal"][];
        expect(returnedMeals).toHaveLength(2);
    });

    it("should return 400 if the request body is an empty array", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send([]);
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send({
                dayOfMonth: randomDay(),
                month: randomMonth(),
                course: randomCourse(),
                year: randomYear(),
                description: uuid(),
                extra: "invalid",
            });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send({
                dayOfMonth: 80,
                month: 13,
                course: "unknown",
                year: 3000,
            });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Update a meal in a planner", () => {
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
        const res = await request(app).patch(
            `/v1/planners/${uuid()}/meals/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should allow editing a meal if the user is the planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [meal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send({
                description: "Updated Description",
            } satisfies components["schemas"]["PlannerMealUpdate"]);

        expect(res.statusCode).toEqual(200);

        const { meals: plannerMeals } =
            await KnexPlannerRepository.readAllMeals(database, {
                userId: user.userId,
                filter: { plannerId: planner!.plannerId },
            });

        expect(plannerMeals.length).toEqual(1);

        const [plannerMeal] = plannerMeals;

        expect(plannerMeal?.description).toEqual("Updated Description");
    });

    it("should not allow editing a meal if the user is a planner member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: user.userId, status: "M" }],
        });

        const {
            meals: [meal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: plannerOwner!.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                    description: uuid(),
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send({
                description: "Updated Description",
            } satisfies components["schemas"]["PlannerMealUpdate"]);

        expect(res.statusCode).toEqual(404);
    });

    it("should allow editing a meal if the user is a planner member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: user.userId, status: "A" }],
        });

        const {
            meals: [meal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: plannerOwner!.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                    description: uuid(),
                },
            ],
        });

        const updateData = { description: uuid() };

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send(
                updateData satisfies components["schemas"]["PlannerMealUpdate"],
            );

        expect(res.statusCode).toEqual(200);

        const returnedMeal = res.body as components["schemas"]["PlannerMeal"];
        expect(returnedMeal.description).toEqual(updateData.description);
        expect(returnedMeal.mealId).toEqual(meal!.mealId);

        const { meals: plannerMeals } =
            await KnexPlannerRepository.readAllMeals(database, {
                userId: user.userId,
                filter: { plannerId: planner!.plannerId },
            });

        expect(plannerMeals.length).toEqual(1);
        expect(plannerMeals[0]!.description).toEqual(updateData.description);
    });

    it("should update all mutable fields correctly", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [originalAttachment, updatedAttachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{ uri: uuid() }, { uri: uuid() }],
        });

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [meal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: 1,
                    month: 1,
                    course: "breakfast",
                    year: 2023,
                    description: "Initial Description",
                    heroImage: originalAttachment!.attachmentId,
                },
            ],
        });

        const updateData = {
            description: "Updated Description",
            course: "dinner",
            dayOfMonth: 28,
            month: 11,
            year: 2024,
            source: "Updated Source",
            heroImage: updatedAttachment!.attachmentId,
        } satisfies components["schemas"]["PlannerMealUpdate"];

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send(updateData);

        expect(res.statusCode).toEqual(200);

        const returnedMeal = res.body as components["schemas"]["PlannerMeal"];
        expect(returnedMeal.description).toEqual(updateData.description);
        expect(returnedMeal.course).toEqual(updateData.course);
        expect(returnedMeal.dayOfMonth).toEqual(updateData.dayOfMonth);
        expect(returnedMeal.month).toEqual(updateData.month);
        expect(returnedMeal.year).toEqual(updateData.year);
        expect(returnedMeal.source).toEqual(updateData.source);
        expect(returnedMeal.heroImage!.attachmentId).toEqual(
            updateData.heroImage,
        );
        expect(returnedMeal.heroImage!.uri).toEqual(updatedAttachment!.uri);

        const { meals: plannerMeals } =
            await KnexPlannerRepository.readAllMeals(database, {
                userId: user.userId,
                filter: { plannerId: planner!.plannerId },
            });

        expect(plannerMeals.length).toEqual(1);
        const [savedMeal] = plannerMeals;

        expect(savedMeal!.description).toEqual(updateData.description);
        expect(savedMeal!.course).toEqual(updateData.course);
        expect(savedMeal!.dayOfMonth).toEqual(updateData.dayOfMonth);
        expect(savedMeal!.month).toEqual(updateData.month);
        expect(savedMeal!.year).toEqual(updateData.year);
        expect(savedMeal!.source).toEqual(updateData.source);
        expect(savedMeal!.heroImage!.attachmentId).toEqual(
            updateData.heroImage,
        );
        expect(savedMeal!.heroImage!.uri).toEqual(updatedAttachment!.uri);
    });

    it("should clear optional fields when set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            attachments: [attachment],
        } = await KnexAttachmentRepository.create(database, {
            userId: user.userId,
            attachments: [{ uri: uuid() }],
        });

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid() }],
        });

        const {
            meals: [meal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: 1,
                    month: 1,
                    course: randomCourse(),
                    year: 2023,
                    description: "Initial Description",
                    recipeId: recipe!.recipeId,
                    source: "Initial Source",
                    heroImage: attachment!.attachmentId,
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send({
                description: null,
                source: null,
                recipeId: null,
                heroImage: null,
            });

        expect(res.statusCode).toEqual(200);
        const returnedMeal = res.body as components["schemas"]["PlannerMeal"];
        expect(returnedMeal.description).toBeUndefined();
        expect(returnedMeal.source).toBeUndefined();
        expect(returnedMeal.recipeId).toBeUndefined();
        expect(returnedMeal.heroImage).toBeUndefined();
    });

    it("should fail to update a cooklist meal via planner endpoint", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [cookListMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                { description: uuid(), course: randomCourse(), sequence: 1 },
            ],
        });

        const res = await request(app)
            .patch(
                `/v1/planners/${planner!.plannerId}/meals/${cookListMeal!.mealId}`,
            )
            .set(token)
            .send({ description: "Updated" });

        expect(res.statusCode).toEqual(404);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [meal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send({ plannerId: uuid() });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [meal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send({ dayOfMonth: 80 });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [meal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send({ course: null });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Remove a meal from a planner", () => {
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
        const res = await request(app).delete(
            `/v1/planners/${uuid()}/meals/${uuid()}`,
        );

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .delete(`/v1/planners/${uuid()}/meals/${uuid()}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should fail if the user is not the planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user!.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(
                `/v1/planners/${planner!.plannerId}/meals/${plannerMeal!.mealId}`,
            )
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow item deletion if the user is a planner member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [
                {
                    name: uuid(),
                    description: uuid(),
                },
            ],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: user!.userId, status: "M" }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user!.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(
                `/v1/planners/${planner!.plannerId}/meals/${plannerMeal!.mealId}`,
            )
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should allow item deletion if the user is a planner member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: user!.userId, status: "A" }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user!.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(
                `/v1/planners/${planner!.plannerId}/meals/${plannerMeal!.mealId}`,
            )
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { meals: plannerMeals } =
            await KnexPlannerRepository.readAllMeals(database, {
                userId: user!.userId,
                filter: { plannerId: planner!.plannerId },
            });

        expect(plannerMeals.length).toEqual(0);
    });

    it("should allow deletion if the user is the planner owner", async () => {
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
            userId: user!.userId,
            plannerId: planner!.plannerId,
            meals: [
                {
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: randomCourse(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(
                `/v1/planners/${planner!.plannerId}/meals/${plannerMeal!.mealId}`,
            )
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { meals: plannerMeals } =
            await KnexPlannerRepository.readAllMeals(database, {
                userId: user.userId,
                filter: { plannerId: planner!.plannerId },
            });

        expect(plannerMeals.length).toEqual(0);
    });

    it("should fail to delete a cooklist meal via planner endpoint", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const {
            meals: [cookListMeal],
        } = await KnexCookListRepository.createMeals(database, {
            userId: user.userId,
            meals: [
                { description: uuid(), course: randomCourse(), sequence: 1 },
            ],
        });

        const res = await request(app)
            .delete(
                `/v1/planners/${planner!.plannerId}/meals/${cookListMeal!.mealId}`,
            )
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });
});

describe("Get planner members", () => {
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
        const res = await request(app).get(`/v1/planners/${uuid()}/members`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return the list of members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .get(`/v1/planners/${planner!.plannerId}/members`)
            .set(token);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].userId).toEqual(member!.userId);
    });

    it("should return 404 for the member list if the user is not the owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const statuses = ["M", "P", "A", "B"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: plannerOwner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(`/v1/planners/${planner!.plannerId}/members`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Invite a member to a planner", () => {
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
        const res = await request(app)
            .post(`/v1/planners/${uuid()}/members`)
            .send();
        expect(res.statusCode).toEqual(401);
    });

    it("should successfully invite a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [invitee] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/members`)
            .set(token)
            .send({ userId: invitee!.userId });

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexPlannerRepository.readMembers(database, [
            { plannerId: planner!.plannerId },
        ]);
        expect(members!.members).toHaveLength(1);
        expect(members!.members[0]!.userId).toEqual(invitee!.userId);
        expect(members!.members[0]!.status).toEqual("P");
    });

    it("should return 404 for an invite if the user is not the owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);
        const [invitee] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: plannerOwner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/planners/${planner!.plannerId}/members`)
                .set(token)
                .send({ userId: invitee!.userId });

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should return 400 if the user is already a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/members`)
            .set(token)
            .send({ userId: member!.userId });

        expect(res.statusCode).toEqual(400);
    });

    it("should return 404 if the user does not exist", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/members`)
            .set(token)
            .send({ userId: uuid() });
        expect(res.statusCode).toEqual(404);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/members`)
            .set(token)
            .send({ userId: uuid(), extra: "invalid" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/members`)
            .set(token)
            .send({ userId: 12345 });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Accept planner invitation", () => {
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
        const res = await request(app)
            .post(`/v1/planners/${uuid()}/invite/accept`)
            .send();
        expect(res.statusCode).toEqual(401);
    });

    it("should successfully accept an invite", async () => {
        const [_ownerToken, owner] = await PrepareAuthenticatedUser(database);
        const [inviteeToken, invitee] =
            await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: owner.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: invitee.userId, status: "P" }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/invite/accept`)
            .set(inviteeToken);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexPlannerRepository.readMembers(database, [
            { plannerId: planner!.plannerId },
        ]);
        expect(members!.members[0]!.status).toEqual("M");
    });

    it("should return 404 when accepting an invite if the user is already a member (A, M) or blacklisted (B)", async () => {
        const [inviteeToken, invitee] =
            await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = ["A", "M", "B"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: owner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: invitee.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/planners/${planner!.plannerId}/invite/accept`)
                .set(inviteeToken);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Decline planner invitation", () => {
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
        const res = await request(app)
            .post(`/v1/planners/${uuid()}/invite/decline`)
            .send();
        expect(res.statusCode).toEqual(401);
    });

    it("should successfully decline an invite", async () => {
        const [_ownerToken, owner] = await PrepareAuthenticatedUser(database);
        const [inviteeToken, invitee] =
            await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: owner.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: invitee.userId, status: "P" }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/invite/decline`)
            .set(inviteeToken);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexPlannerRepository.readMembers(database, [
            { plannerId: planner!.plannerId },
        ]);
        expect(members!.members).toHaveLength(0);
    });

    it("should return 404 when declining an invite if the user is already a member (A, M) or blacklisted (B)", async () => {
        const [inviteeToken, invitee] =
            await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = ["A", "M", "B"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: owner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: invitee.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/planners/${planner!.plannerId}/invite/decline`)
                .set(inviteeToken);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Leave a planner", () => {
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
        const res = await request(app)
            .post(`/v1/planners/${uuid()}/leave`)
            .send();
        expect(res.statusCode).toEqual(401);
    });

    it("should allow an Administrator and Member to leave the planner", async () => {
        const [_ownerToken, owner] = await PrepareAuthenticatedUser(database);
        const [userToken, user] = await PrepareAuthenticatedUser(database);

        const statuses = ["A", "M"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: owner.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/planners/${planner!.plannerId}/leave`)
                .set(userToken);

            expect(res.statusCode).toEqual(204);

            const [members] = await KnexPlannerRepository.readMembers(
                database,
                [{ plannerId: planner!.plannerId }],
            );
            expect(members!.members).toHaveLength(0);
        }
    });

    it("should return 404 if the owner tries to leave the planner", async () => {
        const [ownerToken, owner] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: owner.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/leave`)
            .set(ownerToken);

        expect(res.statusCode).toEqual(404);
    });

    it("should return 404 if a pending or blacklisted user tries to leave the planner", async () => {
        const [_ownerToken, owner] = await PrepareAuthenticatedUser(database);
        const [userToken, user] = await PrepareAuthenticatedUser(database);

        const statuses = ["P", "B"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: owner.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, {
                plannerId: planner!.plannerId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/planners/${planner!.plannerId}/leave`)
                .set(userToken);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Remove a member from a planner", () => {
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
        const res = await request(app)
            .delete(`/v1/planners/${uuid()}/members/${uuid()}`)
            .send();
        expect(res.statusCode).toEqual(401);
    });

    it("should successfully remove a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .delete(
                `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
            )
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexPlannerRepository.readMembers(database, [
            { plannerId: planner!.plannerId },
        ]);
        expect(members!.members).toHaveLength(0);
    });

    it("should not allow non-owners (A, M, P, B) to remove a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);
        const [member] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: owner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, [
                {
                    plannerId: planner!.plannerId,
                    members: [
                        { userId: user.userId, status },
                        { userId: member!.userId, status: "M" },
                    ],
                },
            ]);

            const res = await request(app)
                .delete(
                    `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
                )
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Update a planner member", () => {
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
        const res = await request(app)
            .patch(`/v1/planners/${uuid()}/members/${uuid()}`)
            .send();
        expect(res.statusCode).toEqual(401);
    });

    it("should successfully update a member status between Administrator and Member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        // Start as Member
        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        // Update M -> A
        let res = await request(app)
            .patch(
                `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
            )
            .set(token)
            .send({ status: "A" });

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual("A");

        let [members] = await KnexPlannerRepository.readMembers(database, [
            { plannerId: planner!.plannerId },
        ]);
        expect(members!.members[0]!.status).toEqual("A");

        // Update A -> M
        res = await request(app)
            .patch(
                `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
            )
            .set(token)
            .send({ status: "M" });

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual("M");

        [members] = await KnexPlannerRepository.readMembers(database, [
            { plannerId: planner!.plannerId },
        ]);
        expect(members!.members[0]!.status).toEqual("M");
    });

    it("should fail when trying to update a member to restricted statuses (O, P)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const restrictedStatuses = ["O", "P"];

        for (const status of restrictedStatuses) {
            const res = await request(app)
                .patch(
                    `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
                )
                .set(token)
                .send({ status });

            expect(res.statusCode).toEqual(400);
        }
    });

    it("should not allow non-owners (A, M, P, B) to update a member status", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);
        const [member] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const {
                planners: [planner],
            } = await KnexPlannerRepository.create(database, {
                userId: owner!.userId,
                planners: [{ name: uuid(), description: uuid() }],
            });

            await KnexPlannerRepository.saveMembers(database, [
                {
                    plannerId: planner!.plannerId,
                    members: [
                        { userId: user.userId, status },
                        { userId: member!.userId, status: "M" },
                    ],
                },
            ]);

            const res = await request(app)
                .patch(
                    `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
                )
                .set(token)
                .send({ status: "A" });

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should return 400 when trying to update a pending member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "P" }],
        });

        const res = await request(app)
            .patch(
                `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
            )
            .set(token)
            .send({ status: "M" });

        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });
        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(
                `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
            )
            .set(token)
            .send({ status: "A", extra: "invalid" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });
        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(
                `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
            )
            .set(token)
            .send({ status: "INVALID" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });
        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(
                `/v1/planners/${planner!.plannerId}/members/${member!.userId}`,
            )
            .set(token)
            .send({ status: null });
        expect(res.statusCode).toEqual(400);
    });
});
