import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import type { KnexDatabase } from "../src/repositories/knex/knex.ts";
import { createTestApp, db } from "./helpers/setup.ts";

let database: KnexDatabase;
let app: Express;

after(async () => {
    await db.destroy();
});

describe("API Docs", () => {
    before(async () => {
        database = await db.transaction();
        app = createTestApp({ database });
    });

    after(async () => {
        await database.rollback();
    });

    it("should serve the docs at the root", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toEqual(200);
        expect(res.headers["content-type"]).toContain("text/html");
    });

    it("should serve the docs at /docs", async () => {
        const res = await request(app).get("/docs");
        expect(res.statusCode).toEqual(200);
        expect(res.headers["content-type"]).toContain("text/html");
    });

    it("should not serve docs for unmatched routes", async () => {
        const res = await request(app).get("/v1/not-a-real-route");
        expect(res.statusCode).toEqual(404);
    });
});

describe("Body Parser Limits", () => {
    beforeEach(async () => {
        database = await db.transaction();
        app = createTestApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should return 413 for JSON bodies exceeding the size limit", async () => {
        const largePayload = JSON.stringify({
            name: "a".repeat(2 * 1024 * 1024),
        });

        const res = await request(app)
            .post("/v1/recipes")
            .set("Content-Type", "application/json")
            .send(largePayload);

        expect(res.statusCode).toEqual(413);
    });
});
