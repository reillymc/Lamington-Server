import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { DefaultAppMiddleware } from "../../src/appDependencies.ts";
import config from "../../src/config.ts";
import db from "../../src/database/index.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { comparePassword } from "../../src/services/userService.ts";
import { CreateUsers } from "../helpers/index.ts";
import { createTestApp } from "../helpers/setup.ts";

const { jwtRefreshSecret } = config.authentication;

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

describe("Login a user", () => {
    it("login respect restrictive rate limit", async () => {
        // Setup app without test rate limiter overrides
        app = createTestApp({ database, middleware: DefaultAppMiddleware() });

        const [user] = await CreateUsers(database);

        const requestBody: components["schemas"]["AuthLogin"] = {
            email: user!.email,
            password: user!.password,
        };

        // Exceed rate limit
        const responses = await Promise.all(
            Array.from({ length: 5 }).map(() =>
                request(app).post("/v1/auth/login").send(requestBody),
            ),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));

        const res = await request(app).post("/v1/auth/login").send(requestBody);
        expect(res.statusCode).toEqual(429);
    });

    it("should fail login with invalid email", async () => {
        const [user] = await CreateUsers(database);

        if (!user) throw new Error("User not created");

        const requestBody: components["schemas"]["AuthLogin"] = {
            email: "email@test.email",
            password: user.password,
        };

        const res = await request(app).post("/v1/auth/login").send(requestBody);

        expect(res.statusCode).toEqual(401);
    });

    it("should fail login with invalid password", async () => {
        const [user] = await CreateUsers(database);

        if (!user) throw new Error("User not created");

        const requestBody: components["schemas"]["AuthLogin"] = {
            email: user.email,
            password: "invalid_password",
        };

        const res = await request(app).post("/v1/auth/login").send(requestBody);

        expect(res.statusCode).toEqual(401);
    });

    it("should login with valid credentials", async () => {
        const [user] = await CreateUsers(database);

        if (!user) throw new Error("User not created");

        const requestBody: components["schemas"]["AuthLogin"] = {
            email: user.email,
            password: user.password,
        };

        const res = await request(app).post("/v1/auth/login").send(requestBody);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["AuthResponse"];

        if (!data) throw new Error("No data returned");

        expect(data.user.email).toEqual(user.email);

        expect(data.authorization?.access).toBeTruthy();
        expect(data.authorization?.refresh).toBeTruthy();
    });

    it("should return pending error message when logging in with pending account", async () => {
        const [user] = await CreateUsers(database, {
            status: "P",
        });

        if (!user) throw new Error("User not created");

        const requestBody: components["schemas"]["AuthLogin"] = {
            email: user.email,
            password: user.password,
        };

        const res = await request(app).post("/v1/auth/login").send(requestBody);

        expect(res.statusCode).toEqual(200);

        const { message } = res.body as components["schemas"]["AuthResponse"];

        expect(message).toEqual("Account is pending approval");
    });

    it("should login successfully but return Blacklisted status for blacklisted user", async () => {
        const [user] = await CreateUsers(database, {
            status: "B",
        });
        if (!user) throw new Error("User not created");

        const requestBody: components["schemas"]["AuthLogin"] = {
            email: user.email,
            password: user.password,
        };

        const res = await request(app).post("/v1/auth/login").send(requestBody);

        expect(res.statusCode).toEqual(200);
        const data = res.body as components["schemas"]["AuthResponse"];
        expect(data.user.status).toEqual("B");
        expect(data.authorization).toBeUndefined();
    });
});

describe("Register a new user", () => {
    it("should respect restrictive rate limit", async () => {
        // Setup app without test rate limiter overrides
        app = createTestApp({ database, middleware: DefaultAppMiddleware() });

        const requestBody: components["schemas"]["AuthRegister"] = {
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            password: "secure_password",
        };

        // Exceed rate limit
        const responses = await Promise.all(
            Array.from({ length: 5 }).map(() =>
                request(app).post("/v1/auth/register").send(requestBody),
            ),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));

        const res = await request(app)
            .post("/v1/auth/register")
            .send({ ...requestBody, email: "final@example.com" });
        expect(res.statusCode).toEqual(429);
    });

    it("should fail register missing password", async () => {
        const requestBody: Partial<components["schemas"]["AuthRegister"]> = {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
        };

        const res = await request(app)
            .post("/v1/auth/register")
            .send(requestBody);

        expect(res.statusCode).toEqual(400);
    });

    it("should fail register missing email", async () => {
        const requestBody: Partial<components["schemas"]["AuthRegister"]> = {
            firstName: "John",
            lastName: "Doe",
            password: "secure_password",
        };

        const res = await request(app)
            .post("/v1/auth/register")
            .send(requestBody);

        expect(res.statusCode).toEqual(400);
    });

    it("should fail register with short password", async () => {
        const requestBody: components["schemas"]["AuthRegister"] = {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
            password: "short",
        };

        const res = await request(app)
            .post("/v1/auth/register")
            .send(requestBody);

        expect(res.statusCode).toEqual(400);
    });

    it("should register new user with valid request and set to pending", async () => {
        const requestBody: components["schemas"]["AuthRegister"] = {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
            password: "secure_password",
        };

        const res = await request(app)
            .post("/v1/auth/register")
            .send(requestBody);

        expect(res.statusCode).toEqual(200);

        const { users: pendingUsers } = await KnexUserRepository.readAll(
            database,
            {
                filter: { status: "P" },
            },
        );

        expect(pendingUsers.length).toEqual(1);

        const [user] = pendingUsers;

        expect(user?.email).toEqual(requestBody.email);
        expect(user?.firstName).toEqual(requestBody.firstName);
        expect(user?.lastName).toEqual(requestBody.lastName);
        expect(user?.status).toEqual("P");
    });

    it("should convert email to lower case", async () => {
        const requestBody: components["schemas"]["AuthRegister"] = {
            email: "Email_Address@hosT.CoM",
            firstName: "John",
            lastName: "Doe",
            password: "secure_password",
        };

        const res = await request(app)
            .post("/v1/auth/register")
            .send(requestBody);

        expect(res.statusCode).toEqual(200);

        const { users: pendingUsers } = await KnexUserRepository.readAll(
            database,
            {
                filter: { status: "P" },
            },
        );

        expect(pendingUsers.length).toEqual(1);

        const [user] = pendingUsers;

        expect(user?.email).toEqual(requestBody.email?.toLowerCase());
    });

    it("hashed password should not equal plain text password", async () => {
        const requestBody = {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
            password: "secure_password",
        } satisfies components["schemas"]["AuthRegister"];

        const res = await request(app)
            .post("/v1/auth/register")
            .send(requestBody);

        expect(res.statusCode).toEqual(200);

        const {
            users: [user],
        } = await KnexUserRepository.readCredentials(database, {
            users: [{ email: requestBody.email }],
        });

        if (!user) throw new Error("User not created");

        expect(user.password).not.toEqual("password");

        const passwordCorrect = await comparePassword(
            requestBody.password,
            user.password,
        );

        expect(passwordCorrect).toBeTruthy();
    });

    it("should fail to register with existing email", async () => {
        const user = {
            email: "duplicate@example.com",
            firstName: "John",
            lastName: "Doe",
            password: "secure_password",
        } satisfies components["schemas"]["AuthRegister"];

        await request(app).post("/v1/auth/register").send(user).expect(200);

        const res = await request(app).post("/v1/auth/register").send(user);

        expect(res.statusCode).toEqual(400);
    });
});

describe("Refresh authentication token", () => {
    const createValidRefreshToken = (userId: string) => {
        return jwt.sign({ userId }, jwtRefreshSecret!, {
            noTimestamp: true,
            expiresIn: "5m",
        });
    };

    it("should respect general rate limit", async () => {
        // Setup app without test rate limiter overrides
        app = createTestApp({ database, middleware: DefaultAppMiddleware() });

        const requestBody = { refreshToken: "some-token" };

        // Exceed rate limit
        const responses = await Promise.all(
            Array.from({ length: 100 }).map(() =>
                request(app).post("/v1/auth/refresh").send(requestBody),
            ),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));

        const res = await request(app)
            .post("/v1/auth/refresh")
            .send(requestBody);
        expect(res.statusCode).toEqual(429);
    });

    it("should refresh tokens with a valid refresh token", async () => {
        const [user] = await CreateUsers(database);
        if (!user) throw new Error("User not created");

        const refreshToken = createValidRefreshToken(user.userId);

        const res = await request(app)
            .post("/v1/auth/refresh")
            .send({ refreshToken });

        expect(res.statusCode).toEqual(200);
        const data = res.body;

        expect(data.authorization).toBeDefined();
        expect(data.authorization.access).toBeDefined();
        expect(data.authorization.refresh).toBeDefined();
        expect(data.user.userId).toEqual(user.userId);
    });

    it("should fail with invalid refresh token", async () => {
        const res = await request(app)
            .post("/v1/auth/refresh")
            .send({ refreshToken: "invalid-token" });

        expect(res.statusCode).toEqual(401);
    });

    it("should fail with expired refresh token", async () => {
        const expiredToken = jwt.sign(
            { userId: "some-id" },
            jwtRefreshSecret!,
            {
                noTimestamp: true,
                expiresIn: "-1s",
            },
        );

        const res = await request(app)
            .post("/v1/auth/refresh")
            .send({ refreshToken: expiredToken });

        expect(res.statusCode).toEqual(401);
    });

    it("should fail if user does not exist", async () => {
        const nonExistentId = "00000000-0000-0000-0000-000000000000";
        const refreshToken = createValidRefreshToken(nonExistentId);

        const res = await request(app)
            .post("/v1/auth/refresh")
            .send({ refreshToken });

        expect(res.statusCode).toEqual(401);
    });

    it("should fail if user is Blacklisted", async () => {
        const [user] = await CreateUsers(database, {
            status: "B",
        });

        const refreshToken = createValidRefreshToken(user!.userId);

        const res = await request(app)
            .post("/v1/auth/refresh")
            .send({ refreshToken });

        expect(res.statusCode).toEqual(401);
    });

    it("should fail if user is Pending", async () => {
        const [user] = await CreateUsers(database, {
            status: "P",
        });

        const refreshToken = createValidRefreshToken(user!.userId);

        const res = await request(app)
            .post("/v1/auth/refresh")
            .send({ refreshToken });

        expect(res.statusCode).toEqual(401);
    });
});
