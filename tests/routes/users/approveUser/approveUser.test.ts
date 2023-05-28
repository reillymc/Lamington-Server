import request from "supertest";

import app from "../../../../src/app";
import { CleanTables, CreateUsers, PrepareAuthenticatedUser } from "../../../helpers";
import { PostUserApprovalRequestBody, UserStatus } from "../../../../src/routes/spec";
import { UserEndpoint } from "../../../helpers/api";
import { UserActions } from "../../../../src/controllers";

beforeEach(async () => {
    await CleanTables("user");
});

afterAll(async () => {
    await CleanTables("user");
});

test("route should require admin authentication", async () => {
    const [adminToken] = await PrepareAuthenticatedUser(UserStatus.Administrator);
    const [registeredToken] = await PrepareAuthenticatedUser(UserStatus.Registered);

    const endpoint = UserEndpoint.approveUser("non-existent-user-id");

    const unAuthedResponse = await request(app).post(endpoint);
    expect(unAuthedResponse.statusCode).toEqual(401);

    const registeredResponse = await request(app).post(endpoint).set(registeredToken);
    expect(registeredResponse.statusCode).toEqual(401);

    const adminResponse = await request(app).post(endpoint).set(adminToken);
    expect(adminResponse.statusCode).toEqual(400);
});

test("should register pending user", async () => {
    const [adminToken] = await PrepareAuthenticatedUser(UserStatus.Administrator);

    const [user] = await CreateUsers({ status: UserStatus.Pending });
    if (!user) throw new Error("User not created");

    const response = await request(app)
        .post(UserEndpoint.approveUser(user.userId))
        .set(adminToken)
        .send({ accept: true } as PostUserApprovalRequestBody);

    expect(response.statusCode).toEqual(200);

    const [updatedUser] = await UserActions.read({ userId: user.userId });

    expect(updatedUser?.status).toEqual(UserStatus.Registered);
});

test("should blacklist pending user", async () => {
    const [adminToken] = await PrepareAuthenticatedUser(UserStatus.Administrator);

    const [user] = await CreateUsers({ status: UserStatus.Pending });
    if (!user) throw new Error("User not created");

    const response = await request(app)
        .post(UserEndpoint.approveUser(user.userId))
        .set(adminToken)
        .send({ accept: false } as PostUserApprovalRequestBody);

    expect(response.statusCode).toEqual(200);

    const [updatedUser] = await UserActions.read({ userId: user.userId });

    expect(updatedUser?.status).toEqual(UserStatus.Blacklisted);
});

test("should blacklist registered user", async () => {
    const [adminToken] = await PrepareAuthenticatedUser(UserStatus.Administrator);

    const [user] = await CreateUsers({ status: UserStatus.Registered });
    if (!user) throw new Error("User not created");

    const response = await request(app)
        .post(UserEndpoint.approveUser(user.userId))
        .set(adminToken)
        .send({ accept: false } as PostUserApprovalRequestBody);

    expect(response.statusCode).toEqual(200);

    const [updatedUser] = await UserActions.read({ userId: user.userId });

    expect(updatedUser?.status).toEqual(UserStatus.Blacklisted);
});

test("should blacklist admin user", async () => {
    const [adminToken] = await PrepareAuthenticatedUser(UserStatus.Administrator);

    const [user] = await CreateUsers({ status: UserStatus.Administrator });
    if (!user) throw new Error("User not created");

    const response = await request(app)
        .post(UserEndpoint.approveUser(user.userId))
        .set(adminToken)
        .send({ accept: false } as PostUserApprovalRequestBody);

    expect(response.statusCode).toEqual(200);

    const [updatedUser] = await UserActions.read({ userId: user.userId });

    expect(updatedUser?.status).toEqual(UserStatus.Blacklisted);
});
