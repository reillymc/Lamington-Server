import request from "supertest";

import app from "../../../src/app";
import { LoginResponse, UserStatus } from "../../../src/routes/spec";
import { AuthEndpoint, CreateUsers } from "../../helpers";

test("should fail login with invalid email", async () => {
    const [user] = await CreateUsers();

    if (!user) throw new Error("User not created");

    const requestBody = {
        email: "invalid",
        password: user.password,
    };

    const res = await request(app).post(AuthEndpoint.login).send(requestBody);

    expect(res.statusCode).toEqual(401);
});

test("should fail login with invalid password", async () => {
    const [user] = await CreateUsers();

    if (!user) throw new Error("User not created");

    const requestBody = {
        email: user.email,
        password: "invalid",
    };

    const res = await request(app).post(AuthEndpoint.login).send(requestBody);

    expect(res.statusCode).toEqual(401);
});

test("should login with valid credentials", async () => {
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

test("should return pending error message when logging in with pending account", async () => {
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
