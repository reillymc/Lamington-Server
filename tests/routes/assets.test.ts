import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

after(async () => {
    await db.destroy();
});

describe("Get preset ingredients", () => {
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
        const res = await request(app).get("/v1/assets/ingredients.json");
        expect(res.statusCode).toEqual(401);
    });

    it("should return ingredients list", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app)
            .get("/v1/assets/ingredients.json")
            .set(token);

        expect(res.statusCode).toEqual(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });
});
