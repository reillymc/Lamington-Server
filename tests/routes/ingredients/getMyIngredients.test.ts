import request from "supertest";

import app from "../../../src/app";
import { GetIngredientsResponse } from "../../../src/routes/spec";
import { CreateIngredients, CreateUsers, IngredientEndpoint, PrepareAuthenticatedUser } from "../../helpers";

test("route should require authentication", async () => {
    const res = await request(app).get(IngredientEndpoint.getMyIngredients);

    expect(res.statusCode).toEqual(401);
});

test("should return only ingredients for current user", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers({ count: 1 });

    const [_, count] = await CreateIngredients({ createdBy: user.userId });
    await CreateIngredients({ createdBy: otherUser!.userId });

    const res = await request(app).get(IngredientEndpoint.getMyIngredients).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetIngredientsResponse;

    expect(Object.keys(data ?? {}).length).toEqual(count);
});
