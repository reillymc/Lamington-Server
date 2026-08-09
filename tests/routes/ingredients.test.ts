import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import request from "supertest";
import type { components } from "../../src/routes/spec/index.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import {
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "../helpers/setup.ts";

describe("Get user ingredients", () => {
    let { app, ingredientRepository, userRepository } = TestContext;

    beforeEach(async () => {
        await beginTestTransaction();
        ({ app, ingredientRepository, userRepository } = createTestApp({}));
    });

    afterEach(async () => {
        await rollbackTestTransaction();
    });

    withCxIt("should require authentication", async () => {
        const res = await request(app).get("/v1/ingredients");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return user ingredients", async () => {
        const [token, { userId }] =
            await PrepareAuthenticatedUser(userRepository);

        await ingredientRepository.create({
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
});
