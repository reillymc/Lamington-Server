import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import request from "supertest";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import {
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "../helpers/setup.ts";

describe("Get preset ingredients", () => {
    let { app, userRepository } = TestContext;

    beforeEach(async () => {
        await beginTestTransaction();
        ({ app, userRepository } = createTestApp({}));
    });

    afterEach(async () => {
        await rollbackTestTransaction();
    });

    withCxIt("should require authentication", async () => {
        const res = await request(app).get("/v1/assets/ingredients.json");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return ingredients list", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);
        const res = await request(app)
            .get("/v1/assets/ingredients.json")
            .set(token);

        expect(res.statusCode).toEqual(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });
});
