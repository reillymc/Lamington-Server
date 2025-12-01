import { expect } from "expect";
import type { Express } from "express";
import { before, describe, it } from "node:test";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import {
    ContentMemberActions,
    CookListMealActions,
    InternalPlannerMealActions,
    PlannerActions,
    PlannerMealActions,
    PlannerMemberActions,
} from "../../src/controllers/index.ts";
import type { PlannerMeal } from "../../src/controllers/spec/plannerMeal.ts";
import type { PlannerMealService, PlannerService } from "../../src/controllers/spec/index.ts";
import type { KnexDatabase, PlannerCustomisations, ServiceParams } from "../../src/database/index.ts";
import {
    type DeletePlannerRequestParams,
    type EntityMember,
    type GetPlannerResponse,
    type PostPlannerMealRequestBody,
    type PostPlannerRequestBody,
    UserStatus,
} from "../../src/routes/spec/index.ts";
import { default as knexDb } from "../../src/database/index.ts";
import {
    CreateUsers,
    PlannerEndpoint,
    PrepareAuthenticatedUser,
    TEST_ITEM_COUNT,
    randomBoolean,
    randomCount,
    randomNumber,
} from "../helpers/index.ts";

const db = knexDb as KnexDatabase;

const getPlannerCustomisations = (): PlannerCustomisations => {
    return {
        color: uuid(),
    };
};

describe("get planner", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(PlannerEndpoint.getPlanner(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(db);

        const res = await request(app).get(PlannerEndpoint.getPlanner(uuid())).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not return planner user doesn't have access to", async () => {
        const [token] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const createPlannerParams = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(createPlannerParams);

        const res = await request(app).get(PlannerEndpoint.getPlanner(createPlannerParams.plannerId)).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return correct planner details for planner id", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);

        const customisations = getPlannerCustomisations();

        const createPlannerParams = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            customisations,
            createdBy: user.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(createPlannerParams);

        const res = await request(app).get(PlannerEndpoint.getPlanner(createPlannerParams.plannerId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetPlannerResponse;

        expect(data?.plannerId).toEqual(createPlannerParams.plannerId);
        expect(data?.name).toEqual(createPlannerParams.name);
        expect(data?.description).toEqual(createPlannerParams.description);
        expect(data?.color).toEqual(customisations.color);
        expect(data?.createdBy.userId).toEqual(createPlannerParams.createdBy);
        expect(data?.createdBy.firstName).toEqual(user.firstName);
    });

    it("should return a planner that a user is a member of", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const createPlannerParams = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
            members: [{ userId: user.userId }],
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(createPlannerParams);

        const res = await request(app).get(PlannerEndpoint.getPlanner(createPlannerParams.plannerId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetPlannerResponse;

        expect(data?.plannerId).toEqual(createPlannerParams.plannerId);
        expect(data?.status).toEqual(UserStatus.Pending);
    });

    it("should return a planner that a user is a member of with correct permissions", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const mainPlanner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
            members: [{ userId: user.userId, status: UserStatus.Member }],
        } satisfies ServiceParams<PlannerService, "Save">;

        const otherPlanners = Array.from({ length: TEST_ITEM_COUNT }).map(
            (_, i) =>
                ({
                    plannerId: uuid(),
                    name: uuid(),
                    description: uuid(),
                    createdBy: plannerOwner!.userId,
                    members: randomBoolean()
                        ? [
                              {
                                  userId: user.userId,
                                  status: randomBoolean() ? UserStatus.Administrator : UserStatus.Member,
                              },
                          ]
                        : undefined,
                } satisfies ServiceParams<PlannerService, "Save">)
        );

        await PlannerActions.Save([mainPlanner, ...otherPlanners]);

        const res = await request(app).get(PlannerEndpoint.getPlanner(mainPlanner.plannerId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetPlannerResponse;

        expect(data?.plannerId).toEqual(mainPlanner.plannerId);
        expect(data?.status).toEqual(mainPlanner.members![0]!.status);
    });

    it("should return planner meals", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);

        const meal = {
            mealId: uuid(),
            meal: uuid(),
            description: uuid(),
            plannerId: planner.plannerId,
            dayOfMonth: randomCount,
            month: randomCount,
            year: randomCount,
            createdBy: user.userId,
            recipeId: undefined,
        } satisfies PlannerMeal;

        await PlannerMealActions.Save(meal);

        const res = await request(app)
            .get(PlannerEndpoint.getPlanner(planner.plannerId, meal.year, meal.month))
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetPlannerResponse;

        const plannerMealData = Object.values(data?.meals ?? {});

        expect(plannerMealData.length).toEqual(1);

        const [plannerMeal] = plannerMealData;

        if (!plannerMeal) throw new Error("No planner meal found");

        expect(plannerMeal.mealId).toEqual(meal.mealId);
        expect(plannerMeal.meal).toEqual(meal.meal);
        expect(plannerMeal.description).toEqual(meal.description);
        expect(plannerMeal.plannerId).toEqual(meal.plannerId);
        expect(plannerMeal.dayOfMonth).toEqual(meal.dayOfMonth);
        expect(plannerMeal.month).toEqual(meal.month);
        expect(plannerMeal.year).toEqual(meal.year);
        expect(plannerMeal.createdBy).toEqual(meal.createdBy);
        expect(plannerMeal.recipeId).toEqual(null);
    });

    it("should return planner members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerMember] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);

        await PlannerMemberActions.save({
            plannerId: planner.plannerId,
            members: [
                {
                    userId: plannerMember!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app).get(PlannerEndpoint.getPlanner(planner.plannerId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetPlannerResponse;

        const plannerMealData = Object.values(data?.members ?? {});

        expect(plannerMealData.length).toEqual(1);
        expect(plannerMealData[0]?.userId).toEqual(plannerMember?.userId);
    });
});

describe("delete planner", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(PlannerEndpoint.deletePlanner(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(db);

        const res = await request(app)
            .delete(PlannerEndpoint.deletePlanner(uuid()))
            .set(token)
            .send({ plannerId: uuid() } satisfies DeletePlannerRequestParams);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not planner owner", async () => {
        const [token] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);

        const res = await request(app)
            .delete(PlannerEndpoint.deletePlanner(planner.plannerId))
            .set(token)
            .send({ plannerId: planner.plannerId } satisfies DeletePlannerRequestParams);

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow deletion if planner member but not planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);
        await ContentMemberActions.save(db, {
            contentId: planner.plannerId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .delete(PlannerEndpoint.deletePlanner(planner.plannerId))
            .set(token)
            .send(planner satisfies DeletePlannerRequestParams);

        expect(res.statusCode).toEqual(403);
    });

    it("should delete planner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);

        const res = await request(app)
            .delete(PlannerEndpoint.deletePlanner(planner.plannerId))
            .set(token)
            .send(planner);

        expect(res.statusCode).toEqual(201);

        const planners = await PlannerActions.Read({ plannerId: planner.plannerId, userId: user.userId });

        expect(planners.length).toEqual(0);
    });
});

describe("post planner", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(PlannerEndpoint.postPlanner);

        expect(res.statusCode).toEqual(401);
    });

    it("should not allow editing if not planner owner", async () => {
        const [token] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);

        const res = await request(app)
            .post(PlannerEndpoint.postPlanner)
            .set(token)
            .send({
                data: { plannerId: planner.plannerId, name: uuid() },
            } satisfies PostPlannerRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow editing if planner member but not planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);
        await PlannerMemberActions.save({
            plannerId: planner.plannerId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .post(PlannerEndpoint.postPlanner)
            .set(token)
            .send({
                data: { plannerId: planner.plannerId, name: uuid() },
            } satisfies PostPlannerRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should create planner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const users = await CreateUsers(db);

        const planner = {
            data: {
                name: uuid(),
                description: uuid(),
                color: uuid(),
                members: users!.map(({ userId }) => ({
                    userId,
                    status: randomBoolean() ? UserStatus.Administrator : UserStatus.Member,
                })),
            },
        } satisfies Partial<PostPlannerRequestBody>;

        const res = await request(app).post(PlannerEndpoint.postPlanner).set(token).send(planner);

        expect(res.statusCode).toEqual(201);

        const savedPlanners = await PlannerActions.ReadByUser({ userId: user.userId });

        expect(savedPlanners.length).toEqual(1);

        const [savedPlanner] = savedPlanners;
        const savedPlannerMembers = await PlannerMemberActions.read(savedPlanner!);

        expect(savedPlanner?.name).toEqual(planner.data.name);
        expect(savedPlanner?.customisations?.color).toEqual(planner.data.color);
        expect(savedPlanner?.description).toEqual(planner.data.description);
        expect(savedPlanner?.createdBy).toEqual(user.userId);
        expect(savedPlannerMembers.length).toEqual(planner.data.members!.length);

        for (const { userId, status } of planner.data.members!) {
            const savedPlannerMember = savedPlannerMembers.find(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedPlannerMember).toBeTruthy();

            expect(savedPlannerMember?.status).toEqual(status);
        }
    });

    it("should save updated planner details as planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            customisations: getPlannerCustomisations(),
            createdBy: user.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);

        const updatedPlanner = {
            data: {
                plannerId: planner.plannerId,
                name: uuid(),
                description: uuid(),
                color: uuid(),
            },
        } satisfies PostPlannerRequestBody;

        const res = await request(app).post(PlannerEndpoint.postPlanner).set(token).send(updatedPlanner);

        expect(res.statusCode).toEqual(201);

        const [savedPlanner] = await PlannerActions.Read({ plannerId: planner.plannerId, userId: user.userId });

        expect(savedPlanner?.name).toEqual(updatedPlanner.data!.name);
        expect(savedPlanner?.customisations?.color).toEqual(updatedPlanner.data!.color);
        expect(savedPlanner?.description).toEqual(updatedPlanner.data!.description);
        expect(savedPlanner?.plannerId).toEqual(planner.plannerId);
        expect(savedPlanner?.createdBy).toEqual(planner.createdBy);
    });

    it("should save additional planner members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const initialUsers = await CreateUsers(db, { count: randomCount });
        const additionalUsers = await CreateUsers(db, { count: randomCount });

        const initialMembers: EntityMember[] = initialUsers.map(({ userId }) => ({ userId }));
        const additionalMembers: EntityMember[] = additionalUsers.map(({ userId }) => ({ userId }));
        const allMembers = [...initialMembers, ...additionalMembers];

        const [planner] = await PlannerActions.Save({
            plannerId: uuid(),
            createdBy: user.userId,
            name: uuid(),
            description: uuid(),
            members: initialMembers,
        });

        const initialPlannerMembers = await PlannerMemberActions.read(planner!);
        expect(initialPlannerMembers.length).toEqual(initialMembers.length);

        const res = await request(app)
            .post(PlannerEndpoint.postPlanner)
            .set(token)
            .send({ data: { ...planner, members: allMembers } } satisfies PostPlannerRequestBody);

        expect(res.statusCode).toEqual(201);

        const savedPlannerMembers = await PlannerMemberActions.read(planner!);

        expect(savedPlannerMembers.length).toEqual(allMembers.length);

        savedPlannerMembers.forEach(({ userId }) => {
            const savedPlannerMember = allMembers.find(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedPlannerMember).toBeTruthy();
        });
    });

    it("should remove some planner members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const initialMembers = await CreateUsers(db, { count: randomCount });

        const members: EntityMember[] = initialMembers.map(({ userId }) => ({ userId }));
        const reducedMembers: EntityMember[] = members.slice(0, Math.max((members.length - 1) / 2));
        const excludedMembers: EntityMember[] = members.filter(
            ({ userId }) => !reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId)
        );

        const [planner] = await PlannerActions.Save({
            plannerId: uuid(),
            createdBy: user.userId,
            name: uuid(),
            description: uuid(),
            members,
        });

        const initialPlannerMembers = await PlannerMemberActions.read(planner!);
        expect(initialPlannerMembers.length).toEqual(members.length);
        const res = await request(app)
            .post(PlannerEndpoint.postPlanner)
            .set(token)
            .send({ data: { ...planner, members: reducedMembers } } satisfies PostPlannerRequestBody);

        expect(res.statusCode).toEqual(201);

        const updatedPlannerMembers = await PlannerMemberActions.read(planner!);
        expect(updatedPlannerMembers.length).toEqual(reducedMembers.length);

        updatedPlannerMembers.forEach(({ userId }) => {
            const savedPlannerMember = reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId);
            const illegalMember = excludedMembers.some(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedPlannerMember).toBeTruthy();
            expect(illegalMember).toBeFalsy();
        });
    });

    it("should remove all planner members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const members = await CreateUsers(db, { count: randomCount });

        const [planner] = await PlannerActions.Save({
            plannerId: uuid(),
            createdBy: user.userId,
            name: uuid(),
            description: uuid(),
            members: members.map(({ userId }) => ({ userId })),
        });

        const initialPlannerMembers = await PlannerMemberActions.read(planner!);
        expect(initialPlannerMembers.length).toEqual(members.length);

        const res = await request(app)
            .post(PlannerEndpoint.postPlanner)
            .set(token)
            .send({ data: { ...planner, members: [] } } satisfies PostPlannerRequestBody);

        expect(res.statusCode).toEqual(201);

        const savedPlannerMembers = await PlannerMemberActions.read(planner!);

        expect(savedPlannerMembers.length).toEqual(0);
    });
});

describe("post planner meal", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    // TODO: Test whether a user can move a meal from a planner they don't own to their own - therefore deleting the other user's planner's meal. Test general copying/moving of meals, and moving from cooklist

    it("route should require authentication", async () => {
        const res = await request(app).post(PlannerEndpoint.postPlannerMeal(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(db);

        const res = await request(app)
            .post(PlannerEndpoint.postPlannerMeal(uuid()))
            .set(token)
            .send({
                data: {
                    mealId: uuid(),
                    dayOfMonth: randomNumber(),
                    month: randomNumber(),
                    meal: uuid(),
                    year: randomNumber(),
                },
            } satisfies PostPlannerMealRequestBody);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow adding meal if not planner owner", async () => {
        const [token] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);

        const res = await request(app)
            .post(PlannerEndpoint.postPlannerMeal(planner.plannerId))
            .set(token)
            .send({
                data: {
                    mealId: uuid(),
                    dayOfMonth: randomNumber(),
                    month: randomNumber(),
                    meal: uuid(),
                    year: randomNumber(),
                },
            } satisfies PostPlannerMealRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow adding meal if planner member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);
        await PlannerMemberActions.save({
            plannerId: planner.plannerId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Member,
                },
            ],
        });

        const res = await request(app)
            .post(PlannerEndpoint.postPlannerMeal(planner.plannerId))
            .set(token)
            .send({
                data: {
                    mealId: uuid(),
                    dayOfMonth: randomNumber(),
                    month: randomNumber(),
                    meal: uuid(),
                    year: randomNumber(),
                    createdBy: user.userId,
                },
            } satisfies PostPlannerMealRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should allow adding meal if planner member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        const meal = {
            mealId: uuid(),
            dayOfMonth: randomNumber(),
            month: randomNumber(),
            meal: uuid(),
            year: randomNumber(),
        } satisfies PostPlannerMealRequestBody["data"];

        await PlannerActions.Save(planner);
        await PlannerMemberActions.save({
            plannerId: planner.plannerId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .post(PlannerEndpoint.postPlannerMeal(planner.plannerId))
            .set(token)
            .send({ data: meal } satisfies PostPlannerMealRequestBody);

        expect(res.statusCode).toEqual(201);

        const plannerMeals = await InternalPlannerMealActions.readAll({ plannerId: planner.plannerId });

        expect(plannerMeals.length).toEqual(1);

        const [plannerMeal] = plannerMeals;

        expect(plannerMeal?.plannerId).toEqual(planner.plannerId);
        expect(plannerMeal?.mealId).toEqual(meal.mealId);
    });

    it("should allow editing if planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        const meal = {
            mealId: uuid(),
            dayOfMonth: randomNumber(),
            month: randomNumber(),
            meal: uuid(),
            year: randomNumber(),
        } satisfies PostPlannerMealRequestBody["data"];

        await PlannerActions.Save(planner);

        const res = await request(app)
            .post(PlannerEndpoint.postPlannerMeal(planner.plannerId))
            .set(token)
            .send({ data: meal } satisfies PostPlannerMealRequestBody);

        expect(res.statusCode).toEqual(201);

        const plannerMeals = await InternalPlannerMealActions.readAll(planner);

        expect(plannerMeals.length).toEqual(1);

        const [plannerMeal] = plannerMeals;

        expect(plannerMeal?.plannerId).toEqual(planner.plannerId);
        expect(plannerMeal?.mealId).toEqual(meal.mealId);
    });

    it("should move meal from cook list to planner", async () => {
        const [token, { userId }] = await PrepareAuthenticatedUser(db);

        const cookListMeal = {
            mealId: uuid(),
            meal: uuid(),
            description: uuid(),
            createdBy: userId,
            source: uuid(),
            sequence: randomNumber(),
        } satisfies ServiceParams<CookListMealActions, "save">;

        await CookListMealActions.save(cookListMeal);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        await PlannerActions.Save(planner);

        const res = await request(app)
            .post(PlannerEndpoint.postPlannerMeal(planner.plannerId))
            .set(token)
            .send({
                data: {
                    ...cookListMeal,
                    dayOfMonth: randomNumber(),
                    month: randomNumber(),
                    year: randomNumber(),
                },
            } satisfies PostPlannerMealRequestBody);

        expect(res.statusCode).toEqual(201);

        const plannerMeals = await InternalPlannerMealActions.readAll({ plannerId: planner.plannerId });
        expect(plannerMeals.length).toEqual(1);

        const [plannerMeal] = plannerMeals;

        expect(plannerMeal?.plannerId).toEqual(planner.plannerId);
        expect(plannerMeal?.mealId).toEqual(cookListMeal.mealId);

        const cookListMeals = await CookListMealActions.readMy({ userId });
        expect(cookListMeals.length).toEqual(0);
    });
});

describe("delete planner meal", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(PlannerEndpoint.deletePlannerMeal(uuid(), uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent planner", async () => {
        const [token] = await PrepareAuthenticatedUser(db);

        const res = await request(app).delete(PlannerEndpoint.deletePlannerMeal(uuid(), uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        const plannerMeal = {
            mealId: uuid(),
            plannerId: planner.plannerId,
            dayOfMonth: randomNumber(),
            month: randomNumber(),
            meal: uuid(),
            year: randomNumber(),
            createdBy: user!.userId,
        } satisfies ServiceParams<PlannerMealService, "Save">;

        await PlannerActions.Save(planner);
        await PlannerMealActions.Save(plannerMeal);

        const res = await request(app)
            .delete(PlannerEndpoint.deletePlannerMeal(planner.plannerId, plannerMeal.mealId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow item deletion if planner member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        const plannerMeal = {
            mealId: uuid(),
            plannerId: planner.plannerId,
            dayOfMonth: randomNumber(),
            month: randomNumber(),
            meal: uuid(),
            year: randomNumber(),
            createdBy: user!.userId,
        } satisfies ServiceParams<PlannerMealService, "Save">;

        await PlannerActions.Save(planner);
        await PlannerMealActions.Save(plannerMeal);
        await PlannerMemberActions.save({
            plannerId: planner.plannerId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Member,
                },
            ],
        });

        const res = await request(app)
            .delete(PlannerEndpoint.deletePlannerMeal(planner.plannerId, plannerMeal.mealId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should allow item deletion if planner member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [plannerOwner] = await CreateUsers(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: plannerOwner!.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        const plannerMeal = {
            mealId: uuid(),
            plannerId: planner.plannerId,
            dayOfMonth: randomNumber(),
            month: randomNumber(),
            meal: uuid(),
            year: randomNumber(),
            createdBy: user!.userId,
        } satisfies ServiceParams<PlannerMealService, "Save">;

        await PlannerActions.Save(planner);
        await PlannerMealActions.Save(plannerMeal);
        await PlannerMemberActions.save({
            plannerId: planner.plannerId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .delete(PlannerEndpoint.deletePlannerMeal(planner.plannerId, plannerMeal.mealId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const plannerMeals = await InternalPlannerMealActions.readAll(planner);

        expect(plannerMeals.length).toEqual(0);
    });

    it("should allow deletion if planner owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);

        const planner = {
            plannerId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<PlannerService, "Save">;

        const plannerMeal = {
            mealId: uuid(),
            plannerId: planner.plannerId,
            dayOfMonth: randomNumber(),
            month: randomNumber(),
            meal: uuid(),
            year: randomNumber(),
            createdBy: user!.userId,
        } satisfies ServiceParams<PlannerMealService, "Save">;

        await PlannerActions.Save(planner);
        await PlannerMealActions.Save(plannerMeal);

        const res = await request(app)
            .delete(PlannerEndpoint.deletePlannerMeal(planner.plannerId, plannerMeal.mealId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const plannerMeals = await InternalPlannerMealActions.readAll(planner);

        expect(plannerMeals.length).toEqual(0);
    });
});
