import request from "supertest";

import app from "../../../src/app";
import { GetPendingUsersResponse, UserStatus } from "../../../src/routes/spec";
import { CreateUsers, PrepareAuthenticatedUser, UserEndpoint } from "../../helpers";

test("route should require authentication", async () => {
    const res = await request(app).get(UserEndpoint.getPendingUsers);

    expect(res.statusCode).toEqual(401);
});

test("route should require administrator privileges", async () => {
    const [adminToken] = await PrepareAuthenticatedUser(UserStatus.Administrator);
    const [registeredToken] = await PrepareAuthenticatedUser(UserStatus.Member);

    const registeredRes = await request(app).get(UserEndpoint.getPendingUsers).set(registeredToken);

    expect(registeredRes.statusCode).toEqual(401);

    const adminRes = await request(app).get(UserEndpoint.getPendingUsers).set(adminToken);

    expect(adminRes.statusCode).toEqual(200);
});

test("should return correct number of pending users", async () => {
    const [adminToken] = await PrepareAuthenticatedUser(UserStatus.Administrator);

    const users = await CreateUsers({ count: Math.floor(Math.random() * 10) + 1, status: UserStatus.Pending });

    const res = await request(app).get(UserEndpoint.getPendingUsers).set(adminToken);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetPendingUsersResponse;

    expect(Object.keys(data ?? {}).length).toEqual(users.length);
});
