import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import {
    CookListMealActions,
    InternalPlannerMealActions,
    PlannerActions,
    PlannerMemberActions,
} from "../../../src/controllers";
import { ServiceParams } from "../../../src/database";
import { PostPlannerMealRequestBody, UserStatus } from "../../../src/routes/spec";
import { CleanTables, CreateUsers, PlannerEndpoint, PrepareAuthenticatedUser, randomNumber } from "../../helpers";

// TODO: Test whether a user can move a meal from a planner they dont own to their own - therefore deleting the other user's planner's meal. Test general copying/movind of meals, and moving from cooklist

beforeEach(async () => {
    await CleanTables("planner", "user", "planner_member");
});

afterAll(async () => {
    await CleanTables("planner", "user", "planner_member");
});

test("route should require authentication", async () => {
    const res = await request(app).post(PlannerEndpoint.postPlannerMeal(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant planner", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .post(PlannerEndpoint.postPlannerMeal(uuid()))
        .set(token)
        .send({
            data: {
                id: uuid(),
                dayOfMonth: randomNumber(),
                month: randomNumber(),
                meal: uuid(),
                year: randomNumber(),
            },
        } satisfies PostPlannerMealRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow adding meal if not planner owner", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(planner);

    const res = await request(app)
        .post(PlannerEndpoint.postPlannerMeal(planner.plannerId))
        .set(token)
        .send({
            data: {
                id: uuid(),
                dayOfMonth: randomNumber(),
                month: randomNumber(),
                meal: uuid(),
                year: randomNumber(),
            },
        } satisfies PostPlannerMealRequestBody);

    expect(res.statusCode).toEqual(404); // DB will not return planner if user is not owner or member, therefore 404. This should be the behaviour for all routes.
});

test("should not allow adding meal if planner member without edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(planner);
    await PlannerMemberActions.save({
        plannerId: planner.plannerId,
        members: [
            {
                userId: user!.userId,
                status: UserStatus.Registered,
            },
        ],
    });

    const res = await request(app)
        .post(PlannerEndpoint.postPlannerMeal(planner.plannerId))
        .set(token)
        .send({
            data: {
                id: uuid(),
                dayOfMonth: randomNumber(),
                month: randomNumber(),
                meal: uuid(),
                year: randomNumber(),
                createdBy: user.userId,
            },
        } satisfies PostPlannerMealRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should allow adding meal if planner member with edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    const meal = {
        id: uuid(),
        dayOfMonth: randomNumber(),
        month: randomNumber(),
        meal: uuid(),
        year: randomNumber(),
    } satisfies PostPlannerMealRequestBody["data"];

    await PlannerActions.save(planner);
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
    expect(plannerMeal?.id).toEqual(meal.id);
});

test("should allow editing if planner owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<PlannerActions, "save">;

    const meal = {
        id: uuid(),
        dayOfMonth: randomNumber(),
        month: randomNumber(),
        meal: uuid(),
        year: randomNumber(),
    } satisfies PostPlannerMealRequestBody["data"];

    await PlannerActions.save(planner);

    const res = await request(app)
        .post(PlannerEndpoint.postPlannerMeal(planner.plannerId))
        .set(token)
        .send({ data: meal } satisfies PostPlannerMealRequestBody);

    expect(res.statusCode).toEqual(201);

    const plannerMeals = await InternalPlannerMealActions.readAll({ plannerId: planner.plannerId });

    expect(plannerMeals.length).toEqual(1);

    const [plannerMeal] = plannerMeals;

    expect(plannerMeal?.plannerId).toEqual(planner.plannerId);
    expect(plannerMeal?.id).toEqual(meal.id);
});

test("should move meal from cook list to planner", async () => {
    const [token, { userId }] = await PrepareAuthenticatedUser();

    const cookListMeal = {
        id: uuid(),
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
    } satisfies ServiceParams<PlannerActions, "save">;

    await PlannerActions.save(planner);

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
    expect(plannerMeal?.id).toEqual(cookListMeal.id);

    const cookListMeals = await CookListMealActions.readMy({ userId });
    expect(cookListMeals.length).toEqual(0);
});
