import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { CreateUsers } from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

let database: KnexDatabase;
let app: Express;

beforeEach(async () => {
    database = await db.transaction();
    app = createTestApp({ database });
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

describe("Rate limiter middleware", () => {
    it("should trigger 429 responses after 150 requests", async () => {
        const responses = await Promise.all(
            Array.from({ length: 150 }).map(() => request(app).get("/v1")),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));

        const limited = await Promise.all([
            request(app).get("/v1/books"),
            request(app).get("/v1/planners"),
            request(app).delete(`/v1/lists/${v4()}`),
        ]);

        limited.map(({ statusCode }) => expect(statusCode).toEqual(429));
    });

    it("should apply the restrictive rate limit to login", async () => {
        const [user] = await CreateUsers(database);

        const requestBody: components["schemas"]["AuthLogin"] = {
            email: user!.email,
            password: user!.password,
        };

        const responses = await Promise.all(
            Array.from({ length: 10 }).map(() =>
                request(app).post("/v1/auth/login").send(requestBody),
            ),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));

        const res = await request(app).post("/v1/auth/login").send(requestBody);
        expect(res.statusCode).toEqual(429);
    });

    it("should apply the restrictive rate limit to register", async () => {
        const requestBody: components["schemas"]["AuthRegister"] = {
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            password: "secure_password",
        };

        const responses = await Promise.all(
            Array.from({ length: 10 }).map(() =>
                request(app).post("/v1/auth/register").send(requestBody),
            ),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));

        const res = await request(app)
            .post("/v1/auth/register")
            .send({ ...requestBody, email: "final@example.com" });
        expect(res.statusCode).toEqual(429);
    });

    it("should apply the restrictive rate limit to refresh", async () => {
        const requestBody = { refreshToken: "some-token" };

        const responses = await Promise.all(
            Array.from({ length: 10 }).map(() =>
                request(app).post("/v1/auth/refresh").send(requestBody),
            ),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));

        const res = await request(app)
            .post("/v1/auth/refresh")
            .send(requestBody);
        expect(res.statusCode).toEqual(429);
    });
});
