import { expect } from "expect";
import type { Express } from "express";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import request from "supertest";

import { setupApp } from "../../src/app.ts";
import { InternalUserActions, UserActions } from "../../src/controllers/user.ts";
import { type LoginResponse, type RegisterRequestBody, UserStatus } from "../../src/routes/spec/index.ts";
import { comparePassword } from "../../src/services/password.ts";
import { AuthEndpoint, CreateUsers } from "../helpers/index.ts";

describe("login", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("should fail login with invalid email", async () => {
        const [user] = await CreateUsers();

        if (!user) throw new Error("User not created");

        const requestBody = {
            email: "invalid",
            password: user.password,
        };

        const res = await request(app).post(AuthEndpoint.login).send(requestBody);

        assert.strictEqual(res.statusCode, 401);
    });

    it("should fail login with invalid password", async () => {
        const [user] = await CreateUsers();

        if (!user) throw new Error("User not created");

        const requestBody = {
            email: user.email,
            password: "invalid",
        };

        const res = await request(app).post(AuthEndpoint.login).send(requestBody);

        expect(res.statusCode).toEqual(401);
    });

    it("should login with valid credentials", async () => {
        const [user] = await CreateUsers();

        if (!user) throw new Error("User not created");

        const requestBody = {
            email: user.email,
            password: user.password,
        };

        const res = await request(app).post(AuthEndpoint.login).send(requestBody);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as LoginResponse;

        if (!data) throw new Error("No data returned");

        expect(data.user.email).toEqual(user.email);

        expect(data.authorization?.token).toBeTruthy();
        expect(data.authorization?.tokenType).toEqual("Bearer");
    });

    it("should return pending error message when logging in with pending account", async () => {
        const [user] = await CreateUsers({ status: UserStatus.Pending });

        if (!user) throw new Error("User not created");

        const requestBody = {
            email: user.email,
            password: user.password,
        };

        const res = await request(app).post(AuthEndpoint.login).send(requestBody);

        expect(res.statusCode).toEqual(200);

        const { message } = res.body as LoginResponse;

        expect(message).toEqual("Account is pending approval");
    });
});

describe("register", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("should fail register missing password", async () => {
        const requestBody: Partial<RegisterRequestBody> = {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
        };

        const res = await request(app).post(AuthEndpoint.register).send(requestBody);

        expect(res.statusCode).toEqual(400);
    });

    it("should fail register missing email", async () => {
        const requestBody: Partial<RegisterRequestBody> = {
            firstName: "John",
            lastName: "Doe",
            password: "password",
        };

        const res = await request(app).post(AuthEndpoint.register).send(requestBody);

        expect(res.statusCode).toEqual(400);
    });

    it("should register new user with valid request and set to pending", async () => {
        const requestBody: Partial<RegisterRequestBody> = {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
            password: "password",
        };

        const res = await request(app).post(AuthEndpoint.register).send(requestBody);

        expect(res.statusCode).toEqual(200);

        const pendingUsers = await UserActions.readPending();

        expect(pendingUsers.length).toEqual(1);

        const [user] = pendingUsers;

        expect(user?.email).toEqual(requestBody.email);
        expect(user?.firstName).toEqual(requestBody.firstName);
        expect(user?.lastName).toEqual(requestBody.lastName);
        expect(user?.status).toEqual(UserStatus.Pending);
    });

    it("should convert email to lower case", async () => {
        const requestBody: RegisterRequestBody = {
            email: "Email_Address@hosT.CoM",
            firstName: "John",
            lastName: "Doe",
            password: "password",
        };

        const res = await request(app).post(AuthEndpoint.register).send(requestBody);

        expect(res.statusCode).toEqual(200);

        const pendingUsers = await UserActions.readPending();

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
        } satisfies RegisterRequestBody;

        const res = await request(app).post(AuthEndpoint.register).send(requestBody);

        expect(res.statusCode).toEqual(200);

        const [user] = await InternalUserActions.read({ email: requestBody.email });

        if (!user) throw new Error("User not created");

        expect(user.password).not.toEqual("password");

        const passwordCorrect = await comparePassword(requestBody.password, user.password);

        expect(passwordCorrect).toBeTruthy();
    });

    // TODO: tests for default user data
});
