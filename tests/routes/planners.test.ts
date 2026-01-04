import { expect } from "expect";
import type { Express } from "express";
import { afterEach, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import { KnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import type { KnexDatabase } from "../../src/database/index.ts";
import { type components, UserStatus } from "../../src/routes/spec/index.ts";
import db from "../../src/database/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    TEST_ITEM_COUNT,
    randomBoolean,
    randomDay,
    randomMonth,
    randomYear,
} from "../helpers/index.ts";

// TODO: thorough tests for new stuff, and on new meals endpoint and cooklist
describe("get planner", () => {
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
        const res = await request(app).get(`/v1/planners/${uuid()}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).get(`/v1/planners/${uuid()}`).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not return planner user doesn't have access to", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid(), color: uuid() }],
        });

        const res = await request(app).get(`/v1/planners/${planner!.plannerId}`).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return correct planner details for planner id", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid(), color: uuid() }],
        });

        const res = await request(app).get(`/v1/planners/${planner!.plannerId}`).set(token);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["Planner"];

        expect(data?.plannerId).toEqual(planner!.plannerId);
        expect(data?.name).toEqual(planner!.name);
        expect(data?.description).toEqual(planner!.description);
        expect(data?.color).toEqual(planner!.color);
        expect(data?.owner.userId).toEqual(user.userId);
        expect(data?.owner.firstName).toEqual(user.firstName);
    });

    it("should return a planner that a user is a member of", async () => {
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

        const res = await request(app).get(`/v1/planners/${planner!.plannerId}`).set(token);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["Planner"];

        expect(data?.plannerId).toEqual(planner!.plannerId);
        expect(data?.status).toEqual(UserStatus.Member);
    });

    it("should return a planner that a user is a member of with correct permissions", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [mainPlanner],
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
            plannerId: mainPlanner!.plannerId,
            members: [{ userId: user.userId, status: UserStatus.Member }],
        });

        const { planners: otherPlanners } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: Array.from({ length: TEST_ITEM_COUNT }).map(() => ({
                name: uuid(),
                description: uuid(),
            })),
        });

        const membersToSave = otherPlanners
            .map(p => {
                if (randomBoolean()) {
                    return {
                        plannerId: p.plannerId,
                        members: [
                            {
                                userId: user.userId,
                                status: randomBoolean() ? UserStatus.Administrator : UserStatus.Member,
                            },
                        ],
                    };
                }
                return undefined;
            })
            .filter((x): x is NonNullable<typeof x> => x !== undefined);

        if (membersToSave.length) {
            await KnexPlannerRepository.saveMembers(database, membersToSave);
        }

        const res = await request(app).get(`/v1/planners/${mainPlanner!.plannerId}`).set(token);

        expect(res.statusCode).toEqual(200);

        const data = res.body;

        expect(data?.plannerId).toEqual(mainPlanner!.plannerId);
        expect(data?.status).toEqual(UserStatus.Member);
    });

    it("should return planner meals", async () => {
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
            meals: [
                {
                    plannerId: planner!.plannerId,
                    course: "dinner",
                    description: uuid(),
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .get(`/v1/planners/${planner!.plannerId}/meals/${meal!.year}/${meal!.month}`)
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

    it("should return planner members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [plannerMember] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: plannerMember!.userId, status: UserStatus.Administrator }],
        });

        const res = await request(app).get(`/v1/planners/${planner!.plannerId}`).set(token);

        expect(res.statusCode).toEqual(200);

        const data = res.body;

        const plannerMealData = data?.members ?? [];

        expect(plannerMealData.length).toEqual(1);
        expect(plannerMealData[0]?.userId).toEqual(plannerMember?.userId);
    });
});

describe("delete planner", () => {
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
        const res = await request(app).delete(`/v1/planners/${uuid()}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).delete(`/v1/planners/${uuid()}`).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not planner owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [plannerOwner] = await CreateUsers(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: plannerOwner!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app).delete(`/v1/planners/${planner!.plannerId}`).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if planner member but not planner owner", async () => {
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
            members: [{ userId: user!.userId, status: UserStatus.Administrator }],
        });

        const res = await request(app).delete(`/v1/planners/${planner!.plannerId}`).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should delete planner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user!.userId,
            planners: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app).delete(`/v1/planners/${planner!.plannerId}`).set(token).send();

        expect(res.statusCode).toEqual(204);

        const { planners } = await KnexPlannerRepository.read(database, { planners: [planner!], userId: user.userId });

        expect(planners.length).toEqual(0);
    });
});

describe("post planner", () => {
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
        const res = await request(app).post("/v1/planners");

        expect(res.statusCode).toEqual(401);
    });

    it("should create planner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const planner = {
            name: uuid(),
            description: uuid(),
            color: uuid(),
        } satisfies components["schemas"]["PlannerCreate"];

        const res = await request(app).post("/v1/planners").set(token).send(planner);

        expect(res.statusCode).toEqual(201);

        const { planners: savedPlanners } = await KnexPlannerRepository.readAll(database, { userId: user.userId });

        expect(savedPlanners.length).toEqual(1);

        const [savedPlanner] = savedPlanners;

        expect(savedPlanner?.name).toEqual(planner.name);
        expect(savedPlanner?.color).toEqual(planner.color);
        expect(savedPlanner?.description).toEqual(planner.description);
        expect(savedPlanner?.owner.userId).toEqual(user.userId);
    });

    it("should save updated planner details as planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            planners: [planner],
        } = await KnexPlannerRepository.create(database, {
            userId: user.userId,
            planners: [{ name: uuid(), description: uuid(), color: uuid() }],
        });

        const updatedPlanner = {
            name: uuid(),
            description: uuid(),
            color: uuid(),
        } satisfies components["schemas"]["PlannerUpdate"];

        const res = await request(app).patch(`/v1/planners/${planner!.plannerId}`).set(token).send(updatedPlanner);

        expect(res.statusCode).toEqual(200);

        const {
            planners: [savedPlanner],
        } = await KnexPlannerRepository.read(database, { planners: [planner!], userId: user.userId });

        expect(savedPlanner?.name).toEqual(updatedPlanner.name);
        expect(savedPlanner?.color).toEqual(updatedPlanner.color);
        expect(savedPlanner?.description).toEqual(updatedPlanner.description);
        expect(savedPlanner?.plannerId).toEqual(planner!.plannerId);
        expect(savedPlanner?.owner.userId).toEqual(user.userId);
    });
});

describe("post planner meal", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    // TODO: Test whether a user can move a meal from a planner they don't own to their own - therefore deleting the other user's planner's meal. Test general copying/moving of meals, and moving from cooklist

    it("route should require authentication", async () => {
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
                course: "dinner",
                year: randomYear(),
                description: uuid(),
            } satisfies components["schemas"]["PlannerMealCreate"]);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow adding meal if not planner owner", async () => {
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
                course: "dinner",
                year: randomYear(),
                description: uuid(),
            } satisfies components["schemas"]["PlannerMealCreate"]);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow adding meal if planner member without edit permission", async () => {
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
            members: [{ userId: user!.userId, status: UserStatus.Member }],
        });

        const res = await request(app)
            .post(`/v1/planners/${planner!.plannerId}/meals`)
            .set(token)
            .send({
                dayOfMonth: randomDay(),
                month: randomMonth(),
                course: "dinner",
                year: randomYear(),
                description: uuid(),
            } satisfies components["schemas"]["PlannerMealCreate"]);

        expect(res.statusCode).toEqual(404);
    });

    it("should allow adding meal if planner member with edit permission", async () => {
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
            course: "dinner",
            year: randomYear(),
            description: uuid(),
        } satisfies components["schemas"]["PlannerMealCreate"];

        await KnexPlannerRepository.saveMembers(database, {
            plannerId: planner!.plannerId,
            members: [{ userId: user!.userId, status: UserStatus.Administrator }],
        });

        const res = await request(app).post(`/v1/planners/${planner!.plannerId}/meals`).set(token).send(meal);

        expect(res.statusCode).toEqual(201);

        const { meals: plannerMeals } = await KnexPlannerRepository.readAllMeals(database, {
            userId: user.userId,
            filter: { plannerId: planner!.plannerId },
        });

        expect(plannerMeals.length).toEqual(1);

        const [plannerMeal] = plannerMeals;

        expect(plannerMeal?.plannerId).toEqual(planner!.plannerId);
        expect(plannerMeal?.description).toEqual(meal.description);
    });
});

describe("patch planner meal", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });
    it("should allow editing meal if planner owner", async () => {
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
            meals: [
                {
                    plannerId: planner!.plannerId,
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: "dinner",
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .patch(`/v1/planners/${planner!.plannerId}/meals/${meal!.mealId}`)
            .set(token)
            .send({ description: "Updated Description" } satisfies components["schemas"]["PlannerMealUpdate"]);

        expect(res.statusCode).toEqual(200);

        const { meals: plannerMeals } = await KnexPlannerRepository.readAllMeals(database, {
            userId: user.userId,
            filter: { plannerId: planner!.plannerId },
        });

        expect(plannerMeals.length).toEqual(1);

        const [plannerMeal] = plannerMeals;

        expect(plannerMeal?.description).toEqual("Updated Description");
    });
});

describe("delete planner meal", () => {
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
        const res = await request(app).delete(`/v1/planners/${uuid()}/meals/${uuid()}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).delete(`/v1/planners/${uuid()}/meals/${uuid()}`).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not planner owner", async () => {
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
            meals: [
                {
                    plannerId: planner!.plannerId,
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: "dinner",
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/planners/${planner!.plannerId}/meals/${plannerMeal!.mealId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow item deletion if planner member without edit permission", async () => {
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
            members: [{ userId: user!.userId, status: UserStatus.Member }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user!.userId,
            meals: [
                {
                    plannerId: planner!.plannerId,
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: "dinner",
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/planners/${planner!.plannerId}/meals/${plannerMeal!.mealId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should allow item deletion if planner member with edit permission", async () => {
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
            members: [{ userId: user!.userId, status: UserStatus.Administrator }],
        });

        const {
            meals: [plannerMeal],
        } = await KnexPlannerRepository.createMeals(database, {
            userId: user!.userId,
            meals: [
                {
                    plannerId: planner!.plannerId,
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: "dinner",
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/planners/${planner!.plannerId}/meals/${plannerMeal!.mealId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { meals: plannerMeals } = await KnexPlannerRepository.readAllMeals(database, {
            userId: user!.userId,
            filter: { plannerId: planner!.plannerId },
        });

        expect(plannerMeals.length).toEqual(0);
    });

    it("should allow deletion if planner owner", async () => {
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
            meals: [
                {
                    plannerId: planner!.plannerId,
                    dayOfMonth: randomDay(),
                    month: randomMonth(),
                    course: "dinner",
                    year: randomYear(),
                },
            ],
        });

        const res = await request(app)
            .delete(`/v1/planners/${planner!.plannerId}/meals/${plannerMeal!.mealId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { meals: plannerMeals } = await KnexPlannerRepository.readAllMeals(database, {
            userId: user.userId,
            filter: { plannerId: planner!.plannerId },
        });

        expect(plannerMeals.length).toEqual(0);
    });
});
