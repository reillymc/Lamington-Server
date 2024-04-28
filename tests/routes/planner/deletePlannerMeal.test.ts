import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import {
    InternalPlannerMealActions,
    PlannerActions,
    PlannerMealActions,
    PlannerMemberActions,
} from "../../../src/controllers";
import { PlannerMealService, PlannerService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { UserStatus } from "../../../src/routes/spec";
import { CreateUsers, PlannerEndpoint, PrepareAuthenticatedUser, randomNumber } from "../../helpers";

test("route should require authentication", async () => {
    const res = await request(app).delete(PlannerEndpoint.deletePlannerMeal(uuid(), uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant planner", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app).delete(PlannerEndpoint.deletePlannerMeal(uuid(), uuid())).set(token).send();

    expect(res.statusCode).toEqual(404);
});

test("should not allow deletion if not planner owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerService, "Save">;

    const plannerMeal = {
        id: uuid(),
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
        .delete(PlannerEndpoint.deletePlannerMeal(planner.plannerId, plannerMeal.id))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(403);
});

test("should not allow item deletion if planner member without edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerService, "Save">;

    const plannerMeal = {
        id: uuid(),
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
        .delete(PlannerEndpoint.deletePlannerMeal(planner.plannerId, plannerMeal.id))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(403);
});

test("should allow item deletion if planner member with edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [plannerOwner] = await CreateUsers();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: plannerOwner!.userId,
    } satisfies ServiceParams<PlannerService, "Save">;

    const plannerMeal = {
        id: uuid(),
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
        .delete(PlannerEndpoint.deletePlannerMeal(planner.plannerId, plannerMeal.id))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(201);

    const plannerMeals = await InternalPlannerMealActions.readAll({ plannerId: planner.plannerId });

    expect(plannerMeals.length).toEqual(0);
});

test("should allow deletion if planner owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const planner = {
        plannerId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<PlannerService, "Save">;

    const plannerMeal = {
        id: uuid(),
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
        .delete(PlannerEndpoint.deletePlannerMeal(planner.plannerId, plannerMeal.id))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(201);

    const plannerMeals = await InternalPlannerMealActions.readAll({ plannerId: planner.plannerId });

    expect(plannerMeals.length).toEqual(0);
});
