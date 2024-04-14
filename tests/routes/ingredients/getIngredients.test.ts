import request from "supertest";

import app from "../../../src/app";
import { GetIngredientsResponse } from "../../../src/routes/spec";
import {
    CleanTables,
    CreateIngredients,
    CreateUsers,
    IngredientEndpoint,
    PrepareAuthenticatedUser,
    randomNumber,
} from "../../helpers";

beforeEach(async () => {
    await CleanTables("ingredient", "user");
});

afterAll(async () => {
    await CleanTables("ingredient", "user");
});

test("route should require authentication", async () => {
    const res = await request(app).get(IngredientEndpoint.getIngredients);

    expect(res.statusCode).toEqual(401);
});

test("should return ingredients from all users user", async () => {
    const [token, _] = await PrepareAuthenticatedUser();
    const randomUsers = await CreateUsers({ count: randomNumber() });

    const ingredientCount = randomNumber();

    await CreateIngredients({ count: ingredientCount, createdBy: randomUsers.map(user => user.userId) });

    const res = await request(app).get(IngredientEndpoint.getIngredients).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetIngredientsResponse;

    expect(Object.keys(data ?? {}).length).toEqual(ingredientCount);
});
