import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { v4 } from "uuid";
import db from "../src/database/index.ts";
import type { KnexDatabase } from "../src/repositories/knex/knex.ts";
import { CreateUsers } from "./helpers/index.ts";
import { accessSecret, createTestApp } from "./helpers/setup.ts";

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
        const payload = { userId: v4(), status: "P" };
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
        const payload = { userId: v4(), status: "B" };
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
        const payload = { userName: v4(), status: "B" };
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
        const payload = { userId: user!.userId, status: "M" };
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
            Array.from({ length: 100 }).map(() => request(app).get("/v1")),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));
    });

    after(async () => {
        await database.rollback();
    });

    it("books should trigger 429 response after 100 requests", async () => {
        const res = await request(app).get("/v1/books");
        expect(res.statusCode).toEqual(429);
    });

    it("planners should trigger 429 response after 100 requests", async () => {
        const res = await request(app).get("/v1/planners");
        expect(res.statusCode).toEqual(429);
    });

    it("lists should trigger 429 response after 100 requests", async () => {
        const res = await request(app).delete(`/v1/lists/${v4()}`);

        expect(res.statusCode).toEqual(429);
    });
});
