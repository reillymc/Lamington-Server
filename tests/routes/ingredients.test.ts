import { expect } from "expect";
import type { Express } from "express";
import { before, describe, it } from "node:test";
import request from "supertest";

import { setupApp } from "../../src/app.ts";
import type { GetIngredientsResponse } from "../../src/routes/spec/index.ts";
import { default as knexDb, type KnexDatabase } from "../../src/database/index.ts";
import {
    CreateIngredients,
    CreateUsers,
    IngredientEndpoint,
    PrepareAuthenticatedUser,
    randomNumber,
} from "../helpers/index.ts";

const db = knexDb as KnexDatabase;

describe("get ingredients", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(IngredientEndpoint.getIngredients);

        expect(res.statusCode).toEqual(401);
    });

    it("should return ingredients from all users", async () => {
        const [token, _] = await PrepareAuthenticatedUser(db);
        const randomUsers = await CreateUsers(db, { count: randomNumber() });

        const ingredientCount = randomNumber();

        const temp = await CreateIngredients({
            count: ingredientCount,
            createdBy: randomUsers.map(user => user.userId),
        });

        const res = await request(app).get(IngredientEndpoint.getIngredients).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetIngredientsResponse;

        expect(Object.keys(data ?? {}).length).toEqual(ingredientCount);
    });
});

describe("get my ingredients", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(IngredientEndpoint.getMyIngredients);

        expect(res.statusCode).toEqual(401);
    });

    it("should return only ingredients for current user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(db);
        const [otherUser] = await CreateUsers(db, { count: 1 });

        const [_, count] = await CreateIngredients({ createdBy: user.userId });
        await CreateIngredients({ createdBy: otherUser!.userId });

        const res = await request(app).get(IngredientEndpoint.getMyIngredients).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetIngredientsResponse;

        expect(Object.keys(data ?? {}).length).toEqual(count);
    });
});
