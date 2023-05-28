import request from "supertest";

import app from "../../../src/app";
import { CleanTables, CreateUsers, PrepareAuthenticatedUser, UserEndpoint, randomCount } from "../../helpers";
import { GetUsersResponse, UserStatus } from "../../../src/routes/spec";

beforeEach(async () => {
    await CleanTables("user");
});

afterAll(async () => {
    await CleanTables("user");
});

test("route should require authentication", async () => {
    const res = await request(app).get(UserEndpoint.getUsers);

    expect(res.statusCode).toEqual(401);
});

test("route should return emails only for request with administrator privileges", async () => {
    const [adminToken] = await PrepareAuthenticatedUser(UserStatus.Administrator);
    const [registeredToken] = await PrepareAuthenticatedUser(UserStatus.Registered);

    await CreateUsers({ count: 1, status: UserStatus.Registered });

    const registeredRes = await request(app).get(UserEndpoint.getUsers).set(registeredToken);

    expect(registeredRes.statusCode).toEqual(200);

    const { data } = registeredRes.body as GetUsersResponse;

    expect(Object.values(data ?? {})[0]?.email).toBeUndefined();

    const adminRes = await request(app).get(UserEndpoint.getUsers).set(adminToken);

    expect(adminRes.statusCode).toEqual(200);

    const { data: adminData } = adminRes.body as GetUsersResponse;

    expect(Object.values(adminData ?? {})[0]?.email).toBeDefined();
});

test("should return correct number of active users and no pending/blacklisted users", async () => {
    const [registeredToken] = await PrepareAuthenticatedUser(UserStatus.Registered);

    const usersRegistered = await CreateUsers({ count: randomCount, status: UserStatus.Registered });
    const usersAdmin = await CreateUsers({ count: randomCount, status: UserStatus.Administrator });
    await CreateUsers({ count: randomCount, status: UserStatus.Pending });
    await CreateUsers({ count: randomCount, status: UserStatus.Blacklisted });

    const res = await request(app).get(UserEndpoint.getUsers).set(registeredToken);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetUsersResponse;

    expect(Object.keys(data ?? {}).length).toEqual(usersRegistered.length + usersAdmin.length);

    const statuses = Object.values(data ?? {}).map(({ status }) => status);

    expect(statuses).not.toContain(UserStatus.Pending);
    expect(statuses).not.toContain(UserStatus.Blacklisted);
});

test("should not return current authenticated user", async () => {
    const [registeredToken] = await PrepareAuthenticatedUser(UserStatus.Registered);

    const res = await request(app).get(UserEndpoint.getUsers).set(registeredToken);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetUsersResponse;

    expect(Object.keys(data ?? {}).length).toEqual(0);
});
