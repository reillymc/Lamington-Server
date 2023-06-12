import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { PlannerEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser, randomCount } from "../../helpers";
import { GetPlannerResponse, PostPlannerMealRequest } from "../../../src/routes/spec";
import { PlannerActions, PlannerMemberActions, PlannerMealActions } from "../../../src/controllers";
import { CreatePlannerParams } from "../../../src/controllers/planner";
import { PlannerMeal } from "../../../src/database";

beforeEach(async () => {
    await CleanTables("planner", "user", "planner_meal", "planner_member");
});

afterAll(async () => {
    await CleanTables("planner", "user", "planner_meal", "planner_member");
});

test("route should require authentication", async () => {
    const res = await request(app).get(PlannerEndpoint.getPlanner(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant planner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const res = await request(app).get(PlannerEndpoint.getPlanner(uuid())).set(token);

    expect(res.statusCode).toEqual(404);
});

test("should not return planner user doesn't have access to", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const createPlannerParams = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies CreatePlannerParams;

    await PlannerActions.save(createPlannerParams);

    const res = await request(app).get(PlannerEndpoint.getPlanner(createPlannerParams.plannerId)).set(token);

    expect(res.statusCode).toEqual(404);
});

test("should return correct planner details for planner id", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const createPlannerParams = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: user.userId,
    } satisfies CreatePlannerParams;

    await PlannerActions.save(createPlannerParams);

    const res = await request(app).get(PlannerEndpoint.getPlanner(createPlannerParams.plannerId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetPlannerResponse;

    expect(data?.plannerId).toEqual(createPlannerParams.plannerId);
    expect(data?.name).toEqual(createPlannerParams.name);
    expect(data?.description).toEqual(createPlannerParams.description);
    expect(data?.variant).toEqual(createPlannerParams.variant);
    expect(data?.createdBy.userId).toEqual(createPlannerParams.createdBy);
    expect(data?.createdBy.firstName).toEqual(user.firstName);
});

test("should return a planner that a user is a member of", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const createPlannerParams = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: plannerOwner!.userId,
        members: [{ userId: user.userId }],
    } satisfies CreatePlannerParams;

    await PlannerActions.save(createPlannerParams);

    const res = await request(app).get(PlannerEndpoint.getPlanner(createPlannerParams.plannerId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetPlannerResponse;

    expect(data?.plannerId).toEqual(createPlannerParams.plannerId);
});

test("should return planner meals", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: user.userId,
    } satisfies CreatePlannerParams;

    await PlannerActions.save(planner);

    const meal = {
        id: uuid(),
        meal: uuid(),
        description: uuid(),
        plannerId: planner.plannerId,
        dayOfMonth: randomCount,
        month: randomCount,
        year: randomCount,
        createdBy: user.userId,
        recipeId: undefined,
    } satisfies PlannerMeal;

    await PlannerMealActions.save(meal);

    const res = await request(app)
        .get(PlannerEndpoint.getPlanner(planner.plannerId, meal.year.toString(), meal.month.toString()))
        .set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetPlannerResponse;

    const plannerMealData = Object.values(data?.meals ?? {});
    const plannerQueueData = Object.values(data?.queue ?? {});

    expect(plannerMealData.length).toEqual(1);
    expect(plannerQueueData.length).toEqual(0);

    const [plannerMeal] = plannerMealData;

    if (!plannerMeal) throw new Error("No planner meal found");

    expect(plannerMeal.id).toEqual(meal.id);
    expect(plannerMeal.meal).toEqual(meal.meal);
    expect(plannerMeal.description).toEqual(meal.description);
    expect(plannerMeal.plannerId).toEqual(meal.plannerId);
    expect(plannerMeal.dayOfMonth).toEqual(meal.dayOfMonth);
    expect(plannerMeal.month).toEqual(meal.month);
    expect(plannerMeal.year).toEqual(meal.year);
    expect(plannerMeal.createdBy).toEqual(meal.createdBy);
    expect(plannerMeal.recipeId).toEqual(null);
});

test("should return planner queue", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: user.userId,
    } satisfies CreatePlannerParams;

    await PlannerActions.save(planner);

    const meal = {
        id: uuid(),
        meal: uuid(),
        description: uuid(),
        plannerId: planner.plannerId,
        dayOfMonth: undefined,
        month: undefined,
        year: undefined,
        createdBy: user.userId,
        recipeId: undefined,
    } satisfies PlannerMeal;

    await PlannerMealActions.save(meal);

    const res = await request(app).get(PlannerEndpoint.getPlanner(planner.plannerId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetPlannerResponse;

    const plannerMealData = Object.values(data?.meals ?? {});
    const plannerQueueData = Object.values(data?.queue ?? {});

    expect(plannerMealData.length).toEqual(0);
    expect(plannerQueueData.length).toEqual(1);

    const [plannerMeal] = plannerQueueData;

    if (!plannerMeal) throw new Error("No planner meal found");

    expect(plannerMeal.id).toEqual(meal.id);
    expect(plannerMeal.meal).toEqual(meal.meal);
    expect(plannerMeal.description).toEqual(meal.description);
    expect(plannerMeal.plannerId).toEqual(meal.plannerId);
    // TODO deal with null/undefined better (including client)
    expect(plannerMeal.dayOfMonth).toEqual(null);
    expect(plannerMeal.month).toEqual(null);
    expect(plannerMeal.year).toEqual(null);
    expect(plannerMeal.createdBy).toEqual(meal.createdBy);
    expect(plannerMeal.recipeId).toEqual(null);
});

test("should return planner members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerMember] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        variant: uuid(),
        createdBy: user.userId,
    } satisfies CreatePlannerParams;

    await PlannerActions.save(planner);

    await PlannerMemberActions.save({
        plannerId: planner.plannerId,
        members: [
            {
                userId: plannerMember!.userId,
                accepted: true,
                allowEditing: true,
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
