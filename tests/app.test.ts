import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { v4 } from "uuid";
import { setupApp } from "../src/app.ts";
import db from "../src/database/index.ts";
import type { KnexDatabase } from "../src/repositories/knex/knex.ts";
import type { components } from "../src/routes/spec/index.ts";
import { CreateUsers } from "./helpers/index.ts";

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
        app = setupApp({ database });
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
        const token = jwt.sign(payload, process.env.JWT_SECRET!, {
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
        const token = jwt.sign(payload, process.env.JWT_SECRET!, {
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
        const token = jwt.sign(payload, process.env.JWT_SECRET!, {
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
    describe("for auth", async () => {
        before(async () => {
            database = await db.transaction();
            app = setupApp({ database }); // App setup with default rate limiter

            const [user] = await CreateUsers(database);

            const requestBody: components["schemas"]["AuthLogin"] = {
                email: user!.email,
                password: user!.password,
            };

            // Exceed rate limit for auth endpoints
            for (let i = 0; i < 5; i++) {
                const res = await request(app)
                    .post("/v1/auth/login")
                    .send(requestBody);
                expect(res.statusCode).not.toEqual(429);
            }
        });

        after(async () => {
            await database.rollback();
        });

        it("login should trigger 429 response after 5 requests", async () => {
            const [user] = await CreateUsers(database);

            const requestBody: components["schemas"]["AuthLogin"] = {
                email: user!.email,
                password: user!.password,
            };

            const res = await request(app)
                .post("/v1/auth/login")
                .send(requestBody);
            expect(res.statusCode).toEqual(429);
        });

        it("register should trigger 429 response after 5 requests", async () => {
            const requestBody: components["schemas"]["AuthRegister"] = {
                email: "test@example.com",
                firstName: "Test",
                lastName: "User",
                password: "secure_password",
            };

            const res = await request(app)
                .post("/v1/auth/register")
                .send({ ...requestBody, email: "final@example.com" });
            expect(res.statusCode).toEqual(429);
        });

        it("refresh should trigger 429 response after 5 requests", async () => {
            const requestBody = { refreshToken: "some-token" };

            const res = await request(app)
                .post("/v1/auth/refresh")
                .send(requestBody);
            expect(res.statusCode).toEqual(429);
        });
    });

    describe("for general", () => {
        before(async () => {
            database = await db.transaction();
            app = setupApp({ database }); // App setup with default rate limiter

            // Exceed rate limit for general endpoints
            for (let i = 0; i < 100; i++) {
                const res = await request(app).get("/v1/planners");
                expect(res.statusCode).not.toEqual(429);
            }
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
});
