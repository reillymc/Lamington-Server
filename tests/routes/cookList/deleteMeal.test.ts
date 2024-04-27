import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { CookListMealActions, CookListMealActionsInternal } from "../../../src/controllers";
import { ServiceParams } from "../../../src/database";
import { CookListEndpoint, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";

test("route should require authentication", async () => {
    const res = await request(app).get(CookListEndpoint.deleteMeal(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should delete meal belonging to user", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const meal = {
        id: uuid(),
        description: uuid(),
        meal: uuid(),
        sequence: 0,
        source: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<CookListMealActions, "save">;

    await CookListMealActions.save(meal);

    const mealsBeforeDeletion = await CookListMealActionsInternal.read(meal);

    expect(mealsBeforeDeletion.length).toEqual(1);

    const res = await request(app).delete(CookListEndpoint.deleteMeal(meal.id)).set(token).send();
    expect(res.statusCode).toEqual(201);

    const mealsAfterDeletion = await CookListMealActionsInternal.read(meal);

    expect(mealsAfterDeletion.length).toEqual(0);
});

test("should not delete meal belonging to another user", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers();

    const meal = {
        id: uuid(),
        description: uuid(),
        meal: uuid(),
        sequence: 0,
        source: uuid(),
        createdBy: otherUser!.userId,
    } satisfies ServiceParams<CookListMealActions, "save">;

    await CookListMealActions.save(meal);

    const mealsBeforeDeletion = await CookListMealActionsInternal.read(meal);

    expect(mealsBeforeDeletion.length).toEqual(1);

    const res = await request(app).delete(CookListEndpoint.deleteMeal(meal.id)).set(token).send();
    expect(res.statusCode).toEqual(403);

    const mealsAfterDeletion = await CookListMealActionsInternal.read(meal);

    expect(mealsAfterDeletion.length).toEqual(1);
});
