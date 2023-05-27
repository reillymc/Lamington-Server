import request from "supertest";

import app from "../../../src/app";
import { RegisterRequestBody, UserStatus } from "../../../src/routes/spec";
import { InternalUserActions, UserActions } from "../../../src/controllers";
import { comparePassword } from "../../../src/services";
import { AuthEndpoint, CleanTables } from "../../helpers";

beforeEach(async () => {
    await CleanTables("user");
});

afterAll(async () => {
    await CleanTables("user");
});

test("should fail register missing password", async () => {
    const requestBody: Partial<RegisterRequestBody> = {
        email: "user@email.com",
        firstName: "John",
        lastName: "Doe",
    };

    const res = await request(app).post(AuthEndpoint.register).send(requestBody);

    expect(res.statusCode).toEqual(400);
});

test("should fail register missing email", async () => {
    const requestBody: Partial<RegisterRequestBody> = {
        firstName: "John",
        lastName: "Doe",
        password: "password",
    };

    const res = await request(app).post(AuthEndpoint.register).send(requestBody);

    expect(res.statusCode).toEqual(400);
});

test("should register new user with valid request and set to pending", async () => {
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

test("should convert email to lower case", async () => {
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

test("hashed password should not equal plain text password", async () => {
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
