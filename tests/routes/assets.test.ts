import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";

import { setupApp } from "../../src/app.ts";
import db from "../../src/database/index.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";

after(async () => {
    await db.destroy();
});

describe("Get preset ingredients", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
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

        const { data } = res.body;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
    });
});
