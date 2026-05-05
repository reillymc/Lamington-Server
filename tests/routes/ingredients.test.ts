import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import {
    SYSTEM_INGREDIENTS,
    seed,
} from "../../src/database/seeds/production/02_default_ingredients.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexIngredientRepository } from "../../src/repositories/knex/knexIngredientRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

after(async () => {
    await db.destroy();
});

describe("Get user and system ingredients", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = createTestApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).get("/v1/ingredients");
        expect(res.statusCode).toEqual(401);
    });

    it("should return user ingredients", async () => {
        const [token, { userId }] = await PrepareAuthenticatedUser(database);

        await KnexIngredientRepository.create(database, {
            userId,
            ingredients: [
                {
                    name: "Apple",
                    namePlural: "Apples",
                    description: "A delicious fruit",
                },
            ],
        });

        const res = await request(app).get("/v1/ingredients").set(token);

        expect(res.statusCode).toEqual(200);

        const ingredients = res.body as components["schemas"]["Ingredient"][];
        expect(ingredients.length).toEqual(1);

        const [ingredient] = ingredients;

        expect(ingredient!.name).toEqual("Apple");
        expect(ingredient!.namePlural).toEqual("Apples");
        expect(ingredient!.description).toEqual("A delicious fruit");
    });

    it("should return system ingredients", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        await seed(database);

        const res = await request(app).get("/v1/ingredients").set(token);

        expect(res.statusCode).toEqual(200);

        const ingredients = res.body as components["schemas"]["Ingredient"][];
        expect(ingredients.length).toEqual(SYSTEM_INGREDIENTS.length);

        expect(ingredients.every(({ owner }) => owner === undefined)).toBe(
            true,
        );
    });
});
