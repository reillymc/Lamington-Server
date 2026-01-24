import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 } from "uuid";
import { setupApp } from "../src/app.ts";
import db, { type KnexDatabase } from "../src/database/index.ts";
import type { components } from "../src/routes/spec/index.ts";
import { BookEndpoint, CreateUsers } from "./helpers/index.ts";

let database: KnexDatabase;
let app: Express;

beforeEach(async () => {
    database = await db.transaction();
    app = setupApp({ database }); // App setup with default rate limiter
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

describe("rate limits", () => {
    describe("for auth", () => {
        describe("login", () => {
            it("should trigger 429 response after 10 requests", async () => {
                const [user] = await CreateUsers(database);

                const requestBody: components["schemas"]["AuthLogin"] = {
                    email: user!.email,
                    password: user!.password,
                };

                for (let i = 0; i < 10; i++) {
                    const res = await request(app)
                        .post("/v1/auth/login")
                        .send(requestBody);
                    expect(res.statusCode).not.toEqual(429);
                }

                const res = await request(app)
                    .post("/v1/auth/login")
                    .send(requestBody);
                expect(res.statusCode).toEqual(429);
            });
        });

        describe("for register", () => {
            it("should trigger 429 response after 10 requests", async () => {
                const requestBody: components["schemas"]["AuthRegister"] = {
                    email: "test@example.com",
                    firstName: "Test",
                    lastName: "User",
                    password: "secure_password",
                };

                for (let i = 0; i < 10; i++) {
                    const res = await request(app)
                        .post("/v1/auth/register")
                        .send({
                            ...requestBody,
                            email: `test${i}@example.com`,
                        });
                    expect(res.statusCode).not.toEqual(429);
                }

                const res = await request(app)
                    .post("/v1/auth/register")
                    .send({ ...requestBody, email: "final@example.com" });
                expect(res.statusCode).toEqual(429);
            });
        });

        describe("for refresh", () => {
            it("should trigger 429 response after 10 requests", async () => {
                const requestBody = { refreshToken: "some-token" };

                for (let i = 0; i < 10; i++) {
                    const res = await request(app)
                        .post("/v1/auth/refresh")
                        .send(requestBody);
                    expect(res.statusCode).not.toEqual(429);
                }

                const res = await request(app)
                    .post("/v1/auth/refresh")
                    .send(requestBody);
                expect(res.statusCode).toEqual(429);
            });
        });
    });

    describe("for general", () => {
        it("books should trigger 429 response after 100 requests", async () => {
            for (let i = 0; i < 100; i++) {
                const res = await request(app).get(BookEndpoint.getBooks);
                expect(res.statusCode).not.toEqual(429);
            }

            const res = await request(app).get(BookEndpoint.getBooks);
            expect(res.statusCode).toEqual(429);
        });

        it("planners should trigger 429 response after 100 requests", async () => {
            for (let i = 0; i < 100; i++) {
                const res = await request(app).get("/v1/planners");
                expect(res.statusCode).not.toEqual(429);
            }

            const res = await request(app).get("/v1/planners");
            expect(res.statusCode).toEqual(429);
        });

        it("lists should trigger 429 response after 100 requests", async () => {
            for (let i = 0; i < 100; i++) {
                const res = await request(app).delete(`/v1/lists/${v4()}`);

                expect(res.statusCode).not.toEqual(429);
            }

            const res = await request(app).delete(`/v1/lists/${v4()}`);

            expect(res.statusCode).toEqual(429);
        });
    });
});
