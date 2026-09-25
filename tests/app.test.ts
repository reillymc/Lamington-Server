import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { v4 } from "uuid";
import type { KnexDatabase } from "../src/repositories/knex/knex.ts";
import { CreateUsers } from "./helpers/index.ts";
import { accessSecret, createTestApp, db } from "./helpers/setup.ts";

let database: KnexDatabase;
let app: Express;

after(async () => {
    await db.destroy();
});

describe("Authentication Middleware", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = createTestApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should return 401 if no token provided", async () => {
        const res = await request(app).get("/v1/profile");
        expect(res.statusCode).toEqual(401);
    });

    it("should return 401 if token verification fails", async () => {
        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", "Bearer invalid-token");
        expect(res.statusCode).toEqual(401);
    });

    it("should return 401 if user status is Pending (P)", async () => {
        const payload = { userId: v4(), status: "P", tokenUse: "access" };
        const token = jwt.sign(payload, accessSecret, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 401 if user status is Blocked (B)", async () => {
        const payload = { userId: v4(), status: "B", tokenUse: "access" };
        const token = jwt.sign(payload, accessSecret, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 401 if token format is invalid", async () => {
        const payload = { userName: v4(), status: "B", tokenUse: "access" };
        const token = jwt.sign(payload, accessSecret, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should authorise valid user", async () => {
        const [user] = await CreateUsers(database, { status: "M" });
        const payload = {
            userId: user!.userId,
            status: "M",
            tokenUse: "access",
        };
        const token = jwt.sign(payload, accessSecret, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.userId).toEqual(user!.userId);
    });
});

describe("Rate Limiter Middleware", () => {
    before(async () => {
        // App setup with default rate limiter
        database = await db.transaction();
        app = createTestApp({ database });

        // Exceed rate limit for general endpoints
        const responses = await Promise.all(
            Array.from({ length: 150 }).map(() => request(app).get("/v1")),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));
    });

    after(async () => {
        await database.rollback();
    });

    it("should trigger 429 responses after 150 requests", async () => {
        const responses = await Promise.all([
            request(app).get("/v1/books"),
            request(app).get("/v1/planners"),
            request(app).delete(`/v1/lists/${v4()}`),
        ]);

        responses.map(({ statusCode }) => expect(statusCode).toEqual(429));
    });
});

describe("API Docs", () => {
    let database: KnexDatabase;
    let app: Express;

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
    let database: KnexDatabase;
    let app: Express;

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
