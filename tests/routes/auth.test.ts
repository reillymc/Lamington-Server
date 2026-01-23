import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";

import { setupApp } from "../../src/app.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import { KnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";
import { type components, UserStatus } from "../../src/routes/spec/index.ts";
import { comparePassword } from "../../src/services/password.ts";
import { CreateUsers } from "../helpers/index.ts";

after(async () => {
    await db.destroy();
});

describe("Login a user", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
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
            password: "invalid",
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

        expect(data.authorization?.token).toBeTruthy();
        expect(data.authorization?.tokenType).toEqual("Bearer");
    });

    it("should return pending error message when logging in with pending account", async () => {
        const [user] = await CreateUsers(database, {
            status: UserStatus.Pending,
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
            status: UserStatus.Blacklisted,
        });
        if (!user) throw new Error("User not created");

        const requestBody: components["schemas"]["AuthLogin"] = {
            email: user.email,
            password: user.password,
        };

        const res = await request(app).post("/v1/auth/login").send(requestBody);

        expect(res.statusCode).toEqual(200);
        const data = res.body as components["schemas"]["AuthResponse"];
        expect(data.user.status).toEqual(UserStatus.Blacklisted);
        expect(data.authorization?.token).toBeDefined();
    });
});

describe("Register a new user", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
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
            password: "password",
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
            password: "password",
        };

        const res = await request(app)
            .post("/v1/auth/register")
            .send(requestBody);

        expect(res.statusCode).toEqual(200);

        const { users: pendingUsers } = await KnexUserRepository.readAll(
            database,
            {
                filter: { status: UserStatus.Pending },
            },
        );

        expect(pendingUsers.length).toEqual(1);

        const [user] = pendingUsers;

        expect(user?.email).toEqual(requestBody.email);
        expect(user?.firstName).toEqual(requestBody.firstName);
        expect(user?.lastName).toEqual(requestBody.lastName);
        expect(user?.status).toEqual(UserStatus.Pending);
    });

    it("should convert email to lower case", async () => {
        const requestBody: components["schemas"]["AuthRegister"] = {
            email: "Email_Address@hosT.CoM",
            firstName: "John",
            lastName: "Doe",
            password: "password",
        };

        const res = await request(app)
            .post("/v1/auth/register")
            .send(requestBody);

        expect(res.statusCode).toEqual(200);

        const { users: pendingUsers } = await KnexUserRepository.readAll(
            database,
            {
                filter: { status: UserStatus.Pending },
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
            password: "password",
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
            password: "password",
        } satisfies components["schemas"]["AuthRegister"];

        await request(app).post("/v1/auth/register").send(user).expect(200);

        const res = await request(app).post("/v1/auth/register").send(user);

        expect(res.statusCode).toEqual(400);
    });
});
