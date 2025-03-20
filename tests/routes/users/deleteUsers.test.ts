import request from "supertest";

import app from "../../../src/app";
import { UserStatus } from "../../../src/routes/spec";
import { CreateBooks, CreateIngredients, CreateLists, PrepareAuthenticatedUser, UserEndpoint } from "../../helpers";

test("route should require authentication", async () => {
    const [_, { userId }] = await PrepareAuthenticatedUser(UserStatus.Member);

    const res = await request(app).delete(UserEndpoint.deleteUsers(userId));

    expect(res.statusCode).toEqual(401);
});

test("should not allow deletion of other user", async () => {
    const [_, { userId }] = await PrepareAuthenticatedUser(UserStatus.Member);
    const [otherToken] = await PrepareAuthenticatedUser(UserStatus.Member);

    const response = await request(app).delete(UserEndpoint.deleteUsers(userId)).set(otherToken);

    expect(response.statusCode).toEqual(401);
});

test("should delete user", async () => {
    const [token, { userId }] = await PrepareAuthenticatedUser(UserStatus.Member);

    const response = await request(app).delete(UserEndpoint.deleteUsers(userId)).set(token);

    expect(response.statusCode).toEqual(200);
});

test("should delete user and accommodate foreign keys", async () => {
    const [token, { userId }] = await PrepareAuthenticatedUser(UserStatus.Member);

    await CreateBooks({ createdBy: userId });
    await CreateLists({ createdBy: userId });
    await CreateIngredients({ createdBy: userId });

    const response = await request(app).delete(UserEndpoint.deleteUsers(userId)).set(token);

    expect(response.statusCode).toEqual(200);
});
