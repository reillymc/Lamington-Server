import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { PlannerActions, PlannerMealActions, PlannerMemberActions } from "../../../src/controllers";
import { PlannerMeal } from "../../../src/controllers/plannerMeal";
import { ServiceParams } from "../../../src/database";
import { PlannerCustomisations } from "../../../src/routes/helpers";
import { GetPlannerResponse, UserStatus } from "../../../src/routes/spec";
import {
    CleanTables,
    CreateUsers,
    PlannerEndpoint,
    PrepareAuthenticatedUser,
    TEST_ITEM_COUNT,
    randomBoolean,
    randomCount,
} from "../../helpers";

const getPlannerCustomisations = (): PlannerCustomisations => {
    return {
        color: uuid(),
    };
};

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
    const [token] = await PrepareAuthenticatedUser();

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
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(createPlannerParams);

    const res = await request(app).get(PlannerEndpoint.getPlanner(createPlannerParams.plannerId)).set(token);

    expect(res.statusCode).toEqual(404);
});

test("should return correct planner details for planner id", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const customisations = getPlannerCustomisations();

    const createPlannerParams = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        customisations: JSON.stringify(customisations),
        createdBy: user.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(createPlannerParams);

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

test("should return a planner that a user is a member of", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const createPlannerParams = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
        members: [{ userId: user.userId }],
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(createPlannerParams);

    const res = await request(app).get(PlannerEndpoint.getPlanner(createPlannerParams.plannerId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetPlannerResponse;

    expect(data?.plannerId).toEqual(createPlannerParams.plannerId);
    expect(data?.status).toEqual(UserStatus.Pending);
});

test("should return a planner that a user is a member of with correct permissions", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const mainPlanner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
        members: [{ userId: user.userId, status: UserStatus.Registered }],
    } satisfies ServiceParams<PlannerActions, "save">;

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
                              status: randomBoolean() ? UserStatus.Administrator : UserStatus.Registered,
                          },
                      ]
                    : undefined,
            } satisfies ServiceParams<PlannerActions, "save">)
    );

    await PlannerActions.save([mainPlanner, ...otherPlanners]);

    const res = await request(app).get(PlannerEndpoint.getPlanner(mainPlanner.plannerId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetPlannerResponse;

    expect(data?.plannerId).toEqual(mainPlanner.plannerId);
    expect(data?.status).toEqual(mainPlanner.members![0]!.status);
});

test("should return planner meals", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

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

    const res = await request(app).get(PlannerEndpoint.getPlanner(planner.plannerId, meal.year, meal.month)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetPlannerResponse;

    const plannerMealData = Object.values(data?.meals ?? {});

    expect(plannerMealData.length).toEqual(1);

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

test("should return planner members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerMember] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(planner);

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
